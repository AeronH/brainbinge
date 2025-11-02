"use client";

import { useState, useEffect } from "react";
import { Radio, Play, Check, Sparkles, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface PodcastVoiceModalProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (tone: string, voice1: string, voice2: string) => void;
  isGenerating?: boolean;
}

const tones = [
  {
    id: "normal",
    name: "Normal",
    description: "Standard conversational podcast style",
    icon: "💬",
  },
  {
    id: "casual",
    name: "Casual",
    description: "Relaxed and easygoing conversation",
    icon: "😊",
  },
  {
    id: "posh",
    name: "Posh",
    description: "Sophisticated and refined discussion",
    icon: "🎩",
  },
  {
    id: "brainrot",
    name: "Brainrot",
    description: "Gen Z internet culture style",
    icon: "🧠",
  },
];

export function PodcastVoiceModal({
  open,
  onClose,
  onGenerate,
  isGenerating = false,
}: PodcastVoiceModalProps) {
  const [selectedTone, setSelectedTone] = useState("normal");
  const [voice1, setVoice1] = useState<string | null>(null);
  const [voice2, setVoice2] = useState<string | null>(null);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [voiceList, setVoiceList] = useState<any[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);

  // Fetch voice previews from database on mount
  useEffect(() => {
    const fetchPreviews = async () => {
      try {
        setIsLoadingVoices(true);
        const response = await fetch("/api/cartesia/previews");
        if (response.ok) {
          const data = await response.json();
          // Convert to voice list format
          const voices = data.previews?.map((preview: any) => ({
            id: preview.voice_id,
            name: preview.voice_name,
            audioUrl: preview.audio_url,
            // Infer gender from name or default to male
            gender: preview.voice_name?.toLowerCase().includes("emily") || 
                    preview.voice_name?.toLowerCase().includes("jessica") || 
                    preview.voice_name?.toLowerCase().includes("sara") ||
                    preview.voice_name?.toLowerCase().includes("simone")
                    ? "female" : "male",
          })) || [];
          setVoiceList(voices);
        }
      } catch (error) {
        console.error("Error fetching voice previews:", error);
      } finally {
        setIsLoadingVoices(false);
      }
    };

    if (open) {
      fetchPreviews();
    }
  }, [open]);

  const handleVoiceSelect = (voiceId: string) => {
    if (!voice1) {
      setVoice1(voiceId);
    } else if (!voice2 && voiceId !== voice1) {
      setVoice2(voiceId);
    } else if (voiceId === voice1) {
      // Deselect voice1
      setVoice1(voice2);
      setVoice2(null);
    } else if (voiceId === voice2) {
      // Deselect voice2
      setVoice2(null);
    } else if (voice1 && voice2) {
      // Replace voice2 with new selection
      setVoice2(voiceId);
    }
  };

  const handlePreview = async (audioUrl: string, voiceId: string) => {
    setPreviewingVoice(voiceId);
    
    try {
      // Play the pre-generated audio
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setPreviewingVoice(null);
      };

      audio.onerror = () => {
        setPreviewingVoice(null);
        console.error("Error playing audio");
      };

      await audio.play();
    } catch (error) {
      console.error("Error playing preview:", error);
      setPreviewingVoice(null);
    }
  };

  const handleGenerate = () => {
    if (voice1 && voice2 && selectedTone) {
      console.log('[PodcastVoiceModal] Calling onGenerate with:', { selectedTone, voice1, voice2 });
      console.log('[PodcastVoiceModal] voice1 === voice2?', voice1 === voice2);
      onGenerate(selectedTone, voice1, voice2);
    } else {
      console.error('[PodcastVoiceModal] Missing required values:', { selectedTone, voice1, voice2 });
    }
  };

  const canGenerate = voice1 && voice2 && selectedTone && !isGenerating;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#1A1D24] border-border">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10B981] to-[#34D399] flex items-center justify-center">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground">
                Create Podcast
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Select two voices and a tone for your podcast conversation
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Tone Selection */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-3 block">
              Conversation Tone
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {tones.map((tone) => (
                <button
                  key={tone.id}
                  onClick={() => setSelectedTone(tone.id)}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all text-left hover:border-[#10B981]/50",
                    selectedTone === tone.id
                      ? "border-[#10B981] bg-[#10B981]/10"
                      : "border-border bg-card/50"
                  )}
                >
                  <div className="text-2xl mb-2">{tone.icon}</div>
                  <div className="text-sm font-semibold text-foreground">
                    {tone.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {tone.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Voice Selection */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-3 block">
              Select Two Voices
              {(voice1 || voice2) && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({voice1 && voice2 ? "2" : "1"}/2 selected)
                </span>
              )}
            </label>
            {isLoadingVoices ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-[#10B981] mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading voices...</p>
              </div>
            ) : voiceList.length === 0 ? (
              <div className="text-center py-8 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">No voices found</p>
                <p className="text-xs text-muted-foreground">
                  Please run voice preview generation first from the admin page
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {voiceList.map((voice) => {
                const isVoice1 = voice1 === voice.id;
                const isVoice2 = voice2 === voice.id;
                const isSelected = isVoice1 || isVoice2;
                const isPreviewing = previewingVoice === voice.id;

                return (
                  <div
                    key={voice.id}
                    className={cn(
                      "relative p-4 rounded-xl border-2 transition-all cursor-pointer",
                      isSelected
                        ? "border-[#10B981] bg-[#10B981]/10"
                        : "border-border bg-card/50 hover:border-border/50"
                    )}
                    onClick={() => handleVoiceSelect(voice.id)}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#10B981] flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                        {isVoice1 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-[#10B981] text-[10px] font-bold flex items-center justify-center">
                            1
                          </span>
                        )}
                        {isVoice2 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-[#10B981] text-[10px] font-bold flex items-center justify-center">
                            2
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                          voice.gender === "male"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-pink-500/20 text-pink-400"
                        )}
                      >
                        <span className="text-lg">
                          {voice.gender === "male" ? "👨" : "👩"}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">
                          {voice.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {voice.description}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-3 hover:bg-white/5"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(voice.audioUrl, voice.id);
                      }}
                      disabled={isPreviewing}
                    >
                      {isPreviewing ? (
                        <>
                          <Sparkles className="w-3 h-3 mr-2 animate-pulse" />
                          Playing...
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 mr-2" />
                          Preview
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
              </div>
            )}
          </div>

          {/* Generate Button */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="text-sm text-muted-foreground">
              {!voice1 && !voice2 && "Select two different voices to continue"}
              {voice1 && !voice2 && "Select one more voice"}
              {voice1 && voice2 && "Ready to generate!"}
            </div>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="bg-gradient-to-r from-[#10B981] to-[#34D399] hover:from-[#0EA574] hover:to-[#2EC990] text-white"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Radio className="w-4 h-4 mr-2" />
                    Generate Podcast
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

