"use client";

import { useState, useEffect, useRef } from "react";
import { Radio, Sparkles, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PodcastVoiceModal } from "@/components/modals/PodcastVoiceModal";
import { PodcastPlayer } from "@/components/lesson/PodcastPlayer";
import { createClient } from "@/lib/supabase/client";

interface Lesson {
  id: string;
  title: string;
  subject: string;
  outline: any;
}

interface PodcastModeProps {
  lesson: Lesson;
}

interface TranscriptTurn {
  speaker: number | string; // Can be 1/2 or "Speaker 1"/"Speaker 2"
  text: string;
  audioUrl: string;
}

interface Podcast {
  id: string;
  lesson_id: string;
  user_id: string;
  tone: string;
  voice_1: string;
  voice_2: string;
  transcript: TranscriptTurn[];
  status: 'generating' | 'ready' | 'error';
  full_audio_url: string | null;
  created_at: string;
}

export default function PodcastMode({ lesson }: PodcastModeProps) {
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>("");
  const channelRef = useRef<any>(null);

  // Cleanup realtime channel on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        const supabase = createClient();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  // Check if podcast exists on mount
  useEffect(() => {
    checkPodcastExists();
  }, [lesson.id]);

  const checkPodcastExists = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/lessons/podcast/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ lessonId: lesson.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to check podcast");
      }

      const data = await response.json();
      
      if (data.exists && data.podcast) {
        // Fetch full podcast data
        const podcastResponse = await fetch(`/api/lessons/podcast/${data.podcast.id}`);
        
        if (podcastResponse.ok) {
          const podcastData = await podcastResponse.json();
          const podcast = podcastData.podcast;
          
          // Check if podcast is still being generated
          if (podcast.status === 'generating') {
            setIsGenerating(true);
            startListeningForPodcast(podcast.id);
          } else if (podcast.status === 'ready') {
            setPodcast(podcast);
          } else if (podcast.status === 'error') {
            toast.error("Podcast generation failed");
          }
        }
      } else {
        // No podcast exists, show modal
        setShowModal(true);
      }
    } catch (error) {
      console.error("Error checking podcast:", error);
      toast.error("Failed to load podcast");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async (tone: string, voice1: string, voice2: string) => {
    try {
      console.log('[PodcastMode] handleGenerate called with:', { tone, voice1, voice2 });
      
      setIsGenerating(true);
      setGenerationProgress("Starting podcast generation...");

      const requestBody = {
        lessonId: lesson.id,
        tone,
        voice1,
        voice2,
      };
      
      console.log('[PodcastMode] Sending to API:', requestBody);

      const response = await fetch("/api/lessons/podcast/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate podcast");
      }
      
      const data = await response.json();
      
      if (data.success && data.podcastId) {
        // Podcast is being generated in background, listen for updates
        setShowModal(false);
        toast.success("Generating your podcast...");
        startListeningForPodcast(data.podcastId);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Error generating podcast:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate podcast"
      );
      setIsGenerating(false);
      setGenerationProgress("");
    }
  };

  const startListeningForPodcast = (podcastId: string) => {
    setGenerationProgress("Creating conversation script...");

    // Clean up existing channel if any
    if (channelRef.current) {
      const supabase = createClient();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const supabase = createClient();
    
    console.log(`[Realtime] Setting up subscription for podcast ${podcastId}`);
    
    // Subscribe to realtime updates for this podcast
    const channel = supabase
      .channel(`podcast-updates-${podcastId}`, {
        config: {
          broadcast: { self: true }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lesson_podcasts',
          filter: `id=eq.${podcastId}`
        },
        (payload) => {
          console.log('[Realtime] 🔥 Podcast updated:', payload);
          const updated = payload.new as Podcast;
          
          console.log('[Realtime] Status:', updated.status);
          
          if (updated.status === 'ready') {
            // Podcast is ready!
            console.log('[Realtime] ✅ Podcast ready, updating UI');
            setPodcast(updated);
            setIsGenerating(false);
            setGenerationProgress("");
            toast.success("Podcast generated successfully!");
            supabase.removeChannel(channel);
            channelRef.current = null;
          } else if (updated.status === 'error') {
            // Generation failed
            console.log('[Realtime] ❌ Podcast failed');
            setIsGenerating(false);
            setGenerationProgress("");
            const errorMsg = (updated.transcript as any)?.message || "Failed to generate podcast";
            toast.error(errorMsg);
            supabase.removeChannel(channel);
            channelRef.current = null;
          } else if (updated.status === 'generating') {
            // Still generating, update progress
            console.log('[Realtime] ⏳ Still generating...');
            setGenerationProgress("Generating audio... This may take a few minutes.");
          }
        }
      )
      .subscribe((status, err) => {
        console.log('[Realtime] Subscription status changed:', status, err);
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] ✅ Successfully subscribed to podcast ${podcastId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] ❌ Channel error:', err);
          toast.error("Failed to connect to realtime updates. Please refresh the page.");
        } else if (status === 'TIMED_OUT') {
          console.error('[Realtime] ⏱️ Subscription timed out');
        }
      });
    
    // Store channel ref for cleanup
    channelRef.current = channel;
  };

  const handleRegenerate = () => {
    setShowModal(true);
  };

  const handleDeleteAndRegenerate = async () => {
    if (!podcast) return;

    try {
      setIsGenerating(true);
      setGenerationProgress("Deleting old podcast...");
      
      console.log('[PodcastMode] Deleting podcast:', podcast.id);
      
      // Delete existing podcast
      const response = await fetch(`/api/lessons/podcast/${podcast.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete podcast");
      }

      console.log('[PodcastMode] Podcast deleted, showing voice selection');
      setPodcast(null);
      setIsGenerating(false);
      setGenerationProgress("");
      setShowModal(true);
      toast.success("Ready to create a new podcast");
    } catch (error) {
      console.error("Error deleting podcast:", error);
      toast.error("Failed to delete podcast");
      setIsGenerating(false);
      setGenerationProgress("");
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#10B981] mx-auto mb-4" />
          <p className="text-muted-foreground">Loading podcast...</p>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <Card className="max-w-2xl w-full bg-card/50 backdrop-blur border-border p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#10B981] to-[#34D399] flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Radio className="w-10 h-10 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-[#10B981] to-[#34D399] bg-clip-text text-transparent">
            Generating Your Podcast
          </h2>
          
          <div className="flex items-center justify-center gap-2 mb-6">
            <Sparkles className="w-4 h-4 text-[#10B981] animate-pulse" />
            <span className="text-sm font-medium text-muted-foreground">
              {generationProgress || "Processing..."}
            </span>
            <Sparkles className="w-4 h-4 text-[#34D399] animate-pulse" />
          </div>
          
          <p className="text-lg text-muted-foreground mb-4">
            Creating a natural, engaging conversation about {lesson.title}
          </p>
          
          <p className="text-sm text-muted-foreground/80">
            This may take a few minutes. We're generating realistic dialogue and synthesizing high-quality audio for each turn.
          </p>

          <div className="mt-8">
            <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#10B981] to-[#34D399] animate-pulse" style={{ width: "60%" }} />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!podcast) {
    return (
      <>
        <div className="flex-1 flex items-center justify-center p-8 bg-background">
          <Card className="max-w-2xl w-full bg-card/50 backdrop-blur border-border p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#10B981] to-[#34D399] flex items-center justify-center mx-auto mb-6">
              <Radio className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-[#10B981] to-[#34D399] bg-clip-text text-transparent">
              Podcast Mode
            </h2>
            
            <p className="text-lg text-muted-foreground mb-4">
              Transform this lesson into an engaging two-person podcast conversation
            </p>
            
            <p className="text-sm text-muted-foreground/80 mb-8">
              Choose your preferred tone and select two AI voices to create a natural, 
              back-and-forth discussion about <span className="text-foreground font-medium">{lesson.title}</span>
            </p>

            <Button
              onClick={() => setShowModal(true)}
              size="lg"
              className="bg-gradient-to-r from-[#10B981] to-[#34D399] hover:from-[#0EA574] hover:to-[#2EC990] text-white"
            >
              <Radio className="w-5 h-5 mr-2" />
              Create Podcast
            </Button>
          </Card>
        </div>

        <PodcastVoiceModal
          open={showModal}
          onClose={() => setShowModal(false)}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />
      </>
    );
  }

  // Safety check: only render player if podcast is ready
  if (podcast.status !== 'ready' || !Array.isArray(podcast.transcript)) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#10B981] mx-auto mb-4" />
          <p className="text-muted-foreground">Invalid podcast state...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PodcastPlayer
        transcript={podcast.transcript}
        onRegenerate={handleDeleteAndRegenerate}
      />

      <PodcastVoiceModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
      />
    </>
  );
}
