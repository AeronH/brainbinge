"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Send, BookOpen, MessageCircle, Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/lib/supabase/types";
import { SubscriptionModal } from "@/components/modals/SubscriptionModal";
import type { LessonBlock } from '@/lib/lesson-blocks';
import BlockRenderer from './BlockRenderer';

type Message = Tables<"messages">;
type QuizQuestion = Tables<"walkthrough_quiz_questions">;
type LearningMode = "learn" | "questions";

interface LessonOutline {
  title: string;
  summary: string;
  // New block-based structure
  blocks?: LessonBlock[];
  // Old nested structure
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

interface LearnModeProps {
  lesson: Lesson;
  session: Session | null;
  onSessionUpdate: (session: Session) => void;
  isMuted?: boolean;
}

type AudioState = "idle" | "playing" | "paused";

export default function LearnMode({ lesson, session, onSessionUpdate, isMuted = false }: LearnModeProps) {
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMode, setSelectedMode] = useState<LearningMode | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<QuizQuestion | null>(null);
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);
  const [questionInput, setQuestionInput] = useState("");
  const [isSelectingVoice, setIsSelectingVoice] = useState(!lesson.voice_style);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const questionInputRef = useRef<HTMLInputElement>(null);

  // Audio state management
  const [audioElements, setAudioElements] = useState<Map<string, HTMLAudioElement>>(new Map());
  const [audioStates, setAudioStates] = useState<Map<string, AudioState>>(new Map());
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Text selection state for Q&A mode
  const [selectedText, setSelectedText] = useState<string>("");
  const [selectionPosition, setSelectionPosition] = useState<{x: number, y: number} | null>(null);
  const [highlightedContext, setHighlightedContext] = useState<string>("");
  const qaInputRef = useRef<HTMLInputElement>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionFeature, setSubscriptionFeature] = useState("");

  useEffect(() => {
    if (session) {
      loadSessionData();
    }
  }, [session]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // COMMENTED OUT: Clear text selection when switching modes
  // Not needed in Q&A-only mode
  /* 
  useEffect(() => {
    if (selectedMode !== "questions") {
      setSelectedText("");
      setSelectionPosition(null);
      setHighlightedContext("");
    }
  }, [selectedMode]);
  */

  // Handle muting - pause current audio when muted
  useEffect(() => {
    if (isMuted && playingMessageId) {
      const audio = audioRefs.current.get(playingMessageId);
      if (audio && !audio.paused) {
        audio.pause();
        setAudioStates(prev => new Map(prev).set(playingMessageId, "paused"));
      }
    }
  }, [isMuted, playingMessageId]);

  // Auto-play audio for new assistant messages
  useEffect(() => {
    if (messages.length === 0 || isMuted) return;

    const lastMessage = messages[messages.length - 1];
    
    // Only auto-play assistant messages
    if (lastMessage.role !== "assistant") return;

    // Check if this message has audio URL
    const metadata = lastMessage.metadata as any;
    console.log("[Audio Debug] New message received:");
    console.log("  - Message ID:", lastMessage.id);
    console.log("  - Has metadata:", !!metadata);
    console.log("  - Has audioUrl:", !!metadata?.audioUrl);
    console.log("  - Audio URL:", metadata?.audioUrl);
    console.log("  - Full metadata keys:", metadata ? Object.keys(metadata) : "no metadata");
    
    if (!metadata?.audioUrl) {
      console.warn("[Audio] No audio URL in message metadata - audio will not play");
      return;
    }

    // Check if we've already created audio for this message
    if (audioRefs.current.has(lastMessage.id)) {
      console.log("[Audio] Audio already exists for this message, skipping");
      return;
    }

    // Create and play audio
    console.log("[Audio] Attempting to create and play audio for message");
    playMessageAudio(lastMessage.id, metadata.audioUrl);
  }, [messages, isMuted]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleVoiceSelection = async (personality: string, voiceId: string) => {
    setIsStarting(true);
    setSelectedVoice(personality);
    
    try {
      // Call API to set voice and get greeting
      const response = await fetch("/api/lessons/set-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: lesson.id,
          personality,
          voiceId,
        }),
      });

      if (!response.ok) throw new Error("Failed to set voice");

      const data = await response.json();
      
      // Update local lesson state
      lesson.voice_style = voiceId;
      
      // Hide voice selector
      setIsSelectingVoice(false);
      
      toast.success("Professor voice set! Starting your lesson...");
      
      // Auto-start learn mode after voice selection
      setTimeout(() => {
        startSession("learn");
      }, 500);
    } catch (error) {
      console.error("Error setting voice:", error);
      toast.error("Failed to set voice. Please try again.");
      setIsStarting(false);
    }
  };

  // Audio control functions
  const createAudioElement = (messageId: string, audioUrl: string): HTMLAudioElement => {
    console.log("[Audio] Creating audio element for message:", messageId);
    
    if (!audioUrl || audioUrl.length === 0) {
      console.error("[Audio] Cannot create audio element - no audio URL");
      throw new Error("No audio URL provided");
    }
    
    console.log("[Audio] Audio URL:", audioUrl);
    
    const audio = new Audio(audioUrl);
    
    audio.addEventListener("play", () => {
      console.log("[Audio] Event: play");
      setAudioStates(prev => new Map(prev).set(messageId, "playing"));
      setPlayingMessageId(messageId);
    });
    
    audio.addEventListener("pause", () => {
      console.log("[Audio] Event: pause");
      setAudioStates(prev => new Map(prev).set(messageId, "paused"));
      if (playingMessageId === messageId) {
        setPlayingMessageId(null);
      }
    });
    
    audio.addEventListener("ended", () => {
      console.log("[Audio] Event: ended");
      setAudioStates(prev => new Map(prev).set(messageId, "idle"));
      if (playingMessageId === messageId) {
        setPlayingMessageId(null);
      }
    });

    audio.addEventListener("error", (e: any) => {
      console.error("[Audio] Event: error");
      console.error("  - Error type:", e?.type);
      console.error("  - Error target:", e?.target);
      console.error("  - Audio error code:", e?.target?.error?.code);
      console.error("  - Audio error message:", e?.target?.error?.message);
      setAudioStates(prev => new Map(prev).set(messageId, "idle"));
    });
    
    audio.addEventListener("loadeddata", () => {
      console.log("[Audio] Event: loadeddata - audio is ready to play");
    });
    
    audio.addEventListener("canplay", () => {
      console.log("[Audio] Event: canplay - audio can start playing");
    });

    audioRefs.current.set(messageId, audio);
    setAudioStates(prev => new Map(prev).set(messageId, "idle"));
    
    console.log("[Audio] Audio element fully configured and ready");
    return audio;
  };

  const playMessageAudio = (messageId: string, audioUrl: string) => {
    console.log("[Audio] playMessageAudio called:");
    console.log("  - MessageId:", messageId);
    console.log("  - AudioUrl exists:", !!audioUrl);
    console.log("  - Audio URL:", audioUrl);
    
    if (!audioUrl) {
      console.error("[Audio] No audio URL provided to playMessageAudio");
      return;
    }
    
    // Pause any currently playing audio
    if (playingMessageId && playingMessageId !== messageId) {
      const currentAudio = audioRefs.current.get(playingMessageId);
      if (currentAudio) {
        console.log("[Audio] Pausing previous audio");
        currentAudio.pause();
      }
    }

    let audio = audioRefs.current.get(messageId);
    
    if (!audio) {
      console.log("[Audio] Creating new audio element with URL");
      try {
        audio = createAudioElement(messageId, audioUrl);
        console.log("[Audio] Audio element created successfully");
      } catch (error) {
        console.error("[Audio] Error creating audio element:", error);
        return;
      }
    }

    console.log("[Audio] Calling play() on audio element");
    audio.play()
      .then(() => {
        console.log("[Audio] ✓ Audio playing successfully");
      })
      .catch((error) => {
        console.error("[Audio] ✗ Error playing audio:", error);
        console.error("[Audio] Error name:", error.name);
        console.error("[Audio] Error message:", error.message);
      });
  };

  const pauseMessageAudio = (messageId: string) => {
    const audio = audioRefs.current.get(messageId);
    if (audio && !audio.paused) {
      audio.pause();
    }
  };

  const restartMessageAudio = (messageId: string, audioUrl: string) => {
    const audio = audioRefs.current.get(messageId);
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch((error) => {
        console.error("Error restarting audio:", error);
      });
    } else {
      playMessageAudio(messageId, audioUrl);
    }
  };

  const getAudioState = (messageId: string): AudioState => {
    return audioStates.get(messageId) || "idle";
  };

  const loadSessionData = async (sessionToLoad?: Session) => {
    const targetSession = sessionToLoad || session;
    if (!targetSession) return;

    try {
      const supabase = createClient();
      // Map database value to UI mode ('walkthrough' in DB -> 'learn' in UI)
      const uiMode = targetSession.learning_mode === "walkthrough" ? "learn" : (targetSession.learning_mode as LearningMode);
      setSelectedMode(uiMode);

      // Fetch messages for this session
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("session_id", targetSession.id)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;
      setMessages(messagesData || []);

      // Check for any unanswered quiz question
      const { data: pendingQuiz } = await supabase
        .from("walkthrough_quiz_questions")
        .select("*")
        .eq("session_id", targetSession.id)
        .is("user_answer", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pendingQuiz) {
        setCurrentQuiz(pendingQuiz);
      } else {
        setCurrentQuiz(null);
      }
    } catch (error) {
      console.error("Error loading session data:", error);
      toast.error("Failed to load session data");
    }
  };

  const startSession = async (mode: LearningMode) => {
    if (!lesson) {
      console.error("startSession: No lesson available");
      return;
    }

    setIsStarting(true);
    try {
      const supabase = createClient();

      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error("Authentication error:", authError);
        throw new Error("You must be logged in to create a session");
      }

      // Map UI mode to database value (DB uses 'walkthrough', UI shows 'learn')
      const dbMode = mode === "learn" ? "walkthrough" : mode;
      
      // Create new session
      const sessionData = {
        lesson_id: lesson.id,
        title: lesson.title,
        learning_mode: dbMode,
        started_at: new Date().toISOString(),
      };
      
      console.log("Creating session with data:", sessionData);

      const { data: newSession, error: sessionError } = await supabase
        .from("sessions")
        .insert(sessionData)
        .select()
        .single();

      if (sessionError) {
        console.error("Session creation error details:", {
          message: sessionError.message,
          details: sessionError.details,
          hint: sessionError.hint,
          code: sessionError.code,
        });
        throw new Error(`Failed to create session: ${sessionError.message || sessionError.details || JSON.stringify(sessionError)}`);
      }

      if (!newSession) {
        throw new Error("No session data returned after creation");
      }

      console.log("Session created successfully:", newSession);

      // Create initial greeting message - Q&A focused
      const greeting = mode === "learn"
        ? `Welcome! I'm your AI professor, and I'll be guiding you through "${lesson.title}". We'll go through each concept step by step, and I'll check your understanding along the way. Ready to start?`
        : `Welcome to "${lesson.title}"! I'm here to help you understand this topic. Feel free to ask me anything - whether it's clarifying concepts, providing examples, or explaining things in different ways. You can also highlight any text on the left and click "Ask about this" to ask specific questions. What would you like to know?`;

      const { data: initialMessage, error: messageError } = await supabase
        .from("messages")
        .insert({
          session_id: newSession.id,
          role: "assistant",
          content: greeting,
          metadata: mode === "learn" 
            ? { buttonType: "ready", blockNumber: 0 }
            : {},
        })
        .select()
        .single();

      if (messageError) {
        console.error("Message creation error:", messageError);
        throw new Error(`Failed to create initial message: ${messageError.message || JSON.stringify(messageError)}`);
      }

      if (!initialMessage) {
        throw new Error("No message data returned after creation");
      }

      onSessionUpdate(newSession);
      setSelectedMode(mode);
      setMessages([initialMessage]);

      toast.success(`${mode === "learn" ? "Learn" : "Q&A"} mode started!`);
    } catch (error) {
      console.error("Error starting session:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to start session";
      toast.error(errorMessage);
    } finally {
      setIsStarting(false);
    }
  };

  const handleReady = async () => {
    if (!session || !lesson) return;

    setIsSending(true);
    try {
      const response = await fetch("/api/lessons/walkthrough/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          lessonId: lesson.id,
          action: "start",
        }),
      });

      if (!response.ok) throw new Error("Failed to start walkthrough");

      const data = await response.json();
      
      console.log("[handleReady] Received response from API:");
      console.log("  - Has message:", !!data.message);
      console.log("  - Message metadata:", data.message?.metadata);
      console.log("  - Has audioUrl in metadata:", !!data.message?.metadata?.audioUrl);
      console.log("  - Audio URL:", data.message?.metadata?.audioUrl);
      
      setMessages((prev) => [...prev, data.message]);
      if (data.quizQuestion) {
        setCurrentQuiz(data.quizQuestion);
      }
    } catch (error) {
      console.error("Error starting walkthrough:", error);
      toast.error("Failed to start walkthrough");
    } finally {
      setIsSending(false);
    }
  };

  const handleContinue = async () => {
    if (!session || !lesson) return;

    setIsSending(true);
    try {
      // Clear any existing quiz state before continuing
      setCurrentQuiz(null);
      
      const response = await fetch("/api/lessons/walkthrough/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          lessonId: lesson.id,
          action: "continue",
        }),
      });

      if (!response.ok) throw new Error("Failed to continue");

      const data = await response.json();
      
      console.log("[handleContinue] Received response from API:");
      console.log("  - Has message:", !!data.message);
      console.log("  - Message metadata:", data.message?.metadata);
      console.log("  - Has audioUrl in metadata:", !!data.message?.metadata?.audioUrl);
      console.log("  - Audio URL:", data.message?.metadata?.audioUrl);
      
      setMessages((prev) => [...prev, data.message]);
      if (data.quizQuestion) {
        setCurrentQuiz(data.quizQuestion);
      }
    } catch (error) {
      console.error("Error continuing walkthrough:", error);
      toast.error("Failed to continue");
    } finally {
      setIsSending(false);
    }
  };

  const handleQuizAnswer = async (answerIndex: number) => {
    if (!session || !lesson) return;

    setIsSending(true);
    try {
      const response = await fetch("/api/lessons/walkthrough/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          lessonId: lesson.id,
          action: "answer_quiz",
          quizAnswer: answerIndex,
        }),
      });

      if (!response.ok) throw new Error("Failed to submit answer");

      const data = await response.json();
      
      setMessages((prev) => [...prev, data.message]);
      setCurrentQuiz(null);
    } catch (error) {
      console.error("Error submitting quiz answer:", error);
      toast.error("Failed to submit answer");
    } finally {
      setIsSending(false);
    }
  };

  const handleStartOver = async () => {
    if (!session || !lesson) return;

    const confirmed = window.confirm(
      "Are you sure you want to start over? This will reset your progress in this walkthrough."
    );

    if (!confirmed) return;

    setIsStarting(true);
    try {
      const response = await fetch("/api/lessons/walkthrough/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          lessonId: lesson.id,
        }),
      });

      if (!response.ok) throw new Error("Failed to reset");

      const data = await response.json();
      
      onSessionUpdate(data.session);
      setMessages([data.message]);
      setCurrentQuiz(null);
      toast.success("Walkthrough restarted!");
    } catch (error) {
      console.error("Error resetting walkthrough:", error);
      toast.error("Failed to reset walkthrough");
    } finally {
      setIsStarting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !session || !lesson) return;

    setIsSending(true);
    const currentHighlightedContext = highlightedContext;
    try {
      const supabase = createClient();

      // Build the full question content
      let fullQuestion = inputMessage;
      if (currentHighlightedContext) {
        fullQuestion = `Regarding: "${currentHighlightedContext}"\n\n${inputMessage}`;
      }

      // Insert user message
      const { data: userMessage, error: userError } = await supabase
        .from("messages")
        .insert({
          session_id: session.id,
          role: "user",
          content: fullQuestion,
        })
        .select()
        .single();

      if (userError) throw userError;

      setMessages([...messages, userMessage]);
      setInputMessage("");
      setHighlightedContext("");

      // Call Q&A API to generate response
      const response = await fetch("/api/lessons/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          lessonId: lesson.id,
          question: inputMessage,
          highlightedText: currentHighlightedContext || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === "QUESTION_LIMIT_REACHED") {
          setSubscriptionFeature("unlimited questions");
          setShowSubscriptionModal(true);
          return;
        }
        throw new Error("Failed to get answer");
      }

      const data = await response.json();
      
      setMessages((prev) => [...prev, data.message]);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleTextSelection = () => {
    // Always allow text selection in Q&A-only mode
    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (text && text.length > 3) {
      // Store the selected text
      setSelectedText(text);

      // Get the position of the selection
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();

      if (rect) {
        // Position the button near the selection
        setSelectionPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 10, // Slightly above the selection
        });
      }
    } else {
      // Clear selection if text is too short or empty
      setSelectedText("");
      setSelectionPosition(null);
    }
  };

  const handleAskAboutThis = () => {
    if (selectedText) {
      // Store the highlighted context
      setHighlightedContext(selectedText);
      
      // Focus the Q&A input
      qaInputRef.current?.focus();
      
      // Clear the text selection from DOM
      window.getSelection()?.removeAllRanges();
      
      // Clear selection state
      setSelectedText("");
      setSelectionPosition(null);
    }
  };

  const handleModeSwitch = async (newMode: LearningMode) => {
    if (!lesson || selectedMode === newMode) return;

    try {
      const supabase = createClient();
      
      // Map UI mode to database value for query
      const dbMode = newMode === "learn" ? "walkthrough" : newMode;
      
      // Check if a session already exists for this mode
      const { data: existingSession, error: sessionError } = await supabase
        .from("sessions")
        .select("*")
        .eq("lesson_id", lesson.id)
        .eq("learning_mode", dbMode)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionError && sessionError.code !== "PGRST116") {
        throw sessionError;
      }

      if (existingSession) {
        // Load existing session for this mode
        onSessionUpdate(existingSession);
        await loadSessionData(existingSession);
        toast.success(`Switched to ${newMode === "learn" ? "Learn" : "Q&A"} mode`);
      } else {
        // Create new session for this mode
        await startSession(newMode);
      }
    } catch (error) {
      console.error("Error switching mode:", error);
      toast.error("Failed to switch mode");
    }
  };

  const handleAskQuestion = () => {
    setIsAskingQuestion(true);
    // Auto-focus the input after render
    setTimeout(() => {
      questionInputRef.current?.focus();
    }, 100);
  };

  const handleSendQuestion = async () => {
    if (!questionInput.trim() || !session || !lesson) return;

    setIsSending(true);
    try {
      const supabase = createClient();

      // Insert user question message
      const { data: userMessage, error: userError } = await supabase
        .from("messages")
        .insert({
          session_id: session.id,
          role: "user",
          content: questionInput,
        })
        .select()
        .single();

      if (userError) throw userError;

      setMessages([...messages, userMessage]);
      const currentQuestion = questionInput;
      setQuestionInput("");
      setIsAskingQuestion(false);

      // Call API to get AI response
      const response = await fetch("/api/lessons/walkthrough/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          lessonId: lesson.id,
          question: currentQuestion,
        }),
      });

      if (!response.ok) throw new Error("Failed to get answer");

      const data = await response.json();
      
      setMessages((prev) => [...prev, data.message]);
    } catch (error) {
      console.error("Error sending question:", error);
      toast.error("Failed to send question");
    } finally {
      setIsSending(false);
    }
  };

  const handleQuestionAnsweredYes = () => {
    // Continue with the lesson
    handleContinue();
  };

  const handleQuestionAnsweredNo = () => {
    // Ask another question
    setIsAskingQuestion(true);
    setTimeout(() => {
      questionInputRef.current?.focus();
    }, 100);
  };

  const VOICE_OPTIONS = [
    { 
      personality: "freeman", 
      voiceId: "freeman-voice-id", 
      name: "Morgan Freeman", 
      description: "Wise & Calming", 
      icon: "🎭"
    },
    { 
      personality: "snoop", 
      voiceId: "81dd4427-89aa-4a1a-9527-d225b44f7b28", 
      name: "Snoop Dogg", 
      description: "Cool & Laid-back",
      icon: "🎤"
    },
    { 
      personality: "comedian", 
      voiceId: "comedian-voice-id", 
      name: "Comedian", 
      description: "Fun & Energetic",
      icon: "😄"
    },
    { 
      personality: "mentor", 
      voiceId: "mentor-voice-id", 
      name: "Classic Mentor", 
      description: "Professional & Supportive",
      icon: "👨‍🏫"
    },
  ];

  // COMMENTED OUT: Voice/Mode selection - Starting directly in Q&A mode
  // Will be re-enabled when AI Professor feature is ready
  // The entire voice selection and mode selection UI has been temporarily disabled
  // See git history to restore this functionality

  // Auto-start Q&A mode if no session exists
  useEffect(() => {
    if (!session && lesson && !isStarting) {
      startSession("questions");
    }
  }, [session, lesson]);

  // Show loading while auto-starting Q&A session
  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Starting Q&A mode...</p>
        </div>
      </div>
    );
  }

  // Main learn interface with dual panels
  return (
    <>
    <ResizablePanelGroup direction="horizontal" className="flex-1">
      {/* Left Panel - Lesson Overview */}
      <ResizablePanel defaultSize={45} minSize={30} maxSize={70}>
        <ScrollArea className="h-full" onMouseUp={handleTextSelection}>
          <div className="p-6 space-y-6 bg-background relative">
            {/* Only show summary - title is already shown in the main page header */}
            {lesson.outline.summary && (
              <div className="pb-4 border-b border-border">
                <p className="text-sm text-muted-foreground leading-relaxed">{lesson.outline.summary}</p>
              </div>
            )}
            <div className="space-y-6 pr-4">
              {/* Render new block-based structure if available */}
              {lesson.outline.blocks ? (
                <BlockRenderer blocks={lesson.outline.blocks} />
              ) : (
                // Fallback to old section-based rendering
                <>
                {lesson.outline.sections?.map((section, idx) => {
                const sectionColors = [
                  { 
                    text: "text-blue-500 dark:text-blue-400", 
                    bg: "bg-blue-400", 
                    dot: "bg-blue-300",
                    border: "border-blue-200/60 dark:border-blue-800/40",
                    cardBg: "bg-blue-50/30 dark:bg-blue-950/10",
                    accent: "bg-gradient-to-r from-blue-500/5 to-transparent"
                  },
                  { 
                    text: "text-purple-500 dark:text-purple-400", 
                    bg: "bg-purple-400", 
                    dot: "bg-purple-300",
                    border: "border-purple-200/60 dark:border-purple-800/40",
                    cardBg: "bg-purple-50/30 dark:bg-purple-950/10",
                    accent: "bg-gradient-to-r from-purple-500/5 to-transparent"
                  },
                  { 
                    text: "text-pink-500 dark:text-pink-400", 
                    bg: "bg-pink-400", 
                    dot: "bg-pink-300",
                    border: "border-pink-200/60 dark:border-pink-800/40",
                    cardBg: "bg-pink-50/30 dark:bg-pink-950/10",
                    accent: "bg-gradient-to-r from-pink-500/5 to-transparent"
                  },
                  { 
                    text: "text-emerald-500 dark:text-emerald-400", 
                    bg: "bg-emerald-400", 
                    dot: "bg-emerald-300",
                    border: "border-emerald-200/60 dark:border-emerald-800/40",
                    cardBg: "bg-emerald-50/30 dark:bg-emerald-950/10",
                    accent: "bg-gradient-to-r from-emerald-500/5 to-transparent"
                  },
                  { 
                    text: "text-amber-500 dark:text-amber-400", 
                    bg: "bg-amber-400", 
                    dot: "bg-amber-300",
                    border: "border-amber-200/60 dark:border-amber-800/40",
                    cardBg: "bg-amber-50/30 dark:bg-amber-950/10",
                    accent: "bg-gradient-to-r from-amber-500/5 to-transparent"
                  },
                  { 
                    text: "text-cyan-500 dark:text-cyan-400", 
                    bg: "bg-cyan-400", 
                    dot: "bg-cyan-300",
                    border: "border-cyan-200/60 dark:border-cyan-800/40",
                    cardBg: "bg-cyan-50/30 dark:bg-cyan-950/10",
                    accent: "bg-gradient-to-r from-cyan-500/5 to-transparent"
                  },
                  { 
                    text: "text-indigo-500 dark:text-indigo-400", 
                    bg: "bg-indigo-400", 
                    dot: "bg-indigo-300",
                    border: "border-indigo-200/60 dark:border-indigo-800/40",
                    cardBg: "bg-indigo-50/30 dark:bg-indigo-950/10",
                    accent: "bg-gradient-to-r from-indigo-500/5 to-transparent"
                  },
                  { 
                    text: "text-rose-500 dark:text-rose-400", 
                    bg: "bg-rose-400", 
                    dot: "bg-rose-300",
                    border: "border-rose-200/60 dark:border-rose-800/40",
                    cardBg: "bg-rose-50/30 dark:bg-rose-950/10",
                    accent: "bg-gradient-to-r from-rose-500/5 to-transparent"
                  },
                ];
                const color = sectionColors[idx % sectionColors.length];
                
                return (
                  <div key={idx} className={`${color.cardBg} rounded-lg border ${color.border} p-4`}>
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`w-1.5 h-8 ${color.bg} rounded-full`} />
                      <h3 className={`font-bold text-2xl ${color.text}`}>{section.title}</h3>
                    </div>
                    {section.subsections && (
                      <div className="space-y-5 ml-2">
                        {section.subsections.map((subsection, subIdx) => (
                          <div key={subIdx} className="space-y-3">
                            {/* Subsection Title */}
                            <h4 className="font-semibold text-base text-foreground flex items-start gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${color.dot} mt-2 flex-shrink-0`} />
                              {subsection.title}
                            </h4>
                            
                            {/* Main Content - Full Paragraphs */}
                            {subsection.content && (
                              <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap ml-4">
                                {subsection.content}
                              </div>
                            )}

                            {/* Formula if present */}
                            {subsection.formula && (
                              <div className="ml-4 p-3 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-lg border border-indigo-200/50 dark:border-indigo-800/30">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-indigo-500 dark:text-indigo-400 font-medium text-xs uppercase tracking-wide">Formula</span>
                                </div>
                                <code className="text-sm font-mono text-foreground">{subsection.formula}</code>
                              </div>
                            )}

                            {/* Examples */}
                            {subsection.examples && subsection.examples.length > 0 && (
                              <div className="ml-4 space-y-2">
                                {subsection.examples.map((example, exIdx) => {
                                  // Handle both string and object examples
                                  const exampleText = typeof example === 'string' 
                                    ? example 
                                    : typeof example === 'object' && example !== null
                                      ? (example as any).description || (example as any).text || JSON.stringify(example)
                                      : String(example);
                                  
                                  return (
                                    <div key={exIdx} className={`p-3 rounded-lg border-l-2 ${color.border} ${color.cardBg}`}>
                                      <div className="flex items-start gap-2">
                                        <span className={`text-xs font-medium ${color.text} uppercase tracking-wide mt-0.5`}>Example {exIdx + 1}</span>
                                      </div>
                                      <p className="text-sm text-foreground/90 mt-1">{exampleText}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Think About It prompt */}
                            {subsection.thinkAbout && (
                              <div className="ml-4 p-3 bg-amber-50/40 dark:bg-amber-950/20 rounded-lg border border-amber-200/50 dark:border-amber-700/30">
                                <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-2">
                                  <span className="text-base">💭</span>
                                  Think About It
                                </p>
                                <p className="text-sm text-foreground/90">{subsection.thinkAbout}</p>
                              </div>
                            )}

                            {/* Key Points */}
                            {subsection.keyPoints && subsection.keyPoints.length > 0 && (
                              <div className={`ml-4 p-3 rounded-lg ${color.cardBg} border ${color.border}`}>
                                <p className={`text-xs font-semibold ${color.text} uppercase tracking-wide mb-2 flex items-center gap-2`}>
                                  <span className={`w-1 h-1 rounded-full ${color.bg}`} />
                                  Key Points
                                </p>
                                <ul className="space-y-1.5">
                                  {subsection.keyPoints.map((point, pointIdx) => {
                                    // Handle both string and object points
                                    const pointText = typeof point === 'string' 
                                      ? point 
                                      : typeof point === 'object' && point !== null
                                        ? (point as any).description || (point as any).text || JSON.stringify(point)
                                        : String(point);
                                    
                                    return (
                                      <li key={pointIdx} className="flex items-start gap-2.5 text-sm text-foreground/90">
                                        <span className={`${color.text} mt-0.5 font-semibold`}>•</span>
                                        <span className="flex-1">{pointText}</span>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
                </>
              )}

              {/* Practice Exercises */}
              {lesson.outline.practiceExercises && lesson.outline.practiceExercises.length > 0 && (
                <div className="mt-8 p-4 bg-orange-50/30 dark:bg-orange-950/10 rounded-lg border border-orange-200/60 dark:border-orange-800/40">
                  <h3 className="font-semibold text-lg text-orange-600 dark:text-orange-400 mb-4 flex items-center gap-3">
                    <span className="w-1 h-7 bg-orange-400 rounded-full" />
                    Practice Exercises
                  </h3>
                  <div className="space-y-3 ml-2">
                    {lesson.outline.practiceExercises.map((exercise, idx) => {
                      // Handle both string and object question/hint
                      const questionText = typeof exercise.question === 'string' 
                        ? exercise.question 
                        : typeof exercise.question === 'object' && exercise.question !== null
                          ? (exercise.question as any).description || (exercise.question as any).text || JSON.stringify(exercise.question)
                          : String(exercise.question);
                      
                      const hintText = exercise.hint && typeof exercise.hint === 'object' && exercise.hint !== null
                        ? (exercise.hint as any).description || (exercise.hint as any).text || JSON.stringify(exercise.hint)
                        : exercise.hint;
                      
                      return (
                        <div key={idx} className="p-3 bg-background/50 dark:bg-background/30 rounded-lg border-l-2 border-orange-400/60">
                          <p className="font-medium text-sm text-foreground mb-2 flex items-start gap-2">
                            <span className="text-orange-500 dark:text-orange-400 font-semibold">{idx + 1}.</span>
                            <span className="flex-1">{questionText}</span>
                          </p>
                          {hintText && (
                            <div className="ml-6 mt-2 p-2 bg-orange-50/40 dark:bg-orange-950/20 rounded border border-orange-200/50 dark:border-orange-800/30">
                              <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                                <span className="font-medium">💡 Hint:</span>
                                <span>{hintText}</span>
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Review Questions */}
              {lesson.outline.reviewQuestions && lesson.outline.reviewQuestions.length > 0 && (
                <div className="mt-6 p-4 bg-purple-50/30 dark:bg-purple-950/10 rounded-lg border border-purple-200/60 dark:border-purple-800/40">
                  <h3 className="font-semibold text-lg text-purple-600 dark:text-purple-400 mb-4 flex items-center gap-3">
                    <span className="w-1 h-7 bg-purple-400 rounded-full" />
                    Review Questions
                  </h3>
                  <ul className="space-y-2 ml-2">
                    {lesson.outline.reviewQuestions.map((question, idx) => {
                      // Handle both string and object questions
                      const questionText = typeof question === 'string' 
                        ? question 
                        : typeof question === 'object' && question !== null
                          ? (question as any).description || (question as any).text || (question as any).question || JSON.stringify(question)
                          : String(question);
                      
                      return (
                        <li key={idx} className="flex items-start gap-3 text-sm text-foreground/90 p-3 bg-background/50 dark:bg-background/30 rounded-lg border-l-2 border-purple-400/60">
                          <span className="font-semibold text-purple-500 dark:text-purple-400">{idx + 1}.</span>
                          <span className="flex-1">{questionText}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Key Takeaways */}
              {lesson.outline.keyTakeaways && lesson.outline.keyTakeaways.length > 0 && (
                <div className="mt-6 p-4 bg-emerald-50/30 dark:bg-emerald-950/10 rounded-lg border border-emerald-200/60 dark:border-emerald-700/40">
                  <h3 className="font-semibold text-lg text-emerald-600 dark:text-emerald-400 mb-4 flex items-center gap-3">
                    <span className="text-xl">🎯</span>
                    Key Takeaways
                  </h3>
                  <ul className="space-y-2">
                    {lesson.outline.keyTakeaways.map((takeaway, idx) => {
                      // Handle both string and object takeaways
                      const takeawayText = typeof takeaway === 'string' 
                        ? takeaway 
                        : typeof takeaway === 'object' && takeaway !== null
                          ? (takeaway as any).description || (takeaway as any).text || JSON.stringify(takeaway)
                          : String(takeaway);
                      
                      return (
                        <li key={idx} className="flex items-start gap-3 text-sm text-foreground/90 p-3 bg-background/50 dark:bg-background/30 rounded-lg border-l-2 border-emerald-400/60">
                          <span className="text-emerald-500 dark:text-emerald-400 font-semibold flex-shrink-0">✓</span>
                          <span className="flex-1">{takeawayText}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

          {/* Floating "Ask About This" Button - Always available in Q&A mode */}
          {selectedText && selectionPosition && (
            <Button
              onClick={handleAskAboutThis}
              className="fixed z-50 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg rounded-full px-4 py-2 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-200"
              style={{
                left: `${selectionPosition.x}px`,
                top: `${selectionPosition.y}px`,
                transform: 'translateX(-50%)',
              }}
            >
              💬 Ask about this
            </Button>
          )}
      </ResizablePanel>

      <ResizableHandle 
        withHandle 
        className="w-2 bg-border/50 hover:bg-border transition-colors cursor-col-resize hover:cursor-grab active:cursor-grabbing"
      />

      {/* Right Panel - Chat Interface */}
      <ResizablePanel defaultSize={55} minSize={30}>
        <div className="h-full flex flex-col bg-background">
        {/* COMMENTED OUT: Mode Switcher - Only Q&A mode active for now */}
        {/* Will be re-enabled when AI Professor feature is ready */}
        {/*
        <div className="border-b border-border p-4">
          <Tabs value={selectedMode || "learn"} onValueChange={(value) => handleModeSwitch(value as LearningMode)}>
            <TabsList className="bg-muted">
              <TabsTrigger value="learn">
                <BookOpen className="w-4 h-4 mr-2" />
                Learn
              </TabsTrigger>
              <TabsTrigger value="questions">
                <MessageCircle className="w-4 h-4 mr-2" />
                Q&A
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        */}

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-6 bg-background">
          <div className="space-y-4">
            {messages.map((message, index) => {
              const metadata = message.metadata as any;
              const isLastMessage = index === messages.length - 1;
              const buttonType = metadata?.buttonType;

              return (
                <div key={message.id}>
                  <div
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 ${
                      message.role === "user"
                        ? "chat-bubble-user"
                        : "chat-bubble-professor"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full professor-avatar flex items-center justify-center">
                            <Mic className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-xs font-medium professor-label">
                            AI Professor
                          </span>
                        </div>
                        {/* Audio controls */}
                        {metadata?.audioUrl && (
                          <div className="flex items-center gap-1">
                            {getAudioState(message.id) === "playing" ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 hover:bg-background/20"
                                onClick={() => pauseMessageAudio(message.id)}
                              >
                                <Pause className="h-3 w-3" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 hover:bg-background/20"
                                onClick={() => playMessageAudio(message.id, metadata.audioUrl)}
                              >
                                <Play className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 hover:bg-background/20"
                              onClick={() => restartMessageAudio(message.id, metadata.audioUrl)}
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                      <p className="text-base font-medium leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      <span className="text-xs opacity-70 mt-2 block">
                        {message.created_at
                          ? new Date(message.created_at).toLocaleTimeString()
                          : "Just now"}
                      </span>
                    </div>
                  </div>

                  {/* COMMENTED OUT: Learn mode buttons - Only Q&A mode active for now */}
                  {/* Will be re-enabled when AI Professor feature is ready */}
                  {/* 
                  {message.role === "assistant" && 
                   isLastMessage && 
                   selectedMode === "learn" && 
                   buttonType &&
                   !isSending && (
                    <div className="flex gap-3 mt-3 justify-start ml-2">
                      {buttonType === "ready" && (
                        <Button
                          onClick={handleReady}
                          className="btn-ready px-8 py-3"
                        >
                          ✨ Ready
                        </Button>
                      )}

                      {buttonType === "continue" && (
                        <>
                          <Button
                            onClick={handleContinue}
                            className="btn-continue px-8 py-3"
                          >
                            Continue →
                          </Button>
                          <Button
                            onClick={handleAskQuestion}
                            variant="outline"
                            className="px-8 py-3 border-2 border-blue-500/50 hover:border-blue-500 hover:bg-blue-500/10"
                          >
                            💬 Ask a Question
                          </Button>
                        </>
                      )}

                      {buttonType === "quiz" && currentQuiz && (
                        <div className="space-y-3 w-full max-w-2xl">
                          {(currentQuiz.options as string[]).map((option, idx) => {
                            const colorClasses = ["quiz-option-a", "quiz-option-b", "quiz-option-c", "quiz-option-d"];
                            return (
                              <Button
                                key={idx}
                                onClick={() => handleQuizAnswer(idx)}
                                variant="outline"
                                className={`quiz-option ${colorClasses[idx]} w-full justify-start text-left px-6 py-4 h-auto`}
                              >
                                <span className="font-bold mr-3 text-lg">{String.fromCharCode(65 + idx)}.</span>
                                <span>{option}</span>
                              </Button>
                            );
                          })}
                        </div>
                      )}

                      {buttonType === "question_answered" && (
                        <>
                          <Button
                            onClick={handleQuestionAnsweredYes}
                            className="btn-question-answered px-8 py-3"
                          >
                            ✓ Yes, Continue
                          </Button>
                          <Button
                            onClick={handleQuestionAnsweredNo}
                            variant="outline"
                            className="px-8 py-3 border-2 border-blue-500/50 hover:border-blue-500 hover:bg-blue-500/10"
                          >
                            Ask Again
                          </Button>
                        </>
                      )}

                      {buttonType === "complete" && (
                        <Button
                          onClick={handleStartOver}
                          disabled={isStarting}
                          className="btn-start-over px-8 py-3 disabled:opacity-50"
                        >
                          {isStarting ? "Resetting..." : "🔄 Start Over"}
                        </Button>
                      )}
                    </div>
                  )}
                  */}
                </div>
              );
            })}
            
            {/* COMMENTED OUT: Question input for learn mode */}
            {/* Will be re-enabled when AI Professor feature is ready */}
            {/* 
            {isAskingQuestion && !isSending && (
              <div className="flex justify-end">
                <div className="max-w-[80%] w-full rounded-2xl p-4 bg-muted/50 border-2 border-blue-500/30">
                  <p className="text-sm text-muted-foreground mb-3">Ask your question:</p>
                  <div className="flex gap-3">
                    <Input
                      ref={questionInputRef}
                      placeholder="Type your question here..."
                      value={questionInput}
                      onChange={(e) => setQuestionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendQuestion();
                        } else if (e.key === "Escape") {
                          setIsAskingQuestion(false);
                          setQuestionInput("");
                        }
                      }}
                      className="bg-background border-border"
                    />
                    <Button
                      onClick={handleSendQuestion}
                      disabled={!questionInput.trim()}
                      className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow rounded-full px-6 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Press Enter to send, Esc to cancel</p>
                </div>
              </div>
            )}
            */}
            
            {/* Loading indicator */}
            {isSending && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl p-4 chat-bubble-professor">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full professor-avatar flex items-center justify-center">
                      <Mic className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs font-medium professor-label">
                      AI Professor
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-[#dc2626] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-[#dc2626] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-[#dc2626] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-muted-foreground ml-2">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area - Always visible in Q&A-only mode */}
        <div className="border-t border-border p-4">
          {/* Show highlighted context badge if exists */}
          {highlightedContext && (
            <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg">
              <span className="text-xs text-muted-foreground">Asking about:</span>
              <span className="text-xs text-foreground font-medium line-clamp-1 flex-1">
                "{highlightedContext}"
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover:bg-primary/20"
                onClick={() => setHighlightedContext("")}
              >
                <span className="text-xs">×</span>
              </Button>
            </div>
          )}
          <div className="flex gap-3">
            <Input
              ref={qaInputRef}
              placeholder="Ask a question about the lesson..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isSending}
              className="bg-muted border-border disabled:opacity-50"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isSending || !inputMessage.trim()}
              className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow rounded-full px-6 disabled:opacity-50"
            >
              {isSending ? (
                <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* COMMENTED OUT: Learn mode footer message */}
        {/* Will be re-enabled when AI Professor feature is ready */}
        {/* 
        {selectedMode === "learn" && (
          <div className="border-t border-border p-4">
            <p className="text-sm text-muted-foreground text-center">
              Use the buttons above to progress through the lesson
            </p>
          </div>
        )}
        */}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
    
    <SubscriptionModal 
      open={showSubscriptionModal}
      onOpenChange={setShowSubscriptionModal}
      feature={subscriptionFeature}
    />
  </>
  );
}

