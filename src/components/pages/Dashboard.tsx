"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, BookOpen, Mic, Upload, FileText, Link, Sparkles, MessageSquare, Headphones, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { SignUpModal } from "@/components/modals/SignUpModal";
import { SubscriptionModal } from "@/components/modals/SubscriptionModal";
import CreateLessonModal from "@/components/modals/CreateLessonModal";
import { createClient } from "@/lib/supabase/client";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { toast } from "sonner";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

const Dashboard = () => {
  const router = useRouter();
  const { isSubscribed } = useSubscription();
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [createLessonModalOpen, setCreateLessonModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recentLessons, setRecentLessons] = useState<any[]>([]);
  const [generatingLessonId, setGeneratingLessonId] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleStartLearning = () => {
    // Don't allow creating a new lesson while one is generating
    if (generatingLessonId) {
      return;
    }
    
    // First check authentication
    if (!isAuthenticated) {
      setShowSignUpModal(true);
      return;
    }
    
    // Only check subscription if authenticated
    if (isAuthenticated && !isSubscribed) {
      setShowSubscriptionModal(true);
      return;
    }

    setCreateLessonModalOpen(true);
  };

  const handleLessonCreating = (lessonId: string) => {
    console.log("[Dashboard] Starting realtime subscription for lesson:", lessonId);
    setGeneratingLessonId(lessonId);
    
    // Clean up existing channel if any
    if (channelRef.current) {
      const supabase = createClient();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    const supabase = createClient();
    
    // Clear existing fallback interval if any
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
    
    // Fallback: Check lesson status every 5 seconds in case realtime misses it
    fallbackIntervalRef.current = setInterval(async () => {
      console.log('[Dashboard] Fallback check for lesson:', lessonId);
      const { data: lesson } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single();
      
      if (lesson && (lesson as any).status === 'ready') {
        console.log('[Dashboard] ✅ Lesson found ready via fallback check!');
        if (fallbackIntervalRef.current) {
          clearInterval(fallbackIntervalRef.current);
          fallbackIntervalRef.current = null;
        }
        
        // Add lesson to the list
        setRecentLessons((prev) => {
          const filtered = prev.filter(l => (l as any).id !== lessonId);
          return [lesson, ...filtered];
        });
        
        // Clear generating state
        setGeneratingLessonId(null);
        
        // Show success toast
        toast.success("Lesson generated successfully!");
        
        // Clean up channel
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      } else if (lesson && (lesson as any).status === 'error') {
        console.error('[Dashboard] ❌ Lesson error via fallback check');
        if (fallbackIntervalRef.current) {
          clearInterval(fallbackIntervalRef.current);
          fallbackIntervalRef.current = null;
        }
        
        // Clear generating state
        setGeneratingLessonId(null);
        
        // Show error toast
        toast.error("Failed to generate lesson. Please try again.");
        
        // Clean up channel
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      }
    }, 5000);
    
    // Subscribe to realtime updates for this lesson
    const channel = supabase
      .channel(`lesson-updates-${lessonId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lessons',
          filter: `id=eq.${lessonId}`
        },
        (payload) => {
          console.log('[Dashboard Realtime] Received update:', payload);
          const updatedLesson = payload.new as any;
          
          if (updatedLesson.status === 'ready') {
            console.log('[Dashboard] ✅ Lesson generation complete!');
            if (fallbackIntervalRef.current) {
              clearInterval(fallbackIntervalRef.current);
              fallbackIntervalRef.current = null;
            }
            
            // Add lesson to the list
            setRecentLessons((prev) => {
              const filtered = prev.filter(l => (l as any).id !== lessonId);
              return [updatedLesson, ...filtered];
            });
            
            // Clear generating state
            setGeneratingLessonId(null);
            
            // Show success toast
            toast.success("Lesson generated successfully!");
            
            // Clean up channel
            if (channelRef.current) {
              supabase.removeChannel(channelRef.current);
              channelRef.current = null;
            }
          } else if (updatedLesson.status === 'error') {
            console.error('[Dashboard] ❌ Lesson generation failed');
            if (fallbackIntervalRef.current) {
              clearInterval(fallbackIntervalRef.current);
              fallbackIntervalRef.current = null;
            }
            
            // Clear generating state
            setGeneratingLessonId(null);
            
            // Show error toast
            toast.error("Failed to generate lesson. Please try again.");
            
            // Clean up channel
            if (channelRef.current) {
              supabase.removeChannel(channelRef.current);
              channelRef.current = null;
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[Dashboard Realtime] Subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('[Dashboard Realtime] Successfully subscribed, checking if lesson is already ready...');
          
          // Check immediately in case the lesson finished before we subscribed
          supabase
            .from('lessons')
            .select('*')
            .eq('id', lessonId)
            .single()
            .then(({ data: lesson }) => {
              if (lesson && (lesson as any).status === 'ready') {
                console.log('[Dashboard] ✅ Lesson was already ready!');
                if (fallbackIntervalRef.current) {
                  clearInterval(fallbackIntervalRef.current);
                  fallbackIntervalRef.current = null;
                }
                
                // Add lesson to the list
                setRecentLessons((prev) => {
                  const filtered = prev.filter(l => (l as any).id !== lessonId);
                  return [lesson, ...filtered];
                });
                
                // Clear generating state
                setGeneratingLessonId(null);
                
                // Show success toast
                toast.success("Lesson generated successfully!");
                
                // Clean up channel
                if (channelRef.current) {
                  supabase.removeChannel(channelRef.current);
                  channelRef.current = null;
                }
              }
            });
        }
      });
    
    channelRef.current = channel;
  };

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      setIsAuthenticated(!!user);
      
      // Auto-show sign-up modal on first visit if not authenticated
      if (!user) {
        setShowSignUpModal(true);
      }

      // Fetch user's lessons if authenticated
      if (user) {
        const { data: lessons } = await supabase
          .from("lessons")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        if (lessons) {
          // Check if any lesson is still generating
          const generatingLesson = lessons.find(l => (l as any).status === 'generating');
          if (generatingLesson) {
            const genId = (generatingLesson as any).id;
            console.log("[Dashboard] Found generating lesson on load:", genId);
            // Filter out generating lesson from recent lessons
            setRecentLessons(lessons.filter(l => (l as any).id !== genId));
            // Start realtime subscription
            handleLessonCreating(genId);
          } else {
            setRecentLessons(lessons);
          }
        }
      }
      
      setLoading(false);
    };

    checkAuth();

    // Listen for auth changes
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsAuthenticated(!!session?.user);

      // Fetch lessons when user signs in
      if (session?.user) {
        const { data: lessons } = await supabase
          .from("lessons")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        if (lessons) {
          // Filter out any generating lessons to avoid duplicates with loading card
          const filteredLessons = lessons.filter(l => 
            (l as any).status !== 'generating'
          );
          setRecentLessons(filteredLessons);
        }
      } else {
        setRecentLessons([]);
      }
    });

    return () => {
      subscription.unsubscribe();
      
      // Cleanup realtime channel on unmount
      if (channelRef.current) {
        console.log("[Dashboard] Cleaning up realtime channel on unmount");
        const supabase = createClient();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      // Cleanup fallback interval on unmount
      if (fallbackIntervalRef.current) {
        console.log("[Dashboard] Cleaning up fallback interval on unmount");
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
    };
  }, []);

  return (
    <>
      {/* Sign Up Modal */}
      <SignUpModal open={showSignUpModal} onOpenChange={setShowSignUpModal} />
      
      {/* Subscription Modal */}
      <SubscriptionModal 
        open={showSubscriptionModal} 
        onOpenChange={setShowSubscriptionModal}
        feature="lesson creation"
      />

      {/* Create Lesson Modal */}
      <CreateLessonModal 
        open={createLessonModalOpen} 
        onOpenChange={setCreateLessonModalOpen}
        onLessonCreating={handleLessonCreating}
      />

      {/* Loading Overlay */}
      {loading && <LoadingOverlay message="Loading your lessons..." />}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8 space-y-12">
          {/* Header with Create Lesson Button */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 text-foreground">
                Your Lessons
              </h1>
              <p className="text-muted-foreground text-lg">
                Learn anything through interactive AI professors
              </p>
            </div>
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-[#dc2626] to-[#ef4444] hover:from-[#b91c1c] hover:to-[#dc2626] text-white transition-all rounded-2xl px-8 py-6 text-base font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleStartLearning}
              disabled={!!generatingLessonId}
            >
              <Plus className="mr-2 h-5 w-5" />
              {generatingLessonId ? "Creating Lesson..." : "Create Lesson"}
            </Button>
          </div>

          {/* Lessons Grid */}
          {recentLessons.length === 0 && !generatingLessonId ? (
              <div className="space-y-8">
                {/* Welcome Section */}
                <Card className="p-10 bg-gradient-to-br from-blue/10 via-purple/10 to-pink/10 border-border rounded-2xl">
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue to-purple flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold mb-3 text-foreground">
                        Welcome to BrainBinge! 👋
                      </h2>
                      <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                        Transform your study materials into interactive lessons with AI professors. 
                        Upload notes, textbooks, or paste any content and learn it 5 different ways.
                      </p>
                      <Button 
                        onClick={handleStartLearning}
                        size="lg"
                        className="bg-gradient-to-r from-blue to-purple hover:from-blue/90 hover:to-purple/90 text-white rounded-2xl px-8 py-6 text-base font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!!generatingLessonId}
                      >
                        <Plus className="mr-2 h-5 w-5" />
                        {generatingLessonId ? "Creating Lesson..." : "Create Your First Lesson"}
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* How It Works */}
                <div>
                  <h3 className="text-2xl font-bold mb-6 text-foreground">How It Works</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-6 bg-card border-border rounded-xl">
                      <div className="w-12 h-12 rounded-xl bg-blue/20 flex items-center justify-center mb-4">
                        <Upload className="w-6 h-6 text-blue" />
                      </div>
                      <h4 className="font-semibold mb-2 text-foreground">1. Upload Your Material</h4>
                      <p className="text-sm text-muted-foreground">
                        Upload PDFs, paste text, or add links. BrainBinge organizes everything into clear lessons.
                      </p>
                    </Card>
                    <Card className="p-6 bg-card border-border rounded-xl">
                      <div className="w-12 h-12 rounded-xl bg-purple/20 flex items-center justify-center mb-4">
                        <Sparkles className="w-6 h-6 text-purple" />
                      </div>
                      <h4 className="font-semibold mb-2 text-foreground">2. AI Creates Your Lesson</h4>
                      <p className="text-sm text-muted-foreground">
                        Our AI structures your content, creates an outline, and prepares it for learning.
                      </p>
                    </Card>
                    <Card className="p-6 bg-card border-border rounded-xl">
                      <div className="w-12 h-12 rounded-xl bg-pink/20 flex items-center justify-center mb-4">
                        <GraduationCap className="w-6 h-6 text-pink" />
                      </div>
                      <h4 className="font-semibold mb-2 text-foreground">3. Study Your Way</h4>
                      <p className="text-sm text-muted-foreground">
                        Learn through quizzes, flashcards, audio podcasts, fill-in-blanks, and more.
                      </p>
                    </Card>
                  </div>
                </div>

                {/* What You Can Upload */}
                <div>
                  <h3 className="text-2xl font-bold mb-6 text-foreground">What Can You Upload?</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-5 bg-muted/30 border-border rounded-xl hover:border-blue/30 transition-all">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="w-5 h-5 text-blue" />
                        <span className="font-medium text-foreground">PDF Documents</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Textbooks, lecture slides, research papers</p>
                    </Card>
                    <Card className="p-5 bg-muted/30 border-border rounded-xl hover:border-blue/30 transition-all">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="w-5 h-5 text-purple" />
                        <span className="font-medium text-foreground">Plain Text</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Copy and paste notes, summaries, any text</p>
                    </Card>
                    <Card className="p-5 bg-muted/30 border-border rounded-xl hover:border-blue/30 transition-all">
                      <div className="flex items-center gap-3 mb-2">
                        <Link className="w-5 h-5 text-pink" />
                        <span className="font-medium text-foreground">Web Links</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Wikipedia articles, blog posts, online content</p>
                    </Card>
                  </div>
                </div>

                {/* Features Preview */}
                <div>
                  <h3 className="text-2xl font-bold mb-6 text-foreground">5 Ways to Study the Same Material</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { icon: BookOpen, label: "Lessons", desc: "Organized overview" },
                      { icon: MessageSquare, label: "Quizzes", desc: "Test yourself" },
                      { icon: BookOpen, label: "Flashcards", desc: "Memorize key facts" },
                      { icon: FileText, label: "Fill Blanks", desc: "Active recall" },
                      { icon: Headphones, label: "Podcasts", desc: "Listen & learn" }
                    ].map((feature, idx) => (
                      <Card key={idx} className="p-5 bg-card border-border rounded-xl text-center">
                        <div className="w-10 h-10 rounded-xl bg-blue/20 flex items-center justify-center mx-auto mb-3">
                          <feature.icon className="w-5 h-5 text-blue" />
                        </div>
                        <p className="text-sm font-semibold text-foreground mb-1">{feature.label}</p>
                        <p className="text-xs text-muted-foreground">{feature.desc}</p>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Final CTA */}
                <Card className="p-8 bg-gradient-to-r from-blue/20 to-purple/20 border-border rounded-2xl text-center">
                  <h3 className="text-2xl font-bold mb-3 text-foreground">Ready to Start Learning?</h3>
                  <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                    Create your first lesson and experience interactive learning with AI professors. 
                    It only takes a few seconds!
                  </p>
                  <Button 
                    onClick={handleStartLearning}
                    size="lg"
                    className="bg-gradient-to-r from-blue to-purple hover:from-blue/90 hover:to-purple/90 text-white rounded-2xl px-10 py-6 text-base font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!!generatingLessonId}
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    {generatingLessonId ? "Creating Lesson..." : "Create Your First Lesson"}
                  </Button>
                </Card>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Show generating lesson card if there's one being created */}
                {generatingLessonId && (
                  <Card className="p-7 bg-card border-border rounded-2xl opacity-75 pointer-events-none cursor-not-allowed">
                    <div className="flex items-start justify-between mb-5">
                      <div className="w-12 h-12 rounded-2xl bg-blue/20 flex items-center justify-center animate-pulse">
                        <BookOpen className="w-6 h-6 text-blue" />
                      </div>
                      <span className="text-sm text-muted-foreground">Just now</span>
                    </div>
                    <div className="space-y-3">
                      <div className="h-6 bg-muted rounded animate-pulse w-3/4"></div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-2 h-2 bg-blue rounded-full animate-ping"></div>
                          <span>Preparing your lesson...</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {recentLessons
                  .filter(lesson => {
                    // Filter out any generating lessons
                    return (lesson as any).status !== 'generating';
                  })
                  .map((lesson, idx) => {
                  const colorOptions = [
                    { bg: 'bg-blue/20', icon: 'text-blue' },
                    { bg: 'bg-yellow/20', icon: 'text-yellow' },
                    { bg: 'bg-pink/20', icon: 'text-pink' },
                  ];
                  const colors = colorOptions[idx % colorOptions.length];
                  
                  const voiceLabels: Record<string, string> = {
                    freeman: "Freeman-style",
                    snoop: "Snoop-style",
                    comedian: "Comedian",
                    mentor: "Classic Mentor",
                  };

                  const formatDate = (dateString: string) => {
                    const date = new Date(dateString);
                    const now = new Date();
                    const diffMs = now.getTime() - date.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    const diffDays = Math.floor(diffMs / 86400000);

                    if (diffMins < 60) return `${diffMins}m ago`;
                    if (diffHours < 24) return `${diffHours}h ago`;
                    if (diffDays === 1) return "Yesterday";
                    if (diffDays < 7) return `${diffDays}d ago`;
                    return date.toLocaleDateString();
                  };

                  return (
                    <Card 
                      key={lesson.id} 
                      className="p-7 bg-card border-border hover:border-blue/30 transition-all duration-200 cursor-pointer rounded-2xl"
                      onClick={() => router.push(`/lesson/${lesson.id}`)}
                    >
                      <div className="flex items-start justify-between mb-5">
                        <div className={`w-12 h-12 rounded-2xl ${colors.bg} flex items-center justify-center`}>
                          <BookOpen className={`w-6 h-6 ${colors.icon}`} />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(lesson.created_at)}
                        </span>
                      </div>
                      <h3 className="font-semibold mb-3 line-clamp-2 text-foreground text-lg">
                        {lesson.title}
                      </h3>
                      <div className="flex items-center gap-2 text-base text-muted-foreground">
                        {lesson.subject && (
                          <>
                            <span className="px-3 py-1.5 rounded-xl bg-muted text-sm">
                              {lesson.subject}
                            </span>
                            <span>•</span>
                          </>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Mic className="w-4 h-4" />
                          {voiceLabels[lesson.voice_style] || "AI Professor"}
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )
          }
        </div>
      </main>
    </>
  );
};

export default Dashboard;