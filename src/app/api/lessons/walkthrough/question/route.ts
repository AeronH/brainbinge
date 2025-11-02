import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { generateSpeechBuffer } from "@/lib/speechify";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Helper function to generate speech and upload to Supabase Storage
 * Returns the public URL of the uploaded audio file
 */
async function generateAndUploadAudio(
  content: string,
  voiceId: string,
  messageId: string,
  supabase: any
): Promise<string | null> {
  console.log("[TTS] Attempting to generate audio for message. VoiceId:", voiceId, "Content length:", content.length);
  
  if (!voiceId) {
    console.warn("[TTS] No voiceId provided, skipping audio generation");
    return null;
  }
  
  try {
    // Generate audio directly as Buffer (no base64 conversion)
    const audioBuffer = await generateSpeechBuffer(content, voiceId);
    console.log("[TTS] Successfully generated audio. Buffer size:", audioBuffer.length);
    
    // Upload to Supabase Storage
    const fileName = `message-audio/${messageId}.mp3`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('lesson-audio')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });
    
    if (uploadError) {
      console.error("[Storage] Upload error:", uploadError);
      return null;
    }
    
    console.log("[Storage] Audio uploaded successfully:", fileName);
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('lesson-audio')
      .getPublicUrl(fileName);
    
    console.log("[Storage] Public URL:", urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error("[TTS] Error generating/uploading audio:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, lessonId, question } = await request.json();

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

    // Fetch recent messages for context (last 5 assistant messages)
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .eq("session_id", sessionId)
      .eq("role", "assistant")
      .order("created_at", { ascending: false })
      .limit(5);

    const recentContext = messages
      ?.reverse()
      .map(m => m.content)
      .join("\n\n") || "No previous content";

    // Generate answer using GPT
    const voiceStyle = lesson.voice_style || "mentor";
    const outline = lesson.outline as any;

    const answerCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an AI professor teaching "${lesson.title}".

Voice style: ${voiceStyle}
- freeman: Wise, calm, thoughtful like Morgan Freeman
- snoop: Cool, laid-back, casual like Snoop Dogg
- comedian: Energetic, funny, entertaining
- mentor: Professional, encouraging, supportive

Lesson outline:
${JSON.stringify(outline?.sections || [], null, 2)}

Recent content covered:
${recentContext}

The student has paused to ask a question about the material. Answer their question:
CRITICAL: Keep it SHORT (50-75 words MAX). This will be converted to audio.
- Be concise and direct
- Maintain your voice style personality
- One brief example if needed
- Relate it to what was recently taught
- End with "Clear?"`,
        },
        {
          role: "user",
          content: question,
        },
      ],
      temperature: 0.7,
    });

    const answerContent = answerCompletion.choices[0].message.content || "";

    // Save answer message first to get ID
    const { data: answerMessage, error: messageError } = await supabase
      .from("messages")
      .insert({
        session_id: sessionId,
        role: "assistant",
        content: answerContent,
        metadata: {
          buttonType: "question_answered",
          isQuestionAnswer: true,
        },
      })
      .select()
      .single();

    if (messageError) {
      console.error("[API] Error saving message:", messageError);
      throw new Error(`Failed to create answer message: ${messageError.message || JSON.stringify(messageError)}`);
    }

    // Generate and upload audio
    const voiceId = lesson.voice_style;
    console.log("[API] Generating audio for answer. VoiceId:", voiceId, "Content length:", answerContent?.length);
    const audioUrl = voiceId && answerMessage ? await generateAndUploadAudio(answerContent, voiceId, answerMessage.id, supabase) : null;
    console.log("[API] Audio generated. Has audioUrl:", !!audioUrl);
    
    // Update message with audio URL
    if (audioUrl && answerMessage) {
      await supabase
        .from("messages")
        .update({
          metadata: {
            ...answerMessage.metadata,
            audioUrl,
          },
        })
        .eq("id", answerMessage.id);
      
      answerMessage.metadata = { ...answerMessage.metadata, audioUrl };
    }

    console.log("[API] Message saved. Returning response with audioUrl:", !!answerMessage?.metadata?.audioUrl);

    return NextResponse.json({
      message: answerMessage,
    });
  } catch (error) {
    console.error("Error answering question:", error);
    return NextResponse.json(
      { error: "Failed to answer question" },
      { status: 500 }
    );
  }
}

