"use client";

import { useState, useEffect } from "react";
import { Brain, Sparkles, CheckCircle2, XCircle, Trophy, RotateCcw, Loader2, Plus, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { SubscriptionModal } from "@/components/modals/SubscriptionModal";

interface QuizQuestion {
  id: string;
  question: string;
  question_type: "multiple_choice" | "true_false" | "fill_in_blank";
  options: string[] | null;
  correct_answer: string;
  missing_word?: string | null;
  explanation: string;
  order_index: number;
}

interface Quiz {
  id: string;
  title: string;
  question_types: string[];
  status: "pending" | "generating" | "ready" | "error";
  created_at: string;
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

interface QuizModeProps {
  lesson: Lesson;
}

type QuizState = "loading" | "selecting" | "creating" | "generating" | "taking" | "reviewing" | "completed";

export default function QuizMode({ lesson }: QuizModeProps) {
  const { isSubscribed, loading } = useSubscription();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [state, setState] = useState<QuizState>("loading");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState<string>("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [showExitDialog, setShowExitDialog] = useState(false);
  
  // Quiz creation state
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>(["multiple_choice", "true_false"]);
  const [sections, setSections] = useState<Array<{id: string, title: string, section_index: number}>>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  // Check subscription status on mount
  useEffect(() => {
    if (!loading && !isSubscribed) {
      setShowSubscriptionModal(true);
    }
  }, [loading, isSubscribed]);

  // Check if quizzes exist or need generation
  useEffect(() => {
    if (isSubscribed) {
      checkQuizzes();
    }
  }, [lesson.id, isSubscribed]);

  // Fetch sections for this lesson
  useEffect(() => {
    const fetchSections = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('lesson_sections')
          .select('id, title, section_index')
          .eq('lesson_id', lesson.id)
          .order('section_index', { ascending: true });

        if (error) throw error;
        setSections(data || []);
      } catch (error) {
        console.error("Error fetching sections:", error);
        // Fail silently - sections are optional
      }
    };

    fetchSections();
  }, [lesson.id]);

  // Poll quiz status if generating
  useEffect(() => {
    if (selectedQuiz && selectedQuiz.status === 'generating') {
      const pollInterval = setInterval(async () => {
        const supabase = createClient();
        const { data } = await supabase
          .from("quizzes")
          .select("*")
          .eq("id", selectedQuiz.id)
          .single();
        
        if (data) {
          const updatedQuiz = data as Quiz;
          if (updatedQuiz.status === 'ready') {
            clearInterval(pollInterval);
            setSelectedQuiz(updatedQuiz);
            loadQuizQuestions(updatedQuiz.id);
          } else if (updatedQuiz.status === 'error') {
            clearInterval(pollInterval);
            setState("idle");
            toast.error("Quiz generation failed");
          }
        }
      }, 2000);
      
      setTimeout(() => clearInterval(pollInterval), 300000); // Stop after 5 minutes
      return () => clearInterval(pollInterval);
    }
  }, [selectedQuiz]);

  const checkQuizzes = async () => {
    try {
      setState("loading");
      const supabase = createClient();
      
      // Get all quizzes for this lesson
      const { data: quizzesData, error: quizzesError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("lesson_id", lesson.id)
        .order("created_at", { ascending: false });

      if (quizzesError) throw quizzesError;

      // Always show the selecting state (with quiz list or empty state)
      setState("selecting");
      if (quizzesData && quizzesData.length > 0) {
        setQuizzes(quizzesData as Quiz[]);
      }
    } catch (error) {
      console.error("Error checking quizzes:", error);
      toast.error("Failed to load quizzes");
      setState("selecting");
    }
  };

  const loadQuizQuestions = async (quizId: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("order_index", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setQuestions(data as QuizQuestion[]);
        setState("taking");
        setCurrentQuestionIndex(0);
        setUserAnswers([]);
        setCurrentAnswer("");
        setShowFeedback(false);
      } else {
        setState("selecting");
        toast.error("Quiz has no questions");
      }
    } catch (error) {
      console.error("Error loading quiz questions:", error);
      toast.error("Failed to load quiz questions");
      setState("selecting");
    }
  };

  const handleCreateQuiz = () => {
    if (selectedQuestionTypes.length === 0) {
      toast.error("Please select at least one question type");
      return;
    }
    setState("creating");
  };

  const handleGenerateQuiz = async () => {
    setState("generating");
    try {
      const response = await fetch("/api/lessons/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          lessonId: lesson.id,
          questionTypes: selectedQuestionTypes,
          sectionId: selectedSectionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate quiz");
      }

      const data = await response.json();
      
      // Generation started - poll for completion
      if (data.generating) {
        toast.success("Quiz generation started!");
        // Create quiz object for polling (title will be set by API)
        const newQuiz: Quiz = {
          id: data.quizId,
          title: data.title || "Quiz",
          question_types: selectedQuestionTypes,
          status: 'generating',
          created_at: new Date().toISOString(),
        };
        setSelectedQuiz(newQuiz);
        setQuizzes([newQuiz, ...quizzes]);
      }
    } catch (error) {
      console.error("Error generating quiz:", error);
      toast.error("Failed to generate quiz. Please try again.");
      setState("selecting");
    }
  };

  const handleSelectQuiz = async (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    
    if (quiz.status === 'ready') {
      await loadQuizQuestions(quiz.id);
    } else if (quiz.status === 'generating') {
      setState("generating");
    } else {
      toast.error("Quiz is not ready yet");
    }
  };

  const handleStartQuiz = () => {
    setState("taking");
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setCurrentAnswer("");
    setShowFeedback(false);
  };

  const handleSubmitAnswer = () => {
    if (!currentAnswer.trim()) {
      toast.error("Please select or enter an answer");
      return;
    }

    // Check if answer is correct
    let correct = false;
    const normalizedUserAnswer = currentAnswer.trim().toLowerCase();
    const normalizedCorrectAnswer = currentQuestion.correct_answer.trim().toLowerCase();

    if (currentQuestion.question_type === "fill_in_blank") {
      // For fill-in-blank, check against missing_word or correct_answer
      const correctWord = (currentQuestion.missing_word || currentQuestion.correct_answer).toLowerCase();
      correct = normalizedUserAnswer === correctWord || 
                normalizedUserAnswer.includes(correctWord) ||
                correctWord.includes(normalizedUserAnswer);
    } else if (currentQuestion.question_type === "true_false") {
      // For true/false, exact match
      correct = normalizedUserAnswer === normalizedCorrectAnswer;
    } else {
      // For multiple choice, exact match
      correct = normalizedUserAnswer === normalizedCorrectAnswer;
    }

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
      // Quiz completed
      completeQuiz();
    }
  };

  const completeQuiz = async () => {
    const correctAnswers = userAnswers.filter((a) => a.is_correct).length + (isCorrect ? 1 : 0);
    const finalScore = Math.round((correctAnswers / questions.length) * 100);
    setScore(finalScore);
    setState("completed");

    // Save attempt to database
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user && selectedQuiz) {
        await supabase.from("quiz_attempts").insert({
          lesson_id: lesson.id,
          user_id: user.id,
          answers: [...userAnswers, { question_id: currentQuestion.id, user_answer: currentAnswer, is_correct: isCorrect }],
          score: finalScore,
        });
      }
    } catch (error) {
      console.error("Error saving quiz attempt:", error);
    }
  };

  const handleRetakeQuiz = () => {
    setState("taking");
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setCurrentAnswer("");
    setShowFeedback(false);
    setScore(0);
  };

  const toggleQuestionType = (type: string) => {
    if (selectedQuestionTypes.includes(type)) {
      setSelectedQuestionTypes(selectedQuestionTypes.filter(t => t !== type));
    } else {
      setSelectedQuestionTypes([...selectedQuestionTypes, type]);
    }
  };

  // Render different states
  let content;
  
  if (state === "loading") {
    content = (
      <div className="flex-1 flex items-center justify-center p-6 bg-background overflow-auto">
        <Card className="max-w-xl w-full bg-card/50 backdrop-blur border-border p-8 text-center">
          <Loader2 className="w-12 h-12 text-[#F59E0B] animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">Loading Quizzes</h2>
          <p className="text-base text-muted-foreground">
            Checking for existing quizzes...
          </p>
        </Card>
      </div>
    );
  } else if (state === "selecting") {
    content = (
      <div className="flex-1 flex items-center justify-center p-6 bg-background overflow-auto">
        <Card className="max-w-2xl w-full bg-card/50 backdrop-blur border-border p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Select or Create Quiz</h2>
            <Button
              onClick={handleCreateQuiz}
              size="sm"
              className="bg-gradient-to-r from-[#F59E0B] to-[#F97316] hover:opacity-90 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Quiz
            </Button>
          </div>

          {quizzes.length > 0 ? (
            <div className="space-y-3">
              {quizzes.map((quiz) => (
                <Card
                  key={quiz.id}
                  className={`p-4 cursor-pointer transition-all hover:border-[#F59E0B] ${
                    selectedQuiz?.id === quiz.id ? 'border-[#F59E0B] border-2' : ''
                  }`}
                  onClick={() => handleSelectQuiz(quiz)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold">{quiz.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {quiz.question_types.join(", ").replace(/_/g, " ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {quiz.status === 'ready' && (
                        <span className="text-xs px-2 py-1 rounded-full bg-[#27AE60]/20 text-[#27AE60]">Ready</span>
                      )}
                      {quiz.status === 'generating' && (
                        <Loader2 className="w-4 h-4 text-[#F59E0B] animate-spin" />
                      )}
                      {quiz.status === 'error' && (
                        <span className="text-xs px-2 py-1 rounded-full bg-[#EB5757]/20 text-[#EB5757]">Error</span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No quizzes yet. Create your first quiz!</p>
              <Button
                onClick={handleCreateQuiz}
                size="lg"
                className="bg-gradient-to-r from-[#F59E0B] to-[#F97316] hover:opacity-90 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Quiz
              </Button>
            </div>
          )}
        </Card>
      </div>
    );
  } else if (state === "creating") {
    content = (
      <div className="flex-1 flex items-center justify-center p-6 bg-background overflow-auto">
        <Card className="max-w-xl w-full bg-card/50 backdrop-blur border-border p-8">
          <h2 className="text-2xl font-bold mb-6">Create New Quiz</h2>
          
          <div className="space-y-4">
            <div>
              <Label className="mb-3 block">Quiz Scope</Label>
              <RadioGroup 
                value={selectedSectionId || "entire"} 
                onValueChange={(value) => setSelectedSectionId(value === "entire" ? null : value)}
              >
                <div className="space-y-2">
                  <div
                    className="flex items-center space-x-2 p-3 rounded-lg border cursor-pointer hover:border-[#F59E0B] transition-all"
                  >
                    <RadioGroupItem value="entire" id="scope-entire" />
                    <Label htmlFor="scope-entire" className="cursor-pointer flex-1">Entire Lesson</Label>
                  </div>
                  {sections.map((section) => (
                    <div
                      key={section.id}
                      className="flex items-center space-x-2 p-3 rounded-lg border cursor-pointer hover:border-[#F59E0B] transition-all"
                    >
                      <RadioGroupItem value={section.id} id={`scope-${section.id}`} />
                      <Label htmlFor={`scope-${section.id}`} className="cursor-pointer flex-1">
                        Section {section.section_index + 1}: {section.title}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label className="mb-3 block">Question Types</Label>
              <div className="space-y-2">
                {[
                  { value: "multiple_choice", label: "Multiple Choice" },
                  { value: "true_false", label: "True/False" },
                  { value: "fill_in_blank", label: "Fill in the Blank" },
                ].map((type) => (
                  <div
                    key={type.value}
                    className="flex items-center space-x-2 p-3 rounded-lg border cursor-pointer hover:border-[#F59E0B] transition-all"
                    onClick={() => toggleQuestionType(type.value)}
                  >
                    <Checkbox
                      checked={selectedQuestionTypes.includes(type.value)}
                      onCheckedChange={() => toggleQuestionType(type.value)}
                      className="w-4 h-4"
                    />
                    <Label className="cursor-pointer flex-1">{type.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => {
                  setState("selecting");
                  setSelectedQuestionTypes(["multiple_choice", "true_false"]);
                  setSelectedSectionId(null);
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateQuiz}
                disabled={selectedQuestionTypes.length === 0}
                className="flex-1 bg-gradient-to-r from-[#F59E0B] to-[#F97316] hover:opacity-90 text-white disabled:opacity-50"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Quiz
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  } else if (state === "generating") {
    content = (
      <div className="flex-1 flex items-center justify-center p-6 bg-background overflow-auto">
        <Card className="max-w-xl w-full bg-card/50 backdrop-blur border-border p-8 text-center">
          <Loader2 className="w-12 h-12 text-[#F59E0B] animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">Generating Your Quiz</h2>
          <p className="text-base text-muted-foreground">
            Creating personalized questions based on your lesson content...
          </p>
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
            {/* Back button */}
            <Button
              onClick={() => {
                setState("selecting");
                setCurrentQuestionIndex(0);
                setUserAnswers([]);
                setCurrentAnswer("");
                setShowFeedback(false);
                setScore(0);
                setSelectedQuiz(null);
              }}
              variant="ghost"
              size="sm"
              className="mb-4 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Quizzes
            </Button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-[#F59E0B]/20 flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-[#F59E0B]" />
              </div>
              
              <h2 className="text-2xl font-bold mb-3">Quiz Completed!</h2>
              
              <div className="text-4xl font-bold mb-2 text-[#F59E0B]">
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
                        <p className="font-medium text-sm mb-1">{q.question}</p>
                        <p className="text-xs text-muted-foreground">
                          Your answer: <span className={userAnswer?.is_correct ? 'text-[#27AE60]' : 'text-[#EB5757]'}>{userAnswer?.user_answer}</span>
                        </p>
                        {!userAnswer?.is_correct && (
                          <p className="text-xs text-[#27AE60] mt-1">
                            Correct answer: {q.correct_answer}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <Button
              onClick={handleRetakeQuiz}
              size="lg"
              className="w-full bg-gradient-to-r from-[#F59E0B] to-[#F97316] hover:opacity-90 text-white py-5 text-base rounded-xl"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Retake Quiz
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
            {/* Back button */}
            <Button
              onClick={() => setShowExitDialog(true)}
              variant="ghost"
              size="sm"
              className="mb-4 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Quizzes
            </Button>

            <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Leave Quiz?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to leave this quiz? Your progress will be saved.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      setState("selecting");
                      setCurrentQuestionIndex(0);
                      setUserAnswers([]);
                      setCurrentAnswer("");
                      setShowFeedback(false);
                      setSelectedQuiz(null);
                      setShowExitDialog(false);
                    }}
                  >
                    Leave Quiz
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

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
            <Card className="bg-card/50 backdrop-blur border border-[#F59E0B]/30 p-6 mb-4">
              <div className="mb-4">
                <div className="inline-block px-2 py-1 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] text-xs font-medium mb-3">
                  {currentQuestion.question_type === "multiple_choice" && "Multiple Choice"}
                  {currentQuestion.question_type === "true_false" && "True/False"}
                  {currentQuestion.question_type === "fill_in_blank" && "Fill in the Blank"}
                </div>
                
                <h3 className="text-lg font-bold mb-4">
                  {currentQuestion.question_type === "fill_in_blank" 
                    ? currentQuestion.question.replace(/_____/g, "_____") 
                    : currentQuestion.question}
                </h3>

                {/* Multiple Choice */}
                {currentQuestion.question_type === "multiple_choice" && currentQuestion.options && (
                  <RadioGroup value={currentAnswer} onValueChange={setCurrentAnswer} disabled={showFeedback}>
                    <div className="space-y-2">
                      {currentQuestion.options.map((option, index) => (
                        <div
                          key={index}
                          className={`flex items-center space-x-2 p-3 rounded-lg border transition-all ${
                            currentAnswer === option
                              ? "border-[#F59E0B] bg-[#F59E0B]/10"
                              : "border-border hover:border-[#F59E0B]/50"
                          } ${showFeedback && option === currentQuestion.correct_answer ? "border-[#27AE60] bg-[#27AE60]/10" : ""}
                          ${showFeedback && currentAnswer === option && !isCorrect ? "border-[#EB5757] bg-[#EB5757]/10" : ""}`}
                        >
                          <RadioGroupItem value={option} id={`option-${index}`} />
                          <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer text-sm">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                )}

                {/* True/False */}
                {currentQuestion.question_type === "true_false" && (
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setCurrentAnswer("true")}
                      disabled={showFeedback}
                      variant="outline"
                      size="lg"
                      className={`flex-1 h-12 text-base rounded-lg transition-all ${
                        currentAnswer === "true"
                          ? "border-[#F59E0B] bg-[#F59E0B]/10 border-2"
                          : "border-border hover:border-[#F59E0B]/50"
                      } ${showFeedback && currentQuestion.correct_answer.toLowerCase() === "true" ? "border-[#27AE60] bg-[#27AE60]/10" : ""}
                      ${showFeedback && currentAnswer === "true" && !isCorrect ? "border-[#EB5757] bg-[#EB5757]/10" : ""}`}
                    >
                      True
                    </Button>
                    <Button
                      onClick={() => setCurrentAnswer("false")}
                      disabled={showFeedback}
                      variant="outline"
                      size="lg"
                      className={`flex-1 h-12 text-base rounded-lg transition-all ${
                        currentAnswer === "false"
                          ? "border-[#F59E0B] bg-[#F59E0B]/10 border-2"
                          : "border-border hover:border-[#F59E0B]/50"
                      } ${showFeedback && currentQuestion.correct_answer.toLowerCase() === "false" ? "border-[#27AE60] bg-[#27AE60]/10" : ""}
                      ${showFeedback && currentAnswer === "false" && !isCorrect ? "border-[#EB5757] bg-[#EB5757]/10" : ""}`}
                    >
                      False
                    </Button>
                  </div>
                )}

                {/* Fill in the Blank */}
                {currentQuestion.question_type === "fill_in_blank" && (
                  <Input
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    disabled={showFeedback}
                    placeholder="Enter your answer..."
                    className="text-base h-12"
                  />
                )}
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
                          <span className="font-medium">Correct answer:</span>{" "}
                          {currentQuestion.question_type === "true_false" 
                            ? currentQuestion.correct_answer.toLowerCase() === "true" ? "True" : "False"
                            : currentQuestion.missing_word || currentQuestion.correct_answer}
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
                    className="w-full bg-gradient-to-r from-[#F59E0B] to-[#F97316] hover:opacity-90 text-white py-5 text-base rounded-xl disabled:opacity-50"
                  >
                    Submit Answer
                  </Button>
                ) : (
                  <Button
                    onClick={handleNextQuestion}
                    size="lg"
                    className="w-full bg-gradient-to-r from-[#F59E0B] to-[#F97316] hover:opacity-90 text-white py-5 text-base rounded-xl"
                  >
                    {currentQuestionIndex < questions.length - 1 ? "Next Question" : "Finish Quiz"}
                  </Button>
                )}
              </div>
            </Card>
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
        feature="quiz generation"
      />
    </>
  );
}
