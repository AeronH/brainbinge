"use client";

import { useState, useEffect, useRef } from "react";
import { CreditCard, Sparkles, ChevronLeft, ChevronRight, RotateCcw, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { SubscriptionModal } from "@/components/modals/SubscriptionModal";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  order_index: number;
}

interface Lesson {
  id: string;
  title: string;
  subject: string;
  outline: any;
}

interface FlashcardModeProps {
  lesson: Lesson;
}

type FlashcardState = "idle" | "loading" | "generating" | "reviewing";

export default function FlashcardMode({ lesson }: FlashcardModeProps) {
  const { isSubscribed, loading } = useSubscription();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [state, setState] = useState<FlashcardState>("loading");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentCard = flashcards[currentIndex];
  const progress = flashcards.length > 0 ? ((currentIndex + 1) / flashcards.length) * 100 : 0;

  // Check subscription status on mount
  useEffect(() => {
    if (!loading && !isSubscribed) {
      setShowSubscriptionModal(true);
    }
  }, [loading, isSubscribed]);

  // Check if flashcards exist or need generation
  useEffect(() => {
    if (isSubscribed) {
      checkFlashcardStatus();
    }
  }, [lesson.id, isSubscribed]);

  const checkFlashcardStatus = async () => {
    try {
      setState("loading");
      const supabase = createClient();
      
      // Check lesson flashcard_status
      const { data: lessonData, error: lessonError } = await supabase
        .from("lessons")
        .select("flashcard_status")
        .eq("id", lesson.id)
        .single();

      if (lessonError) throw lessonError;

      const status = (lessonData as any)?.flashcard_status || 'pending';

      // If generating, poll for updates
      if (status === 'generating') {
        setState("generating");
        // Clear any existing polling interval
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
        
        // Poll every 2 seconds until status changes
        pollIntervalRef.current = setInterval(async () => {
          const supabase = createClient();
          const { data: pollData } = await supabase
            .from("lessons")
            .select("flashcard_status")
            .eq("id", lesson.id)
            .single();
          
          const pollStatus = (pollData as any)?.flashcard_status;
          if (pollStatus === 'ready') {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            // Load flashcards immediately
            const { data: flashcardsData, error: flashcardsError } = await supabase
              .from("flashcards")
              .select("*")
              .eq("lesson_id", lesson.id)
              .order("order_index", { ascending: true });
            
            if (!flashcardsError && flashcardsData && flashcardsData.length > 0) {
              setFlashcards(flashcardsData);
              setState("reviewing");
              setCurrentIndex(0);
              setIsFlipped(false);
              toast.success(`Generated ${flashcardsData.length} flashcards!`);
            } else {
              setState("idle");
            }
          } else if (pollStatus === 'error') {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            setState("idle");
            toast.error("Flashcard generation failed");
          }
        }, 2000);
        
        // Stop polling after 5 minutes
        setTimeout(() => {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }, 300000);
        return;
      }

      // Check for existing flashcards
      const { data, error } = await supabase
        .from("flashcards")
        .select("*")
        .eq("lesson_id", lesson.id)
        .order("order_index", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setFlashcards(data);
        // Auto-start review if flashcards already exist
        setState("reviewing");
        setCurrentIndex(0);
        setIsFlipped(false);
      } else {
        setState("idle");
      }
    } catch (error) {
      console.error("Error checking flashcard status:", error);
      toast.error("Failed to load flashcards");
      setState("idle");
    }
  };

  const handleGenerateFlashcards = async () => {
    setState("generating");
    try {
      const response = await fetch("/api/lessons/flashcards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate flashcards");
      }

      const data = await response.json();
      
      // Generation started - poll for completion
      if (data.generating) {
        toast.success("Flashcard generation started!");
        // Start polling immediately
        setState("generating");
        
        // Clear any existing polling interval
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
        
        pollIntervalRef.current = setInterval(async () => {
          const supabase = createClient();
          const { data: pollData } = await supabase
            .from("lessons")
            .select("flashcard_status")
            .eq("id", lesson.id)
            .single();
          
          const pollStatus = (pollData as any)?.flashcard_status;
          if (pollStatus === 'ready') {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            // Load flashcards immediately
            const { data: flashcardsData, error: flashcardsError } = await supabase
              .from("flashcards")
              .select("*")
              .eq("lesson_id", lesson.id)
              .order("order_index", { ascending: true });
            
            if (!flashcardsError && flashcardsData && flashcardsData.length > 0) {
              setFlashcards(flashcardsData);
              setState("reviewing");
              setCurrentIndex(0);
              setIsFlipped(false);
              toast.success(`Generated ${flashcardsData.length} flashcards!`);
            } else {
              setState("idle");
            }
          } else if (pollStatus === 'error') {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            setState("idle");
            toast.error("Flashcard generation failed");
          }
        }, 2000);
        
        // Stop polling after 5 minutes
        setTimeout(() => {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }, 300000);
      } else if (data.flashcards) {
        // Flashcards already exist
        setFlashcards(data.flashcards);
        setState("reviewing");
        setCurrentIndex(0);
        setIsFlipped(false);
        toast.info("Flashcards loaded successfully.");
      }
    } catch (error) {
      console.error("Error generating flashcards:", error);
      toast.error("Failed to generate flashcards. Please try again.");
      setState("idle");
    }
  };

  const handleFlipCard = () => {
    setIsFlipped(!isFlipped);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  // Keyboard navigation
  useEffect(() => {
    if (state !== "reviewing") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle if user is typing in an input field
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setIsFlipped(false);
          }
          break;
        case "ArrowRight":
          event.preventDefault();
          if (currentIndex < flashcards.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setIsFlipped(false);
          }
          break;
        case " ":
        case "Enter":
          event.preventDefault();
          setIsFlipped(!isFlipped);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [state, currentIndex, flashcards.length, isFlipped]);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  // Render different states
  let content;
  
  if (state === "loading") {
    content = (
      <div className="flex-1 flex items-center justify-center p-6 bg-background overflow-auto">
        <Card className="max-w-xl w-full bg-card/50 backdrop-blur border-border p-8 text-center">
          <Loader2 className="w-12 h-12 text-[#9333EA] animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">Loading Flashcards</h2>
          <p className="text-base text-muted-foreground">
            Checking for existing flashcards...
          </p>
        </Card>
      </div>
    );
  } else if (state === "generating") {
    content = (
      <div className="flex-1 flex items-center justify-center p-6 bg-background overflow-auto">
        <Card className="max-w-xl w-full bg-card/50 backdrop-blur border-border p-8 text-center">
          <Loader2 className="w-12 h-12 text-[#9333EA] animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">Generating Flashcards</h2>
          <p className="text-base text-muted-foreground">
            Creating flashcards based on your lesson content...
          </p>
        </Card>
      </div>
    );
  } else if (state === "idle" && flashcards.length === 0) {
    content = (
      <div className="flex-1 flex items-center justify-center p-6 bg-background overflow-auto">
        <Card className="max-w-xl w-full bg-card/50 backdrop-blur border-border p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#9333EA]/20 flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-[#9333EA]" />
          </div>
          
          <h2 className="text-2xl font-bold mb-3">
            Flashcard Mode
          </h2>
          
          <p className="text-base text-muted-foreground mb-6">
            Study key concepts with AI-generated flashcards from{" "}
            <span className="text-foreground font-medium">{lesson.title}</span>
          </p>

          <Button
            onClick={handleGenerateFlashcards}
            disabled={state === "generating"}
            size="lg"
            className="bg-gradient-to-r from-[#9333EA] to-[#A855F7] hover:opacity-90 text-white px-6 py-5 text-base rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state === "generating" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Flashcards
              </>
            )}
          </Button>
        </Card>
      </div>
    );
  } else if (state === "reviewing" && currentCard) {
    content = (
      <ScrollArea className="flex-1 h-full">
        <div className="p-6 bg-background min-h-full">
          <div className="max-w-3xl mx-auto">
            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Card {currentIndex + 1} of {flashcards.length}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {Math.round(progress)}% Complete
                </span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>

            {/* Flashcard */}
            <div className="relative mb-6" style={{ perspective: "1000px" }}>
              <div
                onClick={handleFlipCard}
                className="relative w-full cursor-pointer transition-transform duration-500 transform-gpu"
                style={{
                  transformStyle: "preserve-3d",
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  minHeight: "400px",
                }}
              >
                {/* Front of card */}
                <Card
                  className="absolute inset-0 bg-gradient-to-br from-[#9333EA]/10 to-[#A855F7]/10 backdrop-blur border-[#9333EA]/30 p-8 flex items-center justify-center"
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    minHeight: "400px",
                  }}
                >
                  <div className="text-center">
                    <div className="inline-block px-3 py-1 rounded-full bg-[#9333EA]/20 text-[#9333EA] text-xs font-medium mb-4">
                      Front
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {currentCard.front}
                    </p>
                    <p className="text-xs text-muted-foreground mt-6">
                      Click to flip
                    </p>
                  </div>
                </Card>

                {/* Back of card */}
                <Card
                  className="absolute inset-0 bg-gradient-to-br from-[#A855F7]/10 to-[#9333EA]/10 backdrop-blur border-[#A855F7]/30 p-8 flex items-center justify-center"
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    minHeight: "400px",
                  }}
                >
                  <div className="text-center">
                    <div className="inline-block px-3 py-1 rounded-full bg-[#A855F7]/20 text-[#A855F7] text-xs font-medium mb-4">
                      Back
                    </div>
                    <p className="text-xl text-foreground leading-relaxed">
                      {currentCard.back}
                    </p>
                    <p className="text-xs text-muted-foreground mt-6">
                      Click to flip
                    </p>
                  </div>
                </Card>
              </div>
            </div>

            {/* Navigation controls */}
            <div className="flex items-center gap-3 mb-4">
              <Button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                size="lg"
                variant="outline"
                className="flex-1 h-12 text-base rounded-xl disabled:opacity-50"
              >
                <ChevronLeft className="mr-2 h-5 w-5" />
                Previous
              </Button>
              
              <Button
                onClick={handleNext}
                disabled={currentIndex === flashcards.length - 1}
                size="lg"
                variant="outline"
                className="flex-1 h-12 text-base rounded-xl disabled:opacity-50"
              >
                Next
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            {/* Restart button */}
            {currentIndex === flashcards.length - 1 && (
              <Button
                onClick={handleRestart}
                size="lg"
                className="w-full bg-gradient-to-r from-[#9333EA] to-[#A855F7] hover:opacity-90 text-white py-5 text-base rounded-xl"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Start Over
              </Button>
            )}

            {/* Keyboard shortcuts hint */}
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Keyboard shortcuts:</span> ← Previous | → Next | Space/Enter Flip
              </p>
            </div>
          </div>
        </div>
      </ScrollArea>
    );
  } else {
    content = null;
  }

  return (
    <>
      {content}
      <SubscriptionModal 
        open={showSubscriptionModal}
        onOpenChange={setShowSubscriptionModal}
        feature="flashcard generation"
      />
    </>
  );
}



