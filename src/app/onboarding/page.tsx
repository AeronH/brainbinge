"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, ChevronRight, User, Sparkles, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    name: "",
    goal: "",
    voicePreference: "freeman",
    humorLevel: "pg",
  });

  const totalSteps = 3;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Complete onboarding and go to dashboard
      router.push("/dashboard");
    }
  };

  const handleSkip = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <div className="w-12 h-12 rounded-xl bg-blue flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <span className="text-3xl font-bold text-foreground">BrainBinge</span>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">
              Step {step} of {totalSteps}
            </span>
            <button 
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip
            </button>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <Card className="p-10 bg-card border-border rounded-2xl">
          {step === 1 && (
            <div className="space-y-8">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-blue/20 flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-blue" />
                </div>
                <h2 className="text-3xl font-bold text-foreground">Welcome! Let's get to know you</h2>
                <p className="text-lg text-muted-foreground">Help us personalize your learning experience</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-base font-medium">What's your name?</Label>
                  <Input
                    id="name"
                    placeholder="Enter your name"
                    value={data.name}
                    onChange={(e) => setData({ ...data, name: e.target.value })}
                    className="bg-muted border-border rounded-xl h-12 text-base px-4"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="goal" className="text-base font-medium">What do you want to learn?</Label>
                  <Input
                    id="goal"
                    placeholder="e.g., Physics, Programming, History..."
                    value={data.goal}
                    onChange={(e) => setData({ ...data, goal: e.target.value })}
                    className="bg-muted border-border rounded-xl h-12 text-base px-4"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-pink/20 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-pink" />
                </div>
                <h2 className="text-3xl font-bold text-foreground">Choose Your AI Professor</h2>
                <p className="text-lg text-muted-foreground">Pick a teaching style that resonates with you</p>
              </div>

              <RadioGroup 
                value={data.voicePreference} 
                onValueChange={(value) => setData({ ...data, voicePreference: value })}
                className="space-y-3"
              >
                {[
                  { value: "freeman", label: "Freeman-style", desc: "Wise, calm, and authoritative" },
                  { value: "snoop", label: "Snoop-style", desc: "Cool, laid-back, and engaging" },
                  { value: "comedian", label: "Comedian", desc: "Fun, energetic, and entertaining" },
                  { value: "mentor", label: "Classic Mentor", desc: "Professional and encouraging" },
                ].map((option) => (
                  <Card 
                    key={option.value}
                    className={`p-5 cursor-pointer transition-all ${
                      data.voicePreference === option.value 
                        ? "border-blue bg-blue/5" 
                        : "border-border hover:border-blue/30"
                    }`}
                    onClick={() => setData({ ...data, voicePreference: option.value })}
                  >
                    <div className="flex items-start gap-4">
                      <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor={option.value} className="text-base font-semibold cursor-pointer">
                          {option.label}
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">{option.desc}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-green/20 flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-green" />
                </div>
                <h2 className="text-3xl font-bold text-foreground">Set Your Preferences</h2>
                <p className="text-lg text-muted-foreground">Customize how you want to learn</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base font-medium">Humor Level</Label>
                  <RadioGroup 
                    value={data.humorLevel} 
                    onValueChange={(value) => setData({ ...data, humorLevel: value })}
                    className="space-y-3"
                  >
                    {[
                      { value: "pg", label: "PG - Keep it clean", desc: "Family-friendly content" },
                      { value: "pg13", label: "PG-13 - Some edge", desc: "Balanced with light humor" },
                      { value: "r", label: "R - Unfiltered", desc: "Full personality, no filters" },
                    ].map((option) => (
                      <Card 
                        key={option.value}
                        className={`p-5 cursor-pointer transition-all ${
                          data.humorLevel === option.value 
                            ? "border-blue bg-blue/5" 
                            : "border-border hover:border-blue/30"
                        }`}
                        onClick={() => setData({ ...data, humorLevel: option.value })}
                      >
                        <div className="flex items-start gap-4">
                          <RadioGroupItem value={option.value} id={`humor-${option.value}`} className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor={`humor-${option.value}`} className="text-base font-semibold cursor-pointer">
                              {option.label}
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">{option.desc}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-10 pt-8 border-t border-border">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="rounded-xl px-6 py-5 text-base"
              >
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              className={`bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-8 py-5 text-base font-semibold shadow-lg ${
                step === 1 ? "w-full" : "ml-auto"
              }`}
            >
              {step === totalSteps ? "Complete Setup" : "Continue"}
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

