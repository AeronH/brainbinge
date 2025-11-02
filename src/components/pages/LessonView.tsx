"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import LessonModeSidebar, { type LessonMode } from "@/components/lesson/LessonModeSidebar";
import LearnMode from "@/components/lesson/LearnMode";
import QuizMode from "@/components/lesson/QuizMode";
import FlashcardMode from "@/components/lesson/FlashcardMode";
import PodcastMode from "@/components/lesson/PodcastMode";
import type { Tables } from "@/lib/supabase/types";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

import type { BlockBasedOutline, LessonBlock } from '@/lib/lesson-blocks';

interface LessonOutline {
  title: string;
  summary: string;
  // New block-based structure
  blocks?: LessonBlock[];
  // Old nested structure (for compatibility)
  sections?: {
    title: string;
    subsections?: {
      title: string;
      content: string;
      keyPoints: string[];
      examples?: string[];
      thinkAbout?: string;
      formula?: string;
    }[];
  }[];
  practiceExercises?: {
    question: string;
    hint?: string;
  }[];
  reviewQuestions?: string[];
  keyTakeaways?: string[];
}

interface Lesson {
  id: string;
  title: string;
  subject: string;
  outline: LessonOutline;
  voice_style: string;
  humor_level: string;
}

interface Session {
  id: string;
  lesson_id: string;
  learning_mode: string | null;
  started_at: string | null;
}

const LessonView = () => {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [isMuted, setIsMuted] = useState(false);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [activeMode, setActiveMode] = useState<LessonMode>("learn");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchLessonData();
    }
  }, [id]);

  const fetchLessonData = async () => {
    try {
      const supabase = createClient();

      // Fetch lesson
      const { data: lessonData, error: lessonError } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", id)
        .single();

      if (lessonError) throw lessonError;
      
      // Fetch lesson blocks from normalized table
      const { data: blocksData, error: blocksError } = await supabase
        .from("lesson_blocks")
        .select("*")
        .eq("lesson_id", id)
        .order("order_index", { ascending: true });

      if (blocksError) {
        console.error("Error fetching blocks:", blocksError);
        // Fall back to old outline structure if blocks don't exist yet
      }

      // Fetch practice items
      const { data: practiceData, error: practiceError } = await supabase
        .from("lesson_practice")
        .select("*")
        .eq("lesson_id", id)
        .order("order_index", { ascending: true });

      if (practiceError) {
        console.error("Error fetching practice:", practiceError);
      }

      // Build lesson object with blocks
      const lessonWithBlocks = {
        ...lessonData,
        outline: {
          title: lessonData.title,
          summary: lessonData.summary || '',
          blocks: blocksData?.map(block => ({
            type: block.type,
            content: block.content,
            order: block.order_index,
            calloutType: block.callout_type
          })) || lessonData.outline?.blocks || [],
          practiceExercises: practiceData?.filter(p => p.type === 'exercise').map(p => ({
            question: p.content,
            hint: p.hint || undefined
          })) || lessonData.outline?.practiceExercises || [],
          reviewQuestions: practiceData?.filter(p => p.type === 'review_question').map(p => p.content) || lessonData.outline?.reviewQuestions || [],
          keyTakeaways: practiceData?.filter(p => p.type === 'key_takeaway').map(p => p.content) || lessonData.outline?.keyTakeaways || [],
          // Keep old sections for compatibility
          sections: lessonData.outline?.sections || []
        }
      };

      setLesson(lessonWithBlocks);

      // Check if session exists for this lesson
      const { data: sessionData, error: sessionError } = await supabase
        .from("sessions")
        .select("*")
        .eq("lesson_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionError && sessionError.code !== "PGRST116") throw sessionError;

      if (sessionData) {
        setSession(sessionData);
      }
    } catch (error) {
      console.error("Error fetching lesson:", error);
      toast.error("Failed to load lesson");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSessionUpdate = (newSession: Session) => {
    setSession(newSession);
  };

  const handleModeChange = (mode: LessonMode) => {
    setActiveMode(mode);
  };

  if (isLoading) {
    return <LoadingOverlay message="Loading lesson..." />;
  }

  if (!lesson) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-muted-foreground">Lesson not found</p>
          <Button onClick={() => router.push("/dashboard")} className="mt-4">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Main lesson view with mode sidebar
  return (
    <div className="h-screen bg-background flex relative">
      <LessonModeSidebar currentMode={activeMode} onModeChange={handleModeChange} />
      
      <div className="flex-1 flex flex-col ml-[220px]">
        {/* Header */}
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.push("/dashboard")}
              className="hover:bg-muted"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Exit Lesson
            </Button>

            <div className="flex-1 text-center px-8">
              <h1 className="text-xl font-bold text-foreground truncate">
                {lesson.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {lesson.subject}
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
              className="hover:bg-muted"
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mode Content */}
        <div className="flex-1 flex overflow-hidden w-full">
          {activeMode === "learn" && (
            <LearnMode 
              lesson={lesson} 
              session={session} 
              onSessionUpdate={handleSessionUpdate}
              isMuted={isMuted}
            />
          )}
          {activeMode === "quiz" && <QuizMode lesson={lesson} />}
          {activeMode === "flashcard" && <FlashcardMode lesson={lesson} />}
          {activeMode === "podcast" && <PodcastMode lesson={lesson} />}
        </div>
      </div>
    </div>
  );
};

export default LessonView;
