import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { sessionId, lessonId, question, highlightedText } = await request.json();

    if (!sessionId || !lessonId || !question) {
      return NextResponse.json(
        { error: "Session ID, Lesson ID, and question are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch lesson data
    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", lessonId)
      .eq("user_id", user.id)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Fetch recent messages for context (last 10 messages)
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(10);

    const conversationHistory = messages
      ?.reverse()
      .map(m => `${m.role === "user" ? "Student" : "Professor"}: ${m.content}`)
      .join("\n\n") || "";

    // Get voice style for personality
    const voiceStyle = lesson.voice_style || "mentor";
    const outline = lesson.outline as any;

    // Build system prompt with lesson context
    let systemPrompt = `You are an AI professor teaching "${lesson.title}".

Voice style: ${voiceStyle}
- freeman: Wise, calm, thoughtful like Morgan Freeman. Use measured, profound language.
- snoop: Cool, laid-back, casual like Snoop Dogg. Keep it chill and approachable.
- comedian: Energetic, funny, entertaining. Make learning fun with humor.
- mentor: Professional, encouraging, supportive. Clear and patient teaching style.

Lesson outline:
${JSON.stringify(outline?.sections || [], null, 2)}

Previous conversation:
${conversationHistory || "No previous conversation"}

The student is in free Q&A mode asking questions about the lesson material.`;

    // Add highlighted text context if provided
    if (highlightedText) {
      systemPrompt += `\n\nThe student is specifically asking about this part of the lesson:
"${highlightedText}"

Make sure to reference this specific content in your answer.`;
    }

    systemPrompt += `\n\nAnswer the student's question:
- Be conversational and maintain your personality
- Be concise but thorough (100-200 words)
- Use examples if they help clarify
- Reference the lesson outline when relevant
- Be encouraging and supportive
- If the question is unclear, ask for clarification`;

    // Generate answer using GPT
    const answerCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: question,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const answerContent = answerCompletion.choices[0].message.content || "";

    // Save answer message (text only, no audio for Q&A mode)
    const { data: answerMessage, error: messageError } = await supabase
      .from("messages")
      .insert({
        session_id: sessionId,
        role: "assistant",
        content: answerContent,
        metadata: {
          isQAMode: true,
          highlightedText: highlightedText || null,
        },
      })
      .select()
      .single();

    if (messageError) {
      console.error("Message creation error:", messageError);
      throw new Error(`Failed to create answer message: ${messageError.message || JSON.stringify(messageError)}`);
    }

    return NextResponse.json({
      message: answerMessage,
    });
  } catch (error) {
    console.error("Error in Q&A:", error);
    return NextResponse.json(
      { error: "Failed to answer question" },
      { status: 500 }
    );
  }
}


