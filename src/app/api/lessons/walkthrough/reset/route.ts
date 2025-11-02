import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSpeech } from "@/lib/speechify";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, lessonId } = await request.json();

    if (!sessionId || !lessonId) {
      return NextResponse.json(
        { error: "Session ID and Lesson ID are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify lesson ownership
    const { data: lesson } = await supabase
      .from("lessons")
      .select("id, title, voice_style, humor_level")
      .eq("id", lessonId)
      .eq("user_id", user.id)
      .single();

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Delete all messages and quiz questions for the current session
    await supabase
      .from("messages")
      .delete()
      .eq("session_id", sessionId);

    await supabase
      .from("walkthrough_quiz_questions")
      .delete()
      .eq("session_id", sessionId);

    // Create new session
    const { data: newSession, error: sessionError } = await supabase
      .from("sessions")
      .insert({
        lesson_id: lessonId,
        title: lesson.title,
        learning_mode: "walkthrough",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    // Create initial "Ready to start?" message
    const greeting = `Welcome back! Ready to go through "${lesson.title}" again? Let's dive in when you're ready!`;

    // Generate audio for greeting
    const voiceId = lesson.voice_style;
    let audioData = null;
    if (voiceId) {
      try {
        audioData = await generateSpeech(greeting, voiceId);
      } catch (error) {
        console.error("Error generating greeting audio:", error);
      }
    }

    const { data: initialMessage } = await supabase
      .from("messages")
      .insert({
        session_id: newSession.id,
        role: "assistant",
        content: greeting,
        metadata: { buttonType: "ready", blockNumber: 0, audioData },
      })
      .select()
      .single();

    return NextResponse.json({
      session: newSession,
      message: initialMessage,
    });
  } catch (error) {
    console.error("Error resetting walkthrough:", error);
    return NextResponse.json(
      { error: "Failed to reset walkthrough" },
      { status: 500 }
    );
  }
}


