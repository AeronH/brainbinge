import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkSubscription } from "@/lib/subscription";
import { inngest } from "@/lib/inngest/client";

export async function POST(request: NextRequest) {
  try {
    const { lessonId } = await request.json();

    if (!lessonId) {
      return NextResponse.json(
        { error: "Lesson ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check subscription requirement for flashcard generation
    const { isSubscribed } = await checkSubscription(user.id);
    if (!isSubscribed) {
      return NextResponse.json(
        { error: "SUBSCRIPTION_REQUIRED", message: "Flashcard generation requires a subscription. Upgrade to unlock flashcards." },
        { status: 403 }
      );
    }

    // Check if flashcards already exist for this lesson
    const { data: existingFlashcards, error: checkError } = await supabase
      .from("flashcards")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("order_index", { ascending: true });

    if (checkError) {
      console.error("Error checking existing flashcards:", checkError);
      throw new Error(`Failed to check flashcards: ${checkError.message}`);
    }

    // If flashcards already exist, return them
    if (existingFlashcards && existingFlashcards.length > 0) {
      return NextResponse.json({
        flashcards: existingFlashcards,
        generated: false,
      });
    }

    // Fetch the lesson to verify ownership
    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("user_id, flashcard_status")
      .eq("id", lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      );
    }

    // Verify user owns this lesson
    if ((lesson as any).user_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Check if already generating
    if ((lesson as any).flashcard_status === 'generating') {
      return NextResponse.json({
        generating: true,
        status: 'generating',
      });
    }

    // Trigger Inngest event for flashcard generation
    console.log(`[API] Triggering Inngest function for flashcard generation: ${lessonId}`);
    
    // Small delay to ensure database transaction is committed
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Trigger Inngest event (fire and forget)
    await inngest.send({
      name: 'flashcard/generate',
      data: { lessonId },
    });
    
    console.log('[API] Inngest event sent successfully');
    
    // Return immediately
    return NextResponse.json({
      success: true,
      generating: true,
      status: 'generating',
    });
  } catch (error) {
    console.error("Error generating flashcards:", error);
    return NextResponse.json(
      { error: "Failed to generate flashcards" },
      { status: 500 }
    );
  }
}
