import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const CreateLesson = () => {
  const navigate = useNavigate();
  const [lessonData, setLessonData] = useState({
    title: "",
    subject: "",
    content: "",
    voiceStyle: "freeman",
    humorLevel: "pg",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!lessonData.title || !lessonData.content) {
      toast.error("Please fill in all required fields");
      return;
    }

    // TODO: Save to Supabase and generate lesson outline
    toast.success("Lesson created! Starting your learning session...");
    
    // Navigate to lesson view with mock ID
    setTimeout(() => {
      navigate("/lesson/new");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-8 hover:bg-muted"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Create New Lesson
          </h1>
          <p className="text-muted-foreground text-lg">
            Add your learning material and choose your AI professor
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Card className="p-8 bg-card border-border space-y-6">
            {/* Lesson Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Lesson Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Introduction to Thermodynamics"
                value={lessonData.title}
                onChange={(e) => setLessonData({ ...lessonData, title: e.target.value })}
                className="bg-muted border-border"
              />
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="e.g., Physics, History, Mathematics"
                value={lessonData.subject}
                onChange={(e) => setLessonData({ ...lessonData, subject: e.target.value })}
                className="bg-muted border-border"
              />
            </div>

            {/* Lesson Content */}
            <div className="space-y-2">
              <Label htmlFor="content">Lesson Content *</Label>
              <Textarea
                id="content"
                placeholder="Paste your lesson material here... (notes, articles, study guides)"
                value={lessonData.content}
                onChange={(e) => setLessonData({ ...lessonData, content: e.target.value })}
                className="min-h-[200px] bg-muted border-border"
              />
              <p className="text-xs text-muted-foreground">
                Tip: The AI will analyze this content and create an interactive lesson
              </p>
            </div>

            {/* Voice Style */}
            <div className="space-y-2">
              <Label htmlFor="voice">AI Professor Voice</Label>
              <Select value={lessonData.voiceStyle} onValueChange={(value) => setLessonData({ ...lessonData, voiceStyle: value })}>
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="freeman">Freeman-style (Wise & Calm)</SelectItem>
                  <SelectItem value="snoop">Snoop-style (Cool & Laid-back)</SelectItem>
                  <SelectItem value="comedian">Comedian (Fun & Energetic)</SelectItem>
                  <SelectItem value="mentor">Classic Mentor (Professional)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Humor Level */}
            <div className="space-y-2">
              <Label htmlFor="humor">Humor Level</Label>
              <Select value={lessonData.humorLevel} onValueChange={(value) => setLessonData({ ...lessonData, humorLevel: value })}>
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pg">PG - Keep it clean</SelectItem>
                  <SelectItem value="pg13">PG-13 - Some edge</SelectItem>
                  <SelectItem value="r">R - Unfiltered</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit"
              size="lg"
              className="w-full bg-gradient-primary hover:opacity-90 transition-opacity rounded-full py-6 text-lg font-medium shadow-glow"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Start Learning Session
            </Button>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default CreateLesson;
