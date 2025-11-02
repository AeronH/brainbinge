import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkSubscription } from "@/lib/subscription";
import { inngest } from "@/lib/inngest/client";

export async function POST(request: NextRequest) {
  try {
    const { lessonId, title, questionTypes } = await request.json();

    if (!lessonId) {
      return NextResponse.json(
        { error: "Lesson ID is required" },
        { status: 400 }
      );
    }

    if (!questionTypes || !Array.isArray(questionTypes) || questionTypes.length === 0) {
      return NextResponse.json(
        { error: "questionTypes array is required and must not be empty" },
        { status: 400 }
      );
    }

    // Validate question types
    const validTypes = ['multiple_choice', 'true_false', 'fill_in_blank'];
    const invalidTypes = questionTypes.filter((type: string) => !validTypes.includes(type));
    if (invalidTypes.length > 0) {
      return NextResponse.json(
        { error: `Invalid question types: ${invalidTypes.join(', ')}` },
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

    // Check subscription requirement for quiz generation
    const { isSubscribed } = await checkSubscription(user.id);
    if (!isSubscribed) {
      return NextResponse.json(
        { error: "SUBSCRIPTION_REQUIRED", message: "Quiz generation requires a subscription. Upgrade to unlock quizzes." },
        { status: 403 }
      );
    }

    // Fetch the lesson to verify ownership
    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("user_id")
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

    // Create quiz record
    const quizTitle = title || `Quiz ${new Date().toLocaleDateString()}`;
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        lesson_id: lessonId,
        title: quizTitle,
        question_types: questionTypes,
        status: 'pending',
      })
      .select()
      .single();

    if (quizError || !quiz) {
      console.error("Error creating quiz:", quizError);
      return NextResponse.json(
        { error: "Failed to create quiz" },
        { status: 500 }
      );
    }

    // Trigger Inngest event for quiz generation
    console.log(`[API] Triggering Inngest function for quiz generation: ${quiz.id}`);
    
    // Small delay to ensure database transaction is committed
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Trigger Inngest event (fire and forget)
    await inngest.send({
      name: 'quiz/generate',
      data: { 
        quizId: quiz.id,
        lessonId,
        questionTypes,
      },
    });
    
    console.log('[API] Inngest event sent successfully');
    
    // Return immediately
    return NextResponse.json({
      success: true,
      quizId: quiz.id,
      generating: true,
      status: 'generating',
    });
  } catch (error) {
    console.error("Error generating quiz:", error);
    return NextResponse.json(
      { error: "Failed to generate quiz" },
      { status: 500 }
    );
  }
}
