"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  BookOpen, 
  Mic, 
  Sparkles, 
  Zap, 
  Upload,
  MessageSquare,
  Headphones,
  Clock,
  Check,
  X,
  Play,
  ChevronDown,
  GraduationCap,
  Target,
  FileText,
  Star
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LandingPage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const howItWorks = [
    {
      number: "1",
      title: "Upload Your Material",
      description: "Drop in lecture slides, textbook chapters, or class notes. BrainBinge structures it into a clear, organized lesson outline.",
      icon: Upload,
    },
    {
      number: "2",
      title: "Choose Your Voice",
      description: "Pick a voice personality for audio features. From serious mentors to fun characters—makes studying less boring.",
      icon: Mic,
    },
    {
      number: "3",
      title: "Study Your Way",
      description: "Quiz yourself, flip through flashcards, fill-in-the-blanks, or listen as a podcast. Multiple ways to learn the same material.",
      icon: MessageSquare,
    },
    {
      number: "4",
      title: "Track Your Progress",
      description: "Every session saves automatically. Review before exams, check your quiz scores, or replay audio lessons anytime.",
      icon: GraduationCap,
    },
  ];

  const useCases = [
    {
      icon: Target,
      title: "Ace Your Exams",
      description: "Turn messy lecture notes into organized lessons. Test yourself with quizzes, drill with flashcards, and review weak spots before exam day.",
      gradient: "from-blue/20 to-pink/20",
    },
    {
      icon: FileText,
      title: "Actually Remember Stuff",
      description: "Stop re-reading the same pages. Use flashcards for memorization, fill-in-blanks for recall, and quizzes to find gaps in your knowledge.",
      gradient: "from-pink/20 to-purple/20",
    },
    {
      icon: Zap,
      title: "Study While Multitasking",
      description: "Convert any lesson into an audio podcast. Review material during your commute, at the gym, or while doing chores—no reading required.",
      gradient: "from-purple/20 to-blue/20",
    },
  ];

  const comparisonData = [
    {
      feature: "Organization",
      traditional: "Messy notes scattered everywhere",
      BrainBinge: "Structured lessons from any material",
    },
    {
      feature: "Study Methods",
      traditional: "Just re-reading the same content",
      BrainBinge: "Quizzes, flashcards, audio, fill-in-blanks",
    },
    {
      feature: "Flexibility",
      traditional: "Need to sit at a desk with materials",
      BrainBinge: "Study anywhere with audio podcasts",
    },
    {
      feature: "Testing Yourself",
      traditional: "Hope you remember on exam day",
      BrainBinge: "Quiz yourself anytime, track progress",
    },
    {
      feature: "Time Wasted",
      traditional: "Commutes and gym time = wasted",
      BrainBinge: "Turn any downtime into study time",
    },
  ];

  const faqs = [
    {
      question: "What exactly is BrainBinge?",
      answer: "BrainBinge transforms your messy study materials into organized lessons, then lets you study them multiple ways. Upload notes or textbooks, and instantly get quizzes, flashcards, fill-in-the-blank exercises, and audio podcasts—all from the same content.",
    },
    {
      question: "What study modes are available?",
      answer: "Five modes: (1) Learn - read the organized lesson outline, (2) Quiz - test yourself with multiple choice, (3) Flashcards - flip through key concepts, (4) Fill in Blanks - practice recall, (5) Podcast - listen to audio versions of your lessons.",
    },
    {
      question: "What are the voice personalities for?",
      answer: "When you create audio podcasts from your lessons, you can choose different narrator voices—serious mentors, casual teachers, or fun personalities. Makes listening to study material less boring.",
    },
    {
      question: "What subjects does this work for?",
      answer: "Any subject with text-based material—biology, chemistry, history, psychology, business, law, coding, languages, and more. If you can paste it or upload it, BrainBinge can organize and quiz you on it.",
    },
    {
      question: "Is there a free version?",
      answer: "Yes! Start with our free plan to try BrainBinge and see if it works for your study style. For unlimited lessons and full access to all modes, upgrade to a paid plan anytime.",
    },
    {
      question: "Can I review old lessons?",
      answer: "Every lesson and session saves automatically to your library. Go back before exams to retake quizzes, review flashcards, or listen to podcast versions anytime.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue to-purple flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-foreground">BrainBinge</span>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <Button 
              variant="ghost"
              onClick={() => router.push("/dashboard")}
              className="rounded-2xl px-4 md:px-6 py-5 text-sm md:text-base font-semibold"
            >
              Sign In
            </Button>
            <Button 
              onClick={() => router.push("/dashboard")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl px-4 md:px-6 py-5 text-sm md:text-base font-semibold shadow-lg"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left: Text Content */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue/20 to-purple/20 border border-blue/30 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-blue" />
              <span className="text-foreground">For Students Who Want To Actually Understand</span>
            </div>

            {/* Rating with Stars */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow text-yellow" />
                ))}
              </div>
              <div className="flex items-center -space-x-2">
                {[
                  { src: "/avatars/person-1.jpg", alt: "Student 1" },
                  { src: "/avatars/person-2.jpg", alt: "Student 2" },
                  { src: "/avatars/person-3.jpg", alt: "Student 3" },
                  { src: "/avatars/person-4.jpg", alt: "Student 4" }
                ].map((person, i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full border-2 border-background overflow-hidden bg-gradient-to-br from-blue to-purple flex-shrink-0"
                  >
                    <img 
                      src={person.src} 
                      alt={person.alt} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to gradient if image doesn't exist
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        if (target.parentElement) {
                          target.parentElement.className = "w-10 h-10 rounded-full border-2 border-background bg-gradient-to-br from-blue to-purple flex-shrink-0";
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-foreground">4.9</span>
                <span className="text-sm text-muted-foreground">/ 5.0</span>
                <span className="text-sm text-muted-foreground">from 2,500+ students</span>
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              Actually Remember
              <span className="block mt-1 bg-gradient-to-r from-blue via-pink to-purple bg-clip-text text-transparent">
                What You Study
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              Stop re-reading the same material over and over. Upload once, then quiz yourself, 
              drill flashcards, and listen on-the-go. Study smarter, ace exams, actually retain it.
            </p>
            
            <div className="pt-4">
              <Button 
                size="lg"
                onClick={() => router.push("/dashboard")}
                className="bg-gradient-to-r from-blue to-purple hover:from-blue/90 hover:to-purple/90 text-white rounded-2xl px-10 py-7 text-lg font-bold shadow-2xl transition-all hover:scale-105 w-full sm:w-auto"
              >
                <Play className="mr-2 h-5 w-5" />
                Start Learning Free
              </Button>
            </div>
          </div>

          {/* Right: Demo/Preview */}
          <div className="lg:pl-8">
            <Card className="bg-card border-border rounded-2xl p-6 shadow-2xl overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-blue/10 via-purple/10 to-pink/10 rounded-xl flex items-center justify-center relative">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
                <div className="text-center relative z-10 px-4">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-gradient-to-br from-blue to-purple flex items-center justify-center">
                    <Headphones className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-muted-foreground text-base font-medium">5 Ways To Study The Same Material</p>
                  <p className="text-xs text-muted-foreground mt-1.5">Quizzes • Flashcards • Audio • Fill-in-Blanks • Lessons</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="max-w-7xl mx-auto px-6 md:px-8 py-8 md:py-12">
        <div className="text-center">
          <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-4">
            Trusted by students at leading universities
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 opacity-50">
            {["Harvard", "MIT", "Stanford", "Yale", "Berkeley", "Oxford"].map((university) => (
              <div key={university} className="text-muted-foreground font-semibold text-sm md:text-base">
                {university}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Decorative Divider */}
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-8">
        <div className="flex items-center justify-center gap-2 text-muted-foreground/30">
          {Array(20).fill(null).map((_, i) => (
            <span key={i}>✦</span>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From upload to mastery in four simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {howItWorks.map((step, idx) => (
            <div key={idx} className="relative">
              <Card className="p-6 bg-card border-border rounded-xl h-full hover:border-blue/30 transition-all">
                <div className="flex flex-col items-start h-full">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue to-purple flex items-center justify-center text-white font-bold text-lg mb-3">
                    {step.number}
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue/10 flex items-center justify-center mb-3">
                    <step.icon className="w-6 h-6 text-blue" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </Card>
              {idx < howItWorks.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 text-muted-foreground/30 text-sm">
                  →
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Button 
            size="lg"
            onClick={() => router.push("/dashboard")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl px-8 py-5 text-base font-semibold shadow-lg"
          >
            Try It Now - It's Free
          </Button>
        </div>
      </section>

      {/* Decorative Divider */}
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-8">
        <div className="flex items-center justify-center gap-2 text-muted-foreground/30">
          {Array(20).fill(null).map((_, i) => (
            <span key={i}>✦</span>
          ))}
        </div>
      </div>

      {/* Use Cases */}
      <section className="max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            How Students Use BrainBinge
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real ways to make studying more effective
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {useCases.map((useCase, idx) => (
            <Card key={idx} className={`p-6 bg-gradient-to-br ${useCase.gradient} border-border rounded-xl hover:scale-105 transition-all`}>
              <div className="w-12 h-12 rounded-xl bg-background/50 backdrop-blur flex items-center justify-center mb-4">
                <useCase.icon className="w-6 h-6 text-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{useCase.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{useCase.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Decorative Divider */}
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-8">
        <div className="flex items-center justify-center gap-2 text-muted-foreground/30">
          {Array(20).fill(null).map((_, i) => (
            <span key={i}>✦</span>
          ))}
        </div>
      </div>

      {/* Testimonials Section */}
      <section className="max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            What Students Are Saying
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real feedback from students using BrainBinge to ace their exams
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              name: "Sarah Chen",
              university: "MIT",
              major: "Computer Science",
              rating: 5,
              text: "Game changer! I went from barely passing to getting A's. The quiz mode especially helped me identify weak spots before exams. Best study tool I've ever used.",
              avatar: "SC"
            },
            {
              name: "Marcus Rodriguez",
              university: "Stanford",
              major: "Pre-Med",
              rating: 5,
              text: "The audio podcast feature saved me. I listen to my bio notes during my commute and at the gym. Actually retained way more than just re-reading.",
              avatar: "MR"
            },
            {
              name: "Emily Kim",
              university: "Harvard",
              major: "History",
              rating: 5,
              text: "Flashcards mode is incredible for memorizing dates and names. Combined with quizzes, I aced my final. Wish I found this earlier in the semester!",
              avatar: "EK"
            },
            {
              name: "James Wilson",
              university: "UC Berkeley",
              major: "Business",
              rating: 5,
              text: "I used to spend hours organizing my notes. BrainBinge does it instantly and gives me multiple ways to study the same material. Huge time saver.",
              avatar: "JW"
            },
            {
              name: "Priya Patel",
              university: "Yale",
              major: "Psychology",
              rating: 5,
              text: "The fill-in-the-blank exercises are perfect for active recall. My professor even noticed how much better I was doing on pop quizzes!",
              avatar: "PP"
            },
            {
              name: "Alex Thompson",
              university: "Oxford",
              major: "Law",
              rating: 5,
              text: "Finally, a tool that actually helps you understand, not just memorize. The lesson overview is so well-structured, makes complex topics clear.",
              avatar: "AT"
            }
          ].map((testimonial, idx) => (
            <Card key={idx} className="p-6 bg-card border-border rounded-xl hover:border-blue/30 transition-all h-full flex flex-col">
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow text-yellow" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-1">
                "{testimonial.text}"
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue to-purple flex items-center justify-center text-white font-semibold text-sm">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.major} • {testimonial.university}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Decorative Divider */}
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-8">
        <div className="flex items-center justify-center gap-2 text-muted-foreground/30">
          {Array(20).fill(null).map((_, i) => (
            <span key={i}>✦</span>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <section className="max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Traditional Study vs. BrainBinge
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See how multi-modal studying beats plain reading
          </p>
        </div>

        <Card className="bg-card border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-base font-bold text-foreground">Feature</th>
                  <th className="text-center p-4 text-base font-bold text-muted-foreground">Traditional Learning</th>
                  <th className="text-center p-4 text-base font-bold text-blue">BrainBinge</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, idx) => (
                  <tr key={idx} className="border-b border-border last:border-0">
                    <td className="p-4 font-semibold text-sm text-foreground">{row.feature}</td>
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <X className="w-4 h-4 text-red" />
                        <span className="text-xs text-muted-foreground">{row.traditional}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center bg-blue/5">
                      <div className="flex flex-col items-center gap-1.5">
                        <Check className="w-4 h-4 text-green" />
                        <span className="text-xs text-foreground font-medium">{row.BrainBinge}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="text-center mt-10">
          <Button 
            size="lg"
            onClick={() => router.push("/dashboard")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl px-8 py-5 text-base font-semibold shadow-lg"
          >
            Experience the Difference
          </Button>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-6 md:px-8 py-12 md:py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about BrainBinge
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <Card key={idx} className="bg-card border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-5 flex items-center justify-between text-left hover:bg-muted/5 transition-colors"
              >
                <span className="text-base font-semibold text-foreground pr-8">{faq.question}</span>
                <ChevronDown 
                  className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${
                    openFaq === idx ? "rotate-180" : ""
                  }`} 
                />
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
                  {faq.answer}
                </div>
              )}
            </Card>
          ))}
        </div>
      </section>

      {/* Decorative Divider */}
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-8">
        <div className="flex items-center justify-center gap-2 text-muted-foreground/30">
          {Array(20).fill(null).map((_, i) => (
            <span key={i}>✦</span>
          ))}
        </div>
      </div>

      {/* Final CTA */}
      <section className="max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-20">
        <Card className="bg-gradient-to-br from-blue/20 via-purple/20 to-pink/20 border-border rounded-2xl p-10 md:p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Stop Re-Reading. Start Understanding.
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Upload your study materials once. Get organized lessons, practice quizzes, flashcards, 
              and audio podcasts instantly. Study smarter, not harder.
            </p>
            <Button 
              size="lg"
              onClick={() => router.push("/dashboard")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl px-10 py-6 text-lg font-semibold shadow-2xl transition-all hover:scale-105"
            >
              Get Started for Free
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              No credit card required • Unlimited free trial
            </p>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 mt-16">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue to-purple flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">BrainBinge</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <button className="hover:text-foreground transition-colors">Privacy</button>
              <button className="hover:text-foreground transition-colors">Terms</button>
              <button className="hover:text-foreground transition-colors">Contact</button>
            </div>
            
            <p className="text-muted-foreground text-sm">© 2025 BrainBinge. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
