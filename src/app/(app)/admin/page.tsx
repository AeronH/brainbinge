"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Radio, CheckCircle, XCircle, Loader2, Search, Play } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

export default function AdminPage() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [voices, setVoices] = useState<any[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleSeedPreviews = async () => {
    try {
      setIsSeeding(true);
      setResults(null);

      const response = await fetch("/api/cartesia/previews/seed", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data);
        toast.success("Voice previews seeded successfully!");
      } else {
        throw new Error(data.error || "Failed to seed previews");
      }
    } catch (error) {
      console.error("Error seeding previews:", error);
      toast.error(error instanceof Error ? error.message : "Failed to seed previews");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleFetchVoices = async () => {
    try {
      setIsLoadingVoices(true);
      const response = await fetch("/api/speechify/voices/fetch-all");
      
      if (!response.ok) {
        throw new Error("Failed to fetch voices");
      }

      const data = await response.json();
      setVoices(data.formatted || []);
      toast.success(`Loaded ${data.formatted?.length || 0} voices`);
    } catch (error) {
      console.error("Error fetching voices:", error);
      toast.error("Failed to fetch voices");
    } finally {
      setIsLoadingVoices(false);
    }
  };

  const filteredVoices = voices.filter((voice) =>
    voice.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voice.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voice.tags?.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Tools</h1>
            <p className="text-muted-foreground">Manage podcast voice previews</p>
          </div>
        </div>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#10B981] to-[#34D399] flex items-center justify-center flex-shrink-0">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground mb-2">
                Seed Voice Previews
              </h2>
              <p className="text-muted-foreground mb-4">
                Generate and store audio previews for all podcast voices. This only needs to be done once, 
                or when you add new voices. Already generated previews will be skipped.
              </p>
              
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-sm mb-2">What this does:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Generates 6 voice preview audio files using Cartesia</li>
                  <li>✓ Uploads them to the <code className="bg-background px-1 rounded">podcast-audio</code> bucket</li>
                  <li>✓ Saves URLs in the <code className="bg-background px-1 rounded">voice_previews</code> table</li>
                  <li>✓ Takes about 30-60 seconds to complete</li>
                </ul>
              </div>

              <Button
                onClick={handleSeedPreviews}
                disabled={isSeeding}
                className="bg-gradient-to-r from-[#10B981] to-[#34D399] hover:from-[#0EA574] hover:to-[#2EC990] text-white"
              >
                {isSeeding ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Previews...
                  </>
                ) : (
                  <>
                    <Radio className="w-4 h-4 mr-2" />
                    Generate Voice Previews
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {results && (
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-bold text-foreground mb-4">Results</h3>
            <p className="text-sm text-muted-foreground mb-4">{results.message}</p>
            
            <div className="space-y-2">
              {results.results?.map((result: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    {result.status === "success" ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : result.status === "skipped" ? (
                      <CheckCircle className="w-5 h-5 text-yellow-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium text-sm">
                        {result.voiceName || result.voiceId}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {result.message || result.status}
                        {result.error && ` - ${result.error}`}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`text-xs font-semibold px-2 py-1 rounded ${
                      result.status === "success"
                        ? "bg-green-500/20 text-green-500"
                        : result.status === "skipped"
                        ? "bg-yellow-500/20 text-yellow-500"
                        : "bg-red-500/20 text-red-500"
                    }`}
                  >
                    {result.status}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-6 bg-card border-border">
          <h3 className="text-lg font-bold text-foreground mb-2">
            Prerequisites
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Before running this, make sure you have:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Created the <code className="bg-muted px-1 rounded">podcast-audio</code> storage bucket in Supabase</li>
              <li>Set <code className="bg-muted px-1 rounded">CARTESIA_API_KEY</code> in your environment variables</li>
              <li>You are logged in to the app</li>
            </ul>
          </div>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            💡 <strong>Tip:</strong> You only need to run this once. If you add new voices to the presets,
            run it again to generate their previews.
          </p>
        </div>

        {/* Voice Browser */}
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Browse Speechify Voices
              </h2>
              <p className="text-sm text-muted-foreground">
                Find voice IDs to add to podcast presets
              </p>
            </div>
            <Button
              onClick={handleFetchVoices}
              disabled={isLoadingVoices}
              variant="outline"
            >
              {isLoadingVoices ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Fetch All Voices
                </>
              )}
            </Button>
          </div>

          {voices.length > 0 && (
            <>
              <div className="mb-4">
                <Input
                  placeholder="Search voices by name, ID, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-background"
                />
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {filteredVoices.map((voice) => (
                    <div
                      key={voice.id}
                      className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-foreground">
                              {voice.name}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              voice.gender === "male" 
                                ? "bg-blue-500/20 text-blue-400"
                                : voice.gender === "female"
                                ? "bg-pink-500/20 text-pink-400"
                                : "bg-gray-500/20 text-gray-400"
                            }`}>
                              {voice.gender}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                              {voice.type}
                            </span>
                          </div>
                          <code className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">
                            {voice.id}
                          </code>
                          {voice.tags && voice.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {voice.tags.map((tag: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {voice.preview && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const audio = new Audio(voice.preview);
                              audio.play();
                            }}
                          >
                            <Play className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  💡 Found {filteredVoices.length} voices. Copy the voice IDs you like and 
                  update <code className="bg-background px-1 rounded">src/lib/podcast-voices.ts</code>
                </p>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

