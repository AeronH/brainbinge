import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

/**
 * Sanitize text to remove problematic Unicode characters and escape sequences
 * that PostgreSQL can't handle
 */
function sanitizeText(text: string): string {
  return text
    // Replace common ligatures with standard characters
    .replace(/\uFB00/g, 'ff')
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    .replace(/\uFB03/g, 'ffi')
    .replace(/\uFB04/g, 'ffl')
    // Replace special quotes and dashes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    // Replace ellipsis
    .replace(/\u2026/g, '...')
    // Remove zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    // Remove any remaining problematic characters
    .replace(/[^\x20-\x7E\n\r\t\u00A0-\uFFFF]/g, '')
    // Normalize whitespace
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

/**
 * Generate lesson with AI
 * This route creates a placeholder and triggers the Edge Function for generation
 */
export async function POST(request: NextRequest) {
  try {
    const { content, userId, sourceType = "text", lessonId } = await request.json();

    console.log("[API] Received request:", { userId, sourceType, contentLength: content?.length, lessonId });

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Ensure content is a plain string
    if (typeof content !== 'string') {
      console.error("[API] Content is not a string! Type:", typeof content);
      return NextResponse.json(
        { error: "Content must be plain text" },
        { status: 400 }
      );
    }

    // Sanitize content to remove problematic Unicode characters
    const sanitizedContent = sanitizeText(content);
    console.log("[API] Sanitized content length:", sanitizedContent.length);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check subscription status and lesson limit for free users
    const { data: profile } = await supabase
      .from("users")
      .select("subscription_status")
      .eq("id", userId)
      .single();

    const isSubscribed = Boolean(profile && (profile as any).subscription_status === "active");

    // If not subscribed and not updating existing lesson, check lesson count
    if (!isSubscribed && !lessonId) {
      const { count } = await supabase
        .from("lessons")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      
      if (count && count >= 1) {
        return NextResponse.json(
          { error: "LESSON_LIMIT_REACHED", message: "Free users can create 1 lesson. Upgrade to create unlimited lessons." },
          { status: 403 }
        );
      }
    }

    let finalLessonId: string;

    if (lessonId) {
      // Update existing lesson placeholder to generating state
      const { error: updateError } = await supabase
        .from("lessons")
        .update({
          status: 'generating',
          original_content: sanitizedContent,
          source_type: sourceType,
        })
        .eq("id", lessonId);

      if (updateError) {
        throw new Error(`Failed to update lesson: ${updateError.message}`);
      }

      finalLessonId = lessonId;
    } else {
      // Create new placeholder lesson
      const placeholderLesson = {
        user_id: userId,
        title: "Preparing lesson...",
        source_type: sourceType,
        original_content: sanitizedContent,
        outline: null,
        summary: null,
        voice_style: null,
        humor_level: "pg",
        status: 'generating',
      };

      const { data, error } = await supabase
        .from("lessons")
        // @ts-ignore - Supabase type inference issue with insert
        .insert(placeholderLesson)
        .select()
        .single();

      if (error || !data) {
        throw new Error(`Failed to create lesson: ${error?.message || 'No data returned'}`);
      }

      finalLessonId = (data as any).id;
    }

    // Trigger Inngest function to handle generation
    const { inngest } = await import('@/lib/inngest/client');
    
    console.log(`[API] Triggering Inngest function for lesson ${finalLessonId}`);
    
    // Small delay to ensure database transaction is committed
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Trigger Inngest event (fire and forget)
    await inngest.send({
      name: 'lesson/generate',
      data: { lessonId: finalLessonId },
    });
    
    console.log('[API] Inngest event sent successfully');
    
    // Return immediately
    return NextResponse.json({
      success: true,
      lessonId: finalLessonId,
      generating: true,
    });
  } catch (error) {
    console.error("Error creating lesson:", error);
    return NextResponse.json(
      { 
        error: "Failed to create lesson",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}


