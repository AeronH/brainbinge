import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { inngest } from "@/lib/inngest/client";

/**
 * Generate podcast with audio for a lesson
 * This route creates a placeholder and triggers Inngest for generation
 */
export async function POST(request: NextRequest) {
  try {
    const { lessonId, tone, voice1, voice2 } = await request.json();

    console.log('[API] Received request:', { lessonId, tone, voice1, voice2 });
    console.log('[API] voice1 === voice2?', voice1 === voice2);

    if (!lessonId || !tone || !voice1 || !voice2) {
      return NextResponse.json(
        { error: "lessonId, tone, voice1, and voice2 are required" },
        { status: 400 }
      );
    }

    if (voice1 === voice2) {
      console.error('[API] ERROR: Same voice selected for both speakers!');
      return NextResponse.json(
        { error: "Please select two different voices" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user data to check podcast generation limit
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("podcast_generations_count, podcast_generations_reset_at")
      .eq("id", user.id)
      .single() as { 
        data: { podcast_generations_count: number; podcast_generations_reset_at: string } | null; 
        error: any 
      };

    if (userError || !userData) {
      console.error("Error fetching user data:", userError);
      return NextResponse.json({ error: "Failed to fetch user data" }, { status: 500 });
    }

    // Check if we need to reset the counter (new month)
    const now = new Date();
    const resetDate = new Date(userData.podcast_generations_reset_at);
    let currentCount = userData.podcast_generations_count;

    if (now >= resetDate) {
      // Reset counter for new month
      currentCount = 0;
      const nextResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      
      await supabase
        .from("users")
        // @ts-ignore - Supabase type inference issue with update
        .update({
          podcast_generations_count: 0,
          podcast_generations_reset_at: nextResetDate.toISOString(),
        })
        .eq("id", user.id);
    }

    // Check if user has reached the limit (10 per month)
    const MONTHLY_LIMIT = 10;
    if (currentCount >= MONTHLY_LIMIT) {
      return NextResponse.json(
        { 
          error: "Monthly podcast generation limit reached",
          limit: MONTHLY_LIMIT,
          resetAt: resetDate.toISOString(),
        },
        { status: 429 }
      );
    }

    // Fetch lesson
    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", lessonId)
      .eq("user_id", user.id)
      .single() as {
        data: Database['public']['Tables']['lessons']['Row'] | null;
        error: any;
      };

    if (lessonError || !lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Check if podcast already exists for this lesson
    const { data: existingPodcast } = await supabase
      .from("lesson_podcasts")
      .select("*")
      .eq("lesson_id", lessonId)
      .eq("user_id", user.id)
      .single() as {
        data: Database['public']['Tables']['lesson_podcasts']['Row'] | null;
        error: any;
      };

    // Create or update placeholder podcast record immediately
    const placeholderPodcast = {
      lesson_id: lessonId,
      user_id: user.id,
      tone,
      voice_1: voice1,
      voice_2: voice2,
      transcript: [] as any,
      status: 'generating',
      full_audio_url: null,
    };
    
    console.log('[API] Creating placeholder with voices:', { voice_1: voice1, voice_2: voice2 });

    let podcastId: string;
    if (existingPodcast) {
      // Update existing podcast to "generating" state
      const { data, error } = await supabase
        .from("lesson_podcasts")
        // @ts-ignore - Supabase type inference issue with update
        .update(placeholderPodcast)
        .eq("id", existingPodcast.id)
        .select()
        .single();

      if (error || !data) throw error || new Error("Failed to update podcast");
      podcastId = (data as any).id;
    } else {
      // Create new placeholder podcast
      const { data, error } = await supabase
        .from("lesson_podcasts")
        // @ts-ignore - Supabase type inference issue with insert
        .insert(placeholderPodcast)
        .select()
        .single();

      if (error || !data) throw error || new Error("Failed to create podcast");
      podcastId = (data as any).id;
    }

    // Trigger Inngest function for generation
    console.log(`[API] Triggering Inngest function for podcast ${podcastId}`);
    
    // Small delay to ensure database transaction is committed
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Trigger Inngest event (fire and forget)
    await inngest.send({
      name: 'podcast/generate',
      data: { podcastId },
    });
    
    console.log('[API] Inngest event sent successfully');
    
    // Return immediately
    return NextResponse.json({
      success: true,
      podcastId,
      generating: true,
    });
  } catch (error) {
    console.error("Error generating podcast:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate podcast",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
