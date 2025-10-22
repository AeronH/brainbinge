import { useState } from "react";
import { Plus, BookOpen, Mic, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const [recentSessions] = useState([
    { id: 1, title: "Introduction to Physics", subject: "Physics", date: "2 hours ago", voice: "Freeman-style" },
    { id: 2, title: "Ancient Rome History", subject: "History", date: "Yesterday", voice: "Snoop-style" },
    { id: 3, title: "Calculus Fundamentals", subject: "Mathematics", date: "2 days ago", voice: "Classic Mentor" },
  ]);

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
          Welcome to Learnly
        </h1>
        <p className="text-muted-foreground text-lg">
          Learn anything through interactive AI professors
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create New Lesson Card */}
        <Card className="lg:col-span-2 p-8 bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-glow">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center mb-6 shadow-glow">
              <Plus className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Create New Lesson</h2>
            <p className="text-muted-foreground text-center mb-8 max-w-md">
              Upload material or paste text to start learning with your AI professor
            </p>
            <Button 
              size="lg" 
              className="bg-gradient-primary hover:opacity-90 transition-opacity rounded-full px-8 py-6 text-lg font-medium shadow-glow"
              onClick={() => navigate("/create-lesson")}
            >
              <BookOpen className="mr-2 h-5 w-5" />
              Start Learning
            </Button>
          </div>
        </Card>

        {/* Quick Stats */}
        <div className="space-y-4">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-muted-foreground">Lessons Completed</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Mic className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold">8.5h</p>
                <p className="text-sm text-muted-foreground">Learning Time</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">5</p>
                <p className="text-sm text-muted-foreground">Day Streak</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="max-w-7xl mx-auto mt-12">
        <h2 className="text-2xl font-bold mb-6">Recent Sessions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentSessions.map((session) => (
            <Card 
              key={session.id} 
              className="p-6 bg-card border-border hover:border-primary/50 transition-all duration-300 cursor-pointer hover:shadow-glow"
              onClick={() => navigate(`/lesson/${session.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">{session.date}</span>
              </div>
              <h3 className="font-semibold mb-2 line-clamp-2">{session.title}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="px-2 py-1 rounded-full bg-muted text-xs">{session.subject}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Mic className="w-3 h-3" />
                  {session.voice}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
