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
    console.log("[Storage] First 10 bytes (MP3 should start with FF FB or ID3):", Array.from(audioBuffer.slice(0, 10)).map(b => b.toString(16).padStart(2, '0')).join(' '));
    
    // Upload to Supabase Storage
    const fileName = `message-audio/${messageId}.mp3`;
    console.log("[Storage] Attempting upload to:", fileName);
    console.log("[Storage] Buffer is Buffer?:", Buffer.isBuffer(audioBuffer));
    console.log("[Storage] Buffer length:", audioBuffer.length);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('lesson-audio')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });
    
    if (uploadError) {
      console.error("[Storage] Upload error:", uploadError);
      console.error("[Storage] Error details:", JSON.stringify(uploadError, null, 2));
      return null;
    }
    
    console.log("[Storage] Audio uploaded successfully:", fileName);
    console.log("[Storage] Upload response data:", JSON.stringify(uploadData, null, 2));
    
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
    const { sessionId, lessonId, action, quizAnswer } = await request.json();

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

    // Fetch existing messages to understand context
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    // Count assistant messages (blocks delivered)
    const assistantMessages = messages?.filter(m => m.role === "assistant") || [];
    const blockNumber = assistantMessages.length;

    // Handle quiz answer if provided
    if (action === "answer_quiz" && quizAnswer !== undefined) {
      // Find the unanswered quiz question
      const { data: quizQuestion } = await supabase
        .from("walkthrough_quiz_questions")
        .select("*")
        .eq("session_id", sessionId)
        .is("user_answer", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (quizQuestion) {
        const isCorrect = quizAnswer === quizQuestion.correct_answer;

        // Update quiz question with user's answer
        const { error: updateError } = await supabase
          .from("walkthrough_quiz_questions")
          .update({
            user_answer: quizAnswer,
            is_correct: isCorrect,
          })
          .eq("id", quizQuestion.id);

        if (updateError) {
          console.error("Failed to update quiz answer:", updateError);
          return NextResponse.json(
            { error: "Failed to save quiz answer" },
            { status: 500 }
          );
        }

        // Generate feedback message - keep it short for audio
        const feedbackContent = isCorrect
          ? `Correct! ${quizQuestion.explanation ? quizQuestion.explanation.substring(0, 80) : "Nice work."}`
          : `Not quite. It's ${String.fromCharCode(65 + quizQuestion.correct_answer)}. ${quizQuestion.explanation ? quizQuestion.explanation.substring(0, 80) : ""}`;

        // Create message first to get ID
        const { data: feedbackMessage } = await supabase
          .from("messages")
          .insert({
            session_id: sessionId,
            role: "assistant",
            content: feedbackContent,
            metadata: { 
              buttonType: "continue", 
              blockNumber: blockNumber + 1,
            },
          })
          .select()
          .single();
        
        // Generate and upload audio using message ID
        const voiceId = lesson.voice_style;
        const audioUrl = voiceId && feedbackMessage ? await generateAndUploadAudio(feedbackContent, voiceId, feedbackMessage.id, supabase) : null;
        
        // Update message with audio URL
        if (audioUrl && feedbackMessage) {
          await supabase
            .from("messages")
            .update({
              metadata: {
                ...feedbackMessage.metadata,
                audioUrl,
              },
            })
            .eq("id", feedbackMessage.id);
          
          feedbackMessage.metadata = { ...feedbackMessage.metadata, audioUrl };
        }

        return NextResponse.json({
          message: feedbackMessage,
          quizResult: {
            isCorrect,
            correctAnswer: quizQuestion.correct_answer,
            explanation: quizQuestion.explanation,
          },
        });
      }
    }

    // Find the last quiz message to track when we last showed a quiz
    const lastQuizMessageIndex = assistantMessages.findLastIndex(m => {
      const metadata = m.metadata as any;
      return metadata?.buttonType === "quiz";
    });

    // Count blocks since last quiz (including the feedback message, so we start fresh)
    // We want at least 3 new content blocks after quiz feedback before showing another quiz
    let blocksSinceLastQuiz = 0;
    if (lastQuizMessageIndex !== -1) {
      blocksSinceLastQuiz = assistantMessages.length - lastQuizMessageIndex - 1;
    } else {
      blocksSinceLastQuiz = blockNumber;
    }

    // Show quiz after 3+ blocks since last quiz (quiz -> feedback counts as 1, then need 3 more)
    // So we need blocksSinceLastQuiz >= 4 (feedback + 3 content blocks)
    const shouldShowQuiz = blocksSinceLastQuiz >= 4;

    // Find the last ANSWERED quiz to see which blocks were already tested for content
    const { data: lastQuiz } = await supabase
      .from("walkthrough_quiz_questions")
      .select("asked_after_message_id")
      .eq("session_id", sessionId)
      .not("user_answer", "is", null) // Only count answered quizzes
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (shouldShowQuiz && action !== "skip_quiz") {
      // Get only the NEW blocks since last quiz (not previously tested content)
      const newBlocks = lastQuiz?.asked_after_message_id
        ? assistantMessages.slice(assistantMessages.findIndex(m => m.id === lastQuiz.asked_after_message_id) + 1)
        : assistantMessages.slice(0, blockNumber);

      const recentContent = newBlocks.map(m => m.content).join("\n\n");

      const quizCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are creating a multiple choice quiz question to test understanding of recently taught content.

IMPORTANT: Only create questions about the NEW content provided below. Do not reference earlier material.

Generate a quiz question with 4 options that tests comprehension of the key concepts in the recent blocks.

Requirements:
- Focus ONLY on concepts from the recent content blocks
- Make it specific to what was just taught
- 4 diverse options (not too similar)
- One clearly correct answer
- Brief explanation

Return ONLY valid JSON in this exact format:
{
  "question": "Your question here",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0,
  "explanation": "Brief explanation of why this answer is correct"
}

The correctAnswer should be an index (0-3) of the correct option.`,
          },
          {
            role: "user",
            content: `Based ONLY on this recently taught content:\n\n${recentContent}\n\nGenerate a quiz question testing these specific concepts.`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      });

      const quizData = JSON.parse(quizCompletion.choices[0].message.content || "{}");

      // Get the last assistant message ID to track which blocks this quiz covers
      const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];

      // Save quiz question to database
      const { data: savedQuiz } = await supabase
        .from("walkthrough_quiz_questions")
        .insert({
          session_id: sessionId,
          lesson_id: lessonId,
          question: quizData.question,
          options: quizData.options,
          correct_answer: quizData.correctAnswer,
          explanation: quizData.explanation,
          asked_after_message_id: lastAssistantMessage?.id,
        })
        .select()
        .single();

      // Create quiz message
      const quizContent = `Let's test your understanding:\n\n${quizData.question}`;
      
      // Create message first to get ID
      const { data: quizMessage } = await supabase
        .from("messages")
        .insert({
          session_id: sessionId,
          role: "assistant",
          content: quizContent,
          metadata: {
            buttonType: "quiz",
            quizQuestionId: savedQuiz?.id,
            blockNumber: blockNumber + 1,
          },
        })
        .select()
        .single();
      
      // Generate and upload audio
      const voiceId = lesson.voice_style;
      const quizAudioUrl = voiceId && quizMessage ? await generateAndUploadAudio(quizContent, voiceId, quizMessage.id, supabase) : null;
      
      // Update message with audio URL
      if (quizAudioUrl && quizMessage) {
        await supabase
          .from("messages")
          .update({
            metadata: {
              ...quizMessage.metadata,
              audioUrl: quizAudioUrl,
            },
          })
          .eq("id", quizMessage.id);
        
        quizMessage.metadata = { ...quizMessage.metadata, audioUrl: quizAudioUrl };
      }

      return NextResponse.json({
        message: quizMessage,
        quizQuestion: savedQuiz,
      });
    }

    // Generate next content block
    const outline = lesson.outline as any;
    const voiceStyle = lesson.voice_style || "mentor";

    // Determine current section based on block number
    const totalSections = outline?.sections?.length || 1;
    const blocksPerSection = Math.ceil(totalSections / 10); // Rough estimate
    const currentSectionIndex = Math.floor(blockNumber / blocksPerSection) % totalSections;
    const currentSection = outline?.sections?.[currentSectionIndex];

    const previousBlocks = assistantMessages.slice(-2).map(m => m.content).join("\n");

    const contentCompletion = await openai.chat.completions.create({
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

Current section: ${currentSection?.title || "Introduction"}

Previous content covered:
${previousBlocks || "This is the start of the lesson"}

Generate the next content block (60-80 words MAX, ~30 seconds spoken).
CRITICAL: Keep it SHORT and focused. This will be converted to audio, so brevity is essential.
- Be conversational and engaging
- One core concept only
- Use ONE brief example if helpful
- Maintain the voice style personality
- End naturally, ready for user to click "Continue"`,
        },
        {
          role: "user",
          content: `Generate a SHORT teaching block (60-80 words MAX) for section "${currentSection?.title || "Introduction"}".`,
        },
      ],
      temperature: 0.8,
    });

    const contentBlock = contentCompletion.choices[0].message.content;

    // Check if this is the last section
    const isLastBlock = currentSectionIndex >= totalSections - 1 && blockNumber > 5;

    // Save content message first to get ID
    const { data: contentMessage, error: messageError } = await supabase
      .from("messages")
      .insert({
        session_id: sessionId,
        role: "assistant",
        content: contentBlock,
        metadata: {
          buttonType: isLastBlock ? "complete" : "continue",
          blockNumber: blockNumber + 1,
        },
      })
      .select()
      .single();

    if (messageError) {
      console.error("[API] Error saving message:", messageError);
      throw messageError;
    }

    // Generate and upload audio
    const voiceId = lesson.voice_style;
    console.log("[API] Generating audio for content block. VoiceId:", voiceId, "Content length:", contentBlock?.length);
    const contentAudioUrl = voiceId && contentMessage ? await generateAndUploadAudio(contentBlock, voiceId, contentMessage.id, supabase) : null;
    console.log("[API] Audio generated. Has audioUrl:", !!contentAudioUrl);
    
    // Update message with audio URL
    if (contentAudioUrl && contentMessage) {
      await supabase
        .from("messages")
        .update({
          metadata: {
            ...contentMessage.metadata,
            audioUrl: contentAudioUrl,
          },
        })
        .eq("id", contentMessage.id);
      
      contentMessage.metadata = { ...contentMessage.metadata, audioUrl: contentAudioUrl };
    }

    console.log("[API] Message saved. Returning response with audioUrl:", !!contentMessage?.metadata?.audioUrl);

    return NextResponse.json({
      message: contentMessage,
      isComplete: isLastBlock,
    });
  } catch (error) {
    console.error("Error generating walkthrough content:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }
}

