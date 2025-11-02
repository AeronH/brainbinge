import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { lessonId, personality, voiceId } = await request.json();

    if (!lessonId || !personality || !voiceId) {
      return NextResponse.json(
        { error: "Lesson ID, personality, and voice ID are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch lesson
    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", lessonId)
      .eq("user_id", user.id)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const outline = lesson.outline as any;
    const title = lesson.title;

    // Generate initial greeting based on selected personality
    const greetingCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an AI professor with a specific personality and teaching style. Generate an engaging introduction to a lesson.

Personality: ${personality}
- freeman: Wise, calm, thoughtful - like Morgan Freeman. Deep wisdom, measured pace, makes complex ideas feel profound yet accessible.
- snoop: Cool, laid-back, casual - like Snoop Dogg. Friendly, uses casual language, makes learning feel chill and fun.
- comedian: Energetic, funny, entertaining - like a stand-up comedian teaching. Uses humor to make points memorable.
- mentor: Professional, encouraging, supportive - classic teacher style. Clear, patient, builds confidence.

Keep the tone appropriate for all audiences - engaging but professional.

Your greeting should:
1. Introduce yourself briefly in character
2. Acknowledge the topic (${title})
3. Build excitement about what they'll learn
4. Ask if they're ready to start
5. Be 3-4 sentences max, conversational and engaging

Do NOT include any markdown formatting or special characters. Just plain text that sounds natural when spoken.`,
        },
        {
          role: "user",
          content: `Create an engaging introduction for this lesson: "${title}". The lesson covers: ${outline.summary}`,
        },
      ],
      temperature: 0.9,
    });

    const initialGreeting = greetingCompletion.choices[0].message.content;

    // Update lesson with voice_style
    const { error: updateError } = await supabase
      .from("lessons")
      .update({ voice_style: voiceId })
      .eq("id", lessonId);

    if (updateError) {
      console.error("Error updating lesson voice:", updateError);
      return NextResponse.json(
        { error: "Failed to update lesson voice" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      greeting: initialGreeting,
      voiceId,
      personality,
    });
  } catch (error) {
    console.error("Error setting voice:", error);
    return NextResponse.json(
      { error: "Failed to set voice" },
      { status: 500 }
    );
  }
}

