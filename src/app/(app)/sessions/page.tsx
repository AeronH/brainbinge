"use client";

import { Card } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

export default function SessionsPage() {
  return (
    <main className="p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-5xl font-bold mb-3 text-foreground">
            Sessions
          </h1>
          <p className="text-muted-foreground text-xl mb-12">
            Review and replay your past learning sessions
          </p>
          <Card className="p-16 bg-card border-border text-center rounded-2xl">
            <div className="w-20 h-20 rounded-2xl bg-green/20 flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-green" />
            </div>
            <p className="text-muted-foreground text-lg">No saved sessions yet. Create your first lesson to get started!</p>
          </Card>
        </div>
      </main>
  );
}
