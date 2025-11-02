"use client";

import { BookOpen, Brain, CreditCard, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export type LessonMode = "learn" | "quiz" | "flashcard" | "podcast";

interface LessonModeSidebarProps {
  currentMode: LessonMode;
  onModeChange: (mode: LessonMode) => void;
}

const modes = [
  {
    id: "learn" as LessonMode,
    label: "Learn",
    icon: BookOpen,
    description: "Interactive AI-guided lesson",
    color: "from-[#dc2626] to-[#ef4444]", // Red
    borderColor: "rgba(220, 38, 38, 0.3)",
    bgColor: "rgba(220, 38, 38, 0.1)",
  },
  {
    id: "quiz" as LessonMode,
    label: "Quiz",
    icon: Brain,
    description: "Test your knowledge",
    color: "from-[#F59E0B] to-[#F97316]", // Orange/Yellow
    borderColor: "rgba(245, 158, 11, 0.3)",
    bgColor: "rgba(245, 158, 11, 0.1)",
  },
  {
    id: "flashcard" as LessonMode,
    label: "Flashcard",
    icon: CreditCard,
    description: "Review key concepts",
    color: "from-[#9333EA] to-[#A855F7]", // Purple
    borderColor: "rgba(147, 51, 234, 0.3)",
    bgColor: "rgba(147, 51, 234, 0.1)",
  },
  {
    id: "podcast" as LessonMode,
    label: "Podcast",
    icon: Radio,
    description: "Listen & learn",
    color: "from-[#10B981] to-[#34D399]", // Green
    borderColor: "rgba(16, 185, 129, 0.3)",
    bgColor: "rgba(16, 185, 129, 0.1)",
  },
];

export default function LessonModeSidebar({
  currentMode,
  onModeChange,
}: LessonModeSidebarProps) {
  return (
    <div className="lesson-mode-sidebar fixed left-[200px] top-0 h-screen w-[220px] bg-[#14161C] border-r border-border z-40">
      <div className="flex flex-col h-full p-4">
        <div className="mb-6 pt-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
            Learning Modes
          </h3>
        </div>

        <nav className="flex flex-col gap-2">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isActive = currentMode === mode.id;

            return (
              <button
                key={mode.id}
                onClick={() => onModeChange(mode.id)}
                className={cn(
                  "lesson-mode-button flex items-start gap-3 p-3 rounded-xl transition-all duration-200 relative",
                  "hover:bg-white/5"
                )}
                style={
                  isActive
                    ? {
                        background: mode.bgColor,
                        border: `1px solid ${mode.borderColor}`,
                      }
                    : undefined
                }
              >
                {isActive && (
                  <div
                    className="absolute left-[-16px] top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
                    style={{
                      background: `linear-gradient(to bottom, ${mode.borderColor}, ${mode.borderColor})`,
                    }}
                  />
                )}
                <div
                  className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                    isActive
                      ? `bg-gradient-to-br ${mode.color}`
                      : "bg-white/5"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-colors",
                      isActive ? "text-white" : "text-muted-foreground"
                    )}
                  />
                </div>
                <div className="flex flex-col items-start text-left">
                  <span
                    className={cn(
                      "text-sm font-semibold transition-colors",
                      isActive ? "text-white" : "text-foreground"
                    )}
                  >
                    {mode.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {mode.description}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

