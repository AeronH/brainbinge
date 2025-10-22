import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Mic, Send, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const LessonView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isMuted, setIsMuted] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      content: "Hey there! I'm your AI professor for today. I've reviewed your lesson material on thermodynamics, and I gotta say, this is some fascinating stuff. Let's break it down together. Ready to dive in?",
      timestamp: new Date(),
    },
  ]);

  const lessonOutline = {
    title: "Introduction to Thermodynamics",
    sections: [
      {
        title: "Overview",
        points: [
          "What is thermodynamics?",
          "The study of energy, heat, and work",
          "Applications in daily life",
        ],
      },
      {
        title: "The Four Laws",
        points: [
          "Zeroth Law - Thermal Equilibrium",
          "First Law - Energy Conservation",
          "Second Law - Entropy",
          "Third Law - Absolute Zero",
        ],
      },
      {
        title: "Key Concepts",
        points: [
          "Heat transfer mechanisms",
          "Temperature vs. thermal energy",
          "System vs. surroundings",
        ],
      },
    ],
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const newMessage: Message = {
      id: messages.length + 1,
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setInputMessage("");

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: messages.length + 2,
        role: "assistant",
        content: "Great question! Let me break that down for you. In thermodynamics, understanding the flow of energy is crucial...",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="hover:bg-muted"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Exit Lesson
          </Button>
          
          <div className="flex items-center gap-4">
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
      </div>

      {/* Main Content - Dual Panel */}
      <div className="flex-1 flex overflow-hidden">
        <div className="max-w-7xl mx-auto w-full flex gap-6 p-6">
          {/* Left Panel - Lesson Overview */}
          <Card className="w-2/5 bg-card border-border p-6 overflow-hidden flex flex-col">
            <h2 className="text-2xl font-bold mb-6">{lessonOutline.title}</h2>
            <ScrollArea className="flex-1">
              <div className="space-y-6 pr-4">
                {lessonOutline.sections.map((section, idx) => (
                  <div key={idx}>
                    <h3 className="font-semibold text-lg mb-3 text-primary">{section.title}</h3>
                    <ul className="space-y-2">
                      {section.points.map((point, pointIdx) => (
                        <li key={pointIdx} className="flex items-start gap-2 text-muted-foreground">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Right Panel - Chat Interface */}
          <Card className="flex-1 bg-card border-border flex flex-col">
            {/* Messages Area */}
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl p-4 ${
                        message.role === "user"
                          ? "bg-gradient-primary text-primary-foreground shadow-glow"
                          : "bg-muted"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <Mic className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">
                            AI Professor
                          </span>
                        </div>
                      )}
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <span className="text-xs opacity-70 mt-2 block">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t border-border p-4">
              <div className="flex gap-3">
                <Input
                  placeholder="Ask a question or respond to your professor..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  className="bg-muted border-border"
                />
                <Button
                  onClick={handleSendMessage}
                  className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow rounded-full px-6"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LessonView;
