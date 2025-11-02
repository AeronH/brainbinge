"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { SubscriptionModal } from "@/components/modals/SubscriptionModal";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { createClient } from "@/lib/supabase/client";

const CreateLesson = () => {
  const router = useRouter();
  const { isSubscribed, loading: subscriptionLoading } = useSubscription();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [lessonData, setLessonData] = useState({
    content: "",
    personality: "snoop",
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.type.includes("text")) {
      toast.error("Please upload a PDF or text file");
      return;
    }

    setUploadedFile(file);

    // For text files, read the content directly
    if (file.type.includes("text")) {
      const text = await file.text();
      setLessonData({ ...lessonData, content: text });
      toast.success("File content loaded!");
      return;
    }

    // For PDFs, we'll need a PDF parsing library
    toast.info("PDF upload selected. Please paste the text content for now.");
  };

  const removeFile = () => {
    setUploadedFile(null);
    setLessonData({ ...lessonData, content: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!lessonData.content) {
      toast.error("Please add lesson content");
      return;
    }

    // Check subscription status before allowing lesson creation
    if (!isSubscribed) {
      setShowSubscriptionModal(true);
      return;
    }

    setIsGenerating(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please sign in to create lessons");
        router.push("/signin");
        return;
      }

      // Map personality to Speechify voice ID
      const VOICE_ID_MAP: Record<string, string> = {
        freeman: "freeman-voice-id",
        snoop: "81dd4427-89aa-4a1a-9527-d225b44f7b28",
        comedian: "comedian-voice-id",
        mentor: "mentor-voice-id",
      };
      const voiceId = VOICE_ID_MAP[lessonData.personality];

      // Generate lesson outline and save to database
      const generateResponse = await fetch("/api/lessons/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: lessonData.content,
          personality: lessonData.personality,
          voiceId: voiceId,
          userId: user.id,
        }),
      });

      if (!generateResponse.ok) {
        throw new Error("Failed to generate lesson");
      }

      const { lessonId } = await generateResponse.json();

      toast.success("Lesson created! Choose your learning mode...");
      
      // Navigate to lesson view - user will select mode there
      router.push(`/lesson/${lessonId}`);
    } catch (error) {
      console.error("Error creating lesson:", error);
      toast.error("Failed to create lesson. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* Subscription Modal */}
      <SubscriptionModal 
        open={showSubscriptionModal} 
        onOpenChange={setShowSubscriptionModal}
        feature="lesson creation"
      />
      
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard")}
            className="mb-8 hover:bg-muted"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>

        <div className="mb-10">
          <h1 className="text-5xl font-bold mb-3 text-foreground">
            Create New Lesson
          </h1>
          <p className="text-muted-foreground text-xl">
            Add your learning material and choose your AI professor. We'll generate the rest!
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Card className="p-10 bg-card border-border space-y-7 rounded-2xl">
            {/* Lesson Content */}
            <div className="space-y-3">
              <Label htmlFor="content" className="text-base font-medium">Lesson Content *</Label>
              
              {/* File Upload Option */}
              <div className="flex items-center gap-4 mb-2">
                <input
                  type="file"
                  id="file-upload"
                  accept=".pdf,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("file-upload")?.click()}
                  className="border-border hover:bg-muted rounded-xl"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload File (PDF/TXT)
                </Button>
                
                {uploadedFile && (
                  <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-xl">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm">{uploadedFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={removeFile}
                      className="h-6 w-6 hover:bg-background"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              <Textarea
                id="content"
                placeholder="Or paste your lesson material here... (notes, articles, study guides)"
                value={lessonData.content}
                onChange={(e) => setLessonData({ ...lessonData, content: e.target.value })}
                className="min-h-[240px] bg-muted border-border rounded-xl text-base px-4 py-3"
              />
              <p className="text-sm text-muted-foreground">
                Tip: The AI will analyze this content and create an interactive lesson
              </p>
            </div>

            {/* Personality & Voice */}
            <div className="space-y-3">
              <Label htmlFor="personality" className="text-base font-medium">AI Professor Voice & Personality</Label>
              <Select value={lessonData.personality} onValueChange={(value) => setLessonData({ ...lessonData, personality: value })}>
                <SelectTrigger className="bg-muted border-border rounded-xl h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="freeman" className="text-base">Morgan Freeman (Wise & Calm)</SelectItem>
                  <SelectItem value="snoop" className="text-base">Snoop Dogg (Cool & Laid-back)</SelectItem>
                  <SelectItem value="comedian" className="text-base">Comedian (Fun & Energetic)</SelectItem>
                  <SelectItem value="mentor" className="text-base">Classic Mentor (Professional)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit"
              size="lg"
              disabled={isGenerating}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground transition-colors rounded-2xl py-7 text-lg font-semibold shadow-lg mt-4 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <div className="mr-3 h-6 w-6 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Generating Lesson...
                </>
              ) : (
                <>
                  <Sparkles className="mr-3 h-6 w-6" />
                  Start Learning Session
                </>
              )}
            </Button>
          </Card>
        </form>
        </div>
      </div>
    </>
  );
};

export default CreateLesson;

