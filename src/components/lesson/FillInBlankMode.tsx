"use client";

import { useState, useEffect, useRef } from "react";
import { FileEdit, Sparkles, CheckCircle2, XCircle, Trophy, RotateCcw, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { SubscriptionModal } from "@/components/modals/SubscriptionModal";

interface FillInBlankQuestion {
  id: string;
  question_text: string;
  missing_word: string;
  explanation: string;
  order_index: number;
}

interface UserAnswer {
  question_id: string;
  user_answer: string;
  is_correct: boolean;
}

interface Lesson {
  id: string;
  title: string;
  subject: string;
  outline: any;
}

interface FillInBlankModeProps {
  lesson: Lesson;
}

type FillInBlankState = "idle" | "loading" | "generating" | "taking" | "completed";

export default function FillInBlankMode({ lesson }: FillInBlankModeProps) {
  const { isSubscribed, loading } = useSubscription();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [state, setState] = useState<FillInBlankState>("loading");
  const [questions, setQuestions] = useState<FillInBlankQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState<string>("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  // Check subscription status on mount
  useEffect(() => {
    if (!loading && !isSubscribed) {
      setShowSubscriptionModal(true);
    }
  }, [loading, isSubscribed]);

  // Check if fill-in-blank questions exist or need generation
  useEffect(() => {
    if (isSubscribed) {
      checkFillInBlankStatus();
    }
  }, [lesson.id, isSubscribed]);

  // Auto-focus input when showing a new question
  useEffect(() => {
    if (state === "taking" && !showFeedback && inputRef.current) {
      inputRef.current.focus();
    }
  }, [state, currentQuestionIndex, showFeedback]);

  const checkFillInBlankStatus = async () => {
    try {
      setState("loading");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("fill_in_blank_questions")
        .select("*")
        .eq("lesson_id", lesson.id)
        .order("order_index", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setQuestions(data);
        // Auto-start if questions already exist
        setState("taking");
        setCurrentQuestionIndex(0);
        setUserAnswers([]);
        setCurrentAnswer("");
        setShowFeedback(false);
      } else {
        setState("idle");
      }
    } catch (error) {
      console.error("Error checking fill-in-blank status:", error);
      toast.error("Failed to load fill-in-blank questions");
      setState("idle");
    }
  };

  const handleGenerateQuestions = async () => {
    setState("generating");
    try {
      const response = await fetch("/api/lessons/fill-in-blank/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate fill-in-blank questions");
      }

      const data = await response.json();
      setQuestions(data.questions);
      
      // Auto-start after generation
      setState("taking");
      setCurrentQuestionIndex(0);
      setUserAnswers([]);
      setCurrentAnswer("");
      setShowFeedback(false);
      
      if (data.generated) {
        toast.success("Fill-in-blank questions generated! Starting now.");
      } else {
        toast.info("Questions loaded successfully.");
      }
    } catch (error) {
      console.error("Error generating fill-in-blank questions:", error);
      toast.error("Failed to generate questions. Please try again.");
      setState("idle");
    }
  };

  const handleStartQuestions = () => {
    setState("taking");
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setCurrentAnswer("");
    setShowFeedback(false);
  };

  const handleSubmitAnswer = () => {
    if (!currentAnswer.trim()) {
      toast.error("Please enter an answer");
      return;
    }

    // Check if answer is correct (case-insensitive exact match)
    const normalizedUserAnswer = currentAnswer.trim().toLowerCase();
    const normalizedCorrectAnswer = currentQuestion.missing_word.trim().toLowerCase();
    const correct = normalizedUserAnswer === normalizedCorrectAnswer;

    setIsCorrect(correct);
    setShowFeedback(true);

    // Store the answer
    const answer: UserAnswer = {
      question_id: currentQuestion.id,
      user_answer: currentAnswer,
      is_correct: correct,
    };

    setUserAnswers([...userAnswers, answer]);
  };

  const handleNextQuestion = () => {
    setShowFeedback(false);
    setCurrentAnswer("");

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Questions completed
      completeQuestions();
    }
  };

  const completeQuestions = async () => {
    const correctAnswers = userAnswers.filter((a) => a.is_correct).length + (isCorrect ? 1 : 0);
    const finalScore = Math.round((correctAnswers / questions.length) * 100);
    setScore(finalScore);
    setState("completed");

    // Save attempt to database (reusing quiz_attempts table)
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase.from("quiz_attempts").insert({
          lesson_id: lesson.id,
          user_id: user.id,
          answers: [...userAnswers, { question_id: currentQuestion.id, user_answer: currentAnswer, is_correct: isCorrect }],
          score: finalScore,
        });
      }
    } catch (error) {
      console.error("Error saving attempt:", error);
    }
  };

  const handleRetake = () => {
    setState("taking");
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setCurrentAnswer("");
    setShowFeedback(false);
    setScore(0);
  };

  // Keyboard support
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !showFeedback) {
      handleSubmitAnswer();
    }
  };

  // Render different states
  let content;
  
  if (state === "loading") {
    content = (
      <div className="flex-1 flex items-center justify-center p-6 bg-background overflow-auto">
        <Card className="max-w-xl w-full bg-card/50 backdrop-blur border-border p-8 text-center">
          <Loader2 className="w-12 h-12 text-[#3B82F6] animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">Loading Questions</h2>
          <p className="text-base text-muted-foreground">
            Checking for existing questions...
          </p>
        </Card>
      </div>
    );
  } else if (state === "generating") {
    content = (
      <div className="flex-1 flex items-center justify-center p-6 bg-background overflow-auto">
        <Card className="max-w-xl w-full bg-card/50 backdrop-blur border-border p-8 text-center">
          <Loader2 className="w-12 h-12 text-[#3B82F6] animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">Generating Questions</h2>
          <p className="text-base text-muted-foreground">
            Creating fill-in-the-blank questions based on your lesson content...
          </p>
        </Card>
      </div>
    );
  } else if (state === "idle" && questions.length === 0) {
    content = (
      <div className="flex-1 flex items-center justify-center p-6 bg-background overflow-auto">
        <Card className="max-w-xl w-full bg-card/50 backdrop-blur border-border p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#3B82F6]/20 flex items-center justify-center mx-auto mb-4">
            <FileEdit className="w-8 h-8 text-[#3B82F6]" />
          </div>
          
          <h2 className="text-2xl font-bold mb-3">
            Fill in the Blank Mode
          </h2>
          
          <p className="text-base text-muted-foreground mb-6">
            Test your knowledge by completing sentences from{" "}
            <span className="text-foreground font-medium">{lesson.title}</span>
          </p>

          <Button
            onClick={handleGenerateQuestions}
            size="lg"
            className="bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] hover:opacity-90 text-white px-6 py-5 text-base rounded-xl"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Questions
          </Button>
        </Card>
      </div>
    );
  } else if (state === "idle" && questions.length > 0) {
    content = (
      <div className="flex-1 flex items-center justify-center p-6 bg-background overflow-auto">
        <Card className="max-w-xl w-full bg-card/50 backdrop-blur border-border p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#3B82F6]/20 flex items-center justify-center mx-auto mb-4">
            <FileEdit className="w-8 h-8 text-[#3B82F6]" />
          </div>
          
          <h2 className="text-2xl font-bold mb-3">Questions Ready!</h2>
          
          <p className="text-base text-muted-foreground mb-2">
            {questions.length} fill-in-the-blank questions prepared for{" "}
            <span className="text-foreground font-medium">{lesson.title}</span>
          </p>

          <p className="text-sm text-muted-foreground mb-6">
            Complete each sentence by filling in the missing word
          </p>

          <Button
            onClick={handleStartQuestions}
            size="lg"
            className="bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] hover:opacity-90 text-white px-6 py-5 text-base rounded-xl"
          >
            Start Questions
          </Button>
        </Card>
      </div>
    );
  } else if (state === "completed") {
    const correctCount = userAnswers.filter((a) => a.is_correct).length;
    const percentage = score;

    content = (
      <ScrollArea className="flex-1 h-full">
        <div className="p-6 bg-background min-h-full flex items-center justify-center">
          <Card className="max-w-2xl w-full bg-card/50 backdrop-blur border-border p-6 my-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-[#3B82F6]/20 flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-[#3B82F6]" />
              </div>
              
              <h2 className="text-2xl font-bold mb-3">Completed!</h2>
              
              <div className="text-4xl font-bold mb-2 text-[#3B82F6]">
                {percentage}%
              </div>
              
              <p className="text-base text-muted-foreground mb-4">
                {correctCount} out of {questions.length} correct
              </p>

              {percentage >= 80 && (
                <p className="text-base text-[#27AE60] mb-2">🎉 Excellent work!</p>
              )}
              {percentage >= 60 && percentage < 80 && (
                <p className="text-base text-[#F59E0B] mb-2">👍 Good job!</p>
              )}
              {percentage < 60 && (
                <p className="text-base text-muted-foreground mb-2">Keep practicing!</p>
              )}
            </div>

            {/* Review answers */}
            <div className="space-y-3 mb-6">
              <h3 className="text-lg font-semibold mb-3">Review Your Answers</h3>
              {questions.map((q, index) => {
                const userAnswer = userAnswers[index];
                return (
                  <Card key={q.id} className={`p-3 ${userAnswer?.is_correct ? 'border-[#27AE60]' : 'border-[#EB5757]'}`}>
                    <div className="flex items-start gap-2">
                      {userAnswer?.is_correct ? (
                        <CheckCircle2 className="w-4 h-4 text-[#27AE60] flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-[#EB5757] flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-sm mb-1">{q.question_text}</p>
                        <p className="text-xs text-muted-foreground">
                          Your answer: <span className={userAnswer?.is_correct ? 'text-[#27AE60]' : 'text-[#EB5757]'}>{userAnswer?.user_answer}</span>
                        </p>
                        {!userAnswer?.is_correct && (
                          <p className="text-xs text-[#27AE60] mt-1">
                            Correct answer: {q.missing_word}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <Button
              onClick={handleRetake}
              size="lg"
              className="w-full bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] hover:opacity-90 text-white py-5 text-base rounded-xl"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </Card>
        </div>
      </ScrollArea>
    );
  } else if (state === "taking" && currentQuestion) {
    content = (
      <ScrollArea className="flex-1 h-full">
        <div className="p-6 bg-background min-h-full">
          <div className="max-w-2xl mx-auto">
            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {Math.round(progress)}% Complete
                </span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>

            {/* Question card */}
            <Card className="bg-card/50 backdrop-blur border border-[#3B82F6]/30 p-6 mb-4">
              <div className="mb-4">
                <div className="inline-block px-2 py-1 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] text-xs font-medium mb-3">
                  Fill in the Blank
                </div>
                
                <h3 className="text-lg font-bold mb-4">{currentQuestion.question_text}</h3>

                {/* Input field */}
                <div className={`p-3 rounded-lg border transition-all ${
                  currentAnswer.trim()
                    ? "border-[#3B82F6] bg-[#3B82F6]/10"
                    : "border-border hover:border-[#3B82F6]/50"
                }`}>
                  <Input
                    ref={inputRef}
                    type="text"
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={showFeedback}
                    placeholder="Type your answer here..."
                    className="text-base border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                  />
                </div>
              </div>

              {/* Feedback */}
              {showFeedback && (
                <Card className={`p-4 mt-4 ${isCorrect ? "bg-[#27AE60]/10 border-[#27AE60]" : "bg-[#EB5757]/10 border-[#EB5757]"}`}>
                  <div className="flex items-start gap-2">
                    {isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-[#27AE60] flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-[#EB5757] flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className={`font-bold text-base mb-1 ${isCorrect ? "text-[#27AE60]" : "text-[#EB5757]"}`}>
                        {isCorrect ? "Correct!" : "Incorrect"}
                      </h4>
                      {!isCorrect && (
                        <p className="text-xs mb-1">
                          <span className="font-medium">Correct answer:</span> {currentQuestion.missing_word}
                        </p>
                      )}
                      <p className="text-xs text-foreground">{currentQuestion.explanation}</p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Action buttons */}
              <div className="mt-4">
                {!showFeedback ? (
                  <Button
                    onClick={handleSubmitAnswer}
                    disabled={!currentAnswer.trim()}
                    size="lg"
                    className="w-full bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] hover:opacity-90 text-white py-5 text-base rounded-xl disabled:opacity-50"
                  >
                    Submit Answer
                  </Button>
                ) : (
                  <Button
                    onClick={handleNextQuestion}
                    size="lg"
                    className="w-full bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] hover:opacity-90 text-white py-5 text-base rounded-xl"
                  >
                    {currentQuestionIndex < questions.length - 1 ? "Next Question" : "Finish"}
                  </Button>
                )}
              </div>
            </Card>

            {/* Keyboard hint */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Press <span className="font-medium">Enter</span> to submit your answer
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
        feature="fill-in-blank generation"
      />
    </>
  );
}

