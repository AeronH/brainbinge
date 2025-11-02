"use client";

import { Card } from "@/components/ui/card";
import { Podcast } from "lucide-react";

export default function PodcastsPage() {
  return (
    <main className="p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-bold mb-3 text-foreground">
          Podcasts
        </h1>
        <p className="text-muted-foreground text-xl mb-12">
          Combine multiple lessons into voice-acted podcasts
        </p>
        <Card className="p-16 bg-card border-border text-center rounded-2xl">
          <div className="w-20 h-20 rounded-2xl bg-pink/20 flex items-center justify-center mx-auto mb-6">
            <Podcast className="w-10 h-10 text-pink" />
          </div>
          <p className="text-muted-foreground text-lg">No podcasts yet. Create lessons first, then combine them into podcasts!</p>
        </Card>
      </div>
    </main>
  );
}
