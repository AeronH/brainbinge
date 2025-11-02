"use client";

import { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { PodcastRegenerateModal } from "./PodcastRegenerateModal";
import { createClient } from "@/lib/supabase/client";

interface TranscriptTurn {
  speaker: number | string; // Can be 1/2 or "Speaker 1"/"Speaker 2"
  text: string;
  audioUrl: string;
}

interface PodcastPlayerProps {
  transcript: TranscriptTurn[];
  onRegenerate?: () => void;
}

export function PodcastPlayer({
  transcript,
  onRegenerate,
}: PodcastPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [remainingGenerations, setRemainingGenerations] = useState(10);
  const [monthlyLimit] = useState(10);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Fetch user's remaining podcast generations
  useEffect(() => {
    const fetchUserData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data: userData } = await supabase
        .from("users")
        .select("podcast_generations_count, podcast_generations_reset_at")
        .eq("id", user.id)
        .single() as {
          data: { podcast_generations_count: number; podcast_generations_reset_at: string } | null;
          error: any;
        };

      if (userData) {
        // Check if we need to reset the counter (new month)
        const now = new Date();
        const resetDate = new Date(userData.podcast_generations_reset_at);
        
        if (now >= resetDate) {
          // Counter will be reset on next generation
          setRemainingGenerations(monthlyLimit);
        } else {
          setRemainingGenerations(monthlyLimit - userData.podcast_generations_count);
        }
      }
    };

    fetchUserData();
  }, [monthlyLimit]);

  // Load and play current turn
  useEffect(() => {
    if (currentTurnIndex < transcript.length && transcript[currentTurnIndex]) {
      const turn = transcript[currentTurnIndex];
      
      // Create new audio element
      const audio = new Audio(turn.audioUrl);
      audio.volume = isMuted ? 0 : volume;
      audio.playbackRate = playbackSpeed;
      
      audio.addEventListener("loadedmetadata", () => {
        setDuration(audio.duration);
      });

      audio.addEventListener("timeupdate", () => {
        setCurrentTime(audio.currentTime);
        const progress = (audio.currentTime / audio.duration) * 100;
        setProgress(progress);
      });

      audio.addEventListener("ended", () => {
        // Move to next turn
        if (currentTurnIndex < transcript.length - 1) {
          setCurrentTurnIndex(currentTurnIndex + 1);
        } else {
          // End of podcast
          setIsPlaying(false);
          setCurrentTurnIndex(0);
          setProgress(0);
        }
      });

      audioRef.current = audio;

      if (isPlaying) {
        audio.play().catch((error) => {
          console.error("Error playing audio:", error);
          setIsPlaying(false);
        });
      }

      // Scroll to current turn
      const currentRef = transcriptRefs.current.get(currentTurnIndex);
      if (currentRef) {
        currentRef.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }

      return () => {
        audio.pause();
        audio.src = "";
      };
    }
  }, [currentTurnIndex, isPlaying, transcript]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Update playback speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch((error) => {
          console.error("Error playing audio:", error);
        });
      }
      setIsPlaying(!isPlaying);
    } else {
      setIsPlaying(true);
    }
  };

  const handleSeek = (value: number[]) => {
    const newProgress = value[0];
    setProgress(newProgress);
    
    if (audioRef.current) {
      const newTime = (newProgress / 100) * audioRef.current.duration;
      audioRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    if (value[0] > 0) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleRestart = () => {
    setCurrentTurnIndex(0);
    setProgress(0);
    setIsPlaying(true);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const downloadTranscript = () => {
    const text = transcript
      .map((turn) => `Speaker ${turn.speaker}: ${turn.text}`)
      .join("\n\n");
    
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "podcast-transcript.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const jumpToTurn = (index: number) => {
    setCurrentTurnIndex(index);
    setIsPlaying(true);
  };

  const handleRegenerateClick = () => {
    setShowRegenerateModal(true);
  };

  const handleRegenerateConfirm = () => {
    if (onRegenerate) {
      onRegenerate();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      <PodcastRegenerateModal
        open={showRegenerateModal}
        onOpenChange={setShowRegenerateModal}
        onConfirm={handleRegenerateConfirm}
        remainingGenerations={remainingGenerations}
        monthlyLimit={monthlyLimit}
      />
      {/* Transcript Area */}
      <ScrollArea className="flex-1 p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          {transcript.map((turn, index) => {
            const isActive = index === currentTurnIndex && isPlaying;
            const speaker1Color = "from-[#10B981] to-[#34D399]";
            const speaker2Color = "from-[#3B82F6] to-[#60A5FA]";
            
            // Normalize speaker to number (handle "Speaker 1" or 1)
            const speakerNum = typeof turn.speaker === 'string' 
              ? parseInt(turn.speaker.replace(/\D/g, '')) || 1
              : turn.speaker;
            const isSpeaker1 = speakerNum === 1;

            return (
              <div
                key={index}
                ref={(el) => {
                  if (el) transcriptRefs.current.set(index, el);
                }}
                className={cn(
                  "p-4 rounded-xl transition-all cursor-pointer",
                  isActive
                    ? "bg-white/10 border-2 border-[#10B981] scale-[1.02]"
                    : "bg-card/50 border border-border hover:bg-card/70"
                )}
                onClick={() => jumpToTurn(index)}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br",
                      isSpeaker1 ? speaker1Color : speaker2Color
                    )}
                  >
                    <span className="text-white font-bold text-sm">
                      {speakerNum}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div
                      className={cn(
                        "text-xs font-semibold uppercase tracking-wider mb-2 bg-gradient-to-r bg-clip-text text-transparent",
                        isSpeaker1 ? speaker1Color : speaker2Color
                      )}
                    >
                      Speaker {speakerNum}
                    </div>
                    <p
                      className={cn(
                        "text-base leading-relaxed",
                        isActive ? "text-foreground font-medium" : "text-muted-foreground"
                      )}
                    >
                      {turn.text}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Player Controls */}
      <div className="border-t border-border bg-card/50 backdrop-blur p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <Slider
              value={[progress]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>
                Turn {currentTurnIndex + 1} / {transcript.length}
              </span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRestart}
                className="hover:bg-white/10"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const speeds = [0.75, 1, 1.25, 1.5, 2];
                  const currentIndex = speeds.indexOf(playbackSpeed);
                  const nextIndex = (currentIndex + 1) % speeds.length;
                  setPlaybackSpeed(speeds[nextIndex]);
                }}
                className="hover:bg-white/10 text-xs"
              >
                {playbackSpeed}x
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <Button
                size="lg"
                onClick={togglePlayPause}
                className="w-14 h-14 rounded-full bg-gradient-to-r from-[#10B981] to-[#34D399] hover:from-[#0EA574] hover:to-[#2EC990] text-white shadow-lg"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6 ml-1" />
                )}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="hover:bg-white/10"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                onValueChange={handleVolumeChange}
                max={1}
                step={0.01}
                className="w-24"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={downloadTranscript}
                className="hover:bg-white/10"
              >
                <Download className="w-4 h-4" />
              </Button>
              {onRegenerate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerateClick}
                  className="ml-2"
                >
                  Regenerate
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

