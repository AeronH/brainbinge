import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkSubscription } from "@/lib/subscription";
import { inngest } from "@/lib/inngest/client";
import { extractContentFromBlocks, type LessonBlock } from "@/lib/lesson-blocks";

export async function POST(request: NextRequest) {
  try {
    const { lessonId, questionTypes, sectionId } = await request.json();

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

    // Handle section-based quiz generation
    let sectionContent: string | undefined;
    let sectionWordCount: number | undefined;
    let section: { id: string; title: string } | null = null;

    if (sectionId) {
      // Verify section belongs to lesson
      const { data: sectionData, error: sectionError } = await supabase
        .from('lesson_sections')
        .select('id, title')
        .eq('id', sectionId)
        .eq('lesson_id', lessonId)
        .single();

      if (sectionError || !sectionData) {
        return NextResponse.json(
          { error: "Section not found or does not belong to this lesson" },
          { status: 404 }
        );
      }

      section = sectionData;

      // Fetch all blocks for this section
      const { data: blocks, error: blocksError } = await supabase
        .from('lesson_blocks')
        .select('type, content, order_index, callout_type')
        .eq('section_id', sectionId)
        .order('order_index', { ascending: true });

      if (blocksError) {
        console.error("Error fetching section blocks:", blocksError);
        return NextResponse.json(
          { error: "Failed to fetch section content" },
          { status: 500 }
        );
      }

      if (!blocks || blocks.length === 0) {
        return NextResponse.json(
          { error: "Section has no content" },
          { status: 400 }
        );
      }

      // Convert to LessonBlock format and extract content
      const lessonBlocks: LessonBlock[] = blocks.map(block => ({
        type: block.type as LessonBlock['type'],
        content: block.content,
        order: block.order_index,
        calloutType: block.callout_type as any
      }));

      sectionContent = extractContentFromBlocks(lessonBlocks);
      
      // Calculate word count (simple word count by splitting on whitespace)
      sectionWordCount = sectionContent.split(/\s+/).filter(word => word.length > 0).length;

      console.log(`[API] Generating quiz from section "${section.title}": ${sectionWordCount} words`);
    }

    // Generate automatic quiz title
    const baseTitle = sectionId && section ? section.title : lesson.title;
    const titlePrefix = baseTitle;
    
    // Find existing quizzes with the same pattern to determine next number
    const { data: existingQuizzes } = await supabase
      .from('quizzes')
      .select('title')
      .eq('lesson_id', lessonId);
    
    // Extract numbers from existing quiz titles matching the pattern
    const pattern = new RegExp(`^${titlePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} Quiz (\\d+)$`);
    const quizNumbers = existingQuizzes
      ?.map(q => {
        const match = q.title.match(pattern);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((n): n is number => n !== null)
      .sort((a, b) => b - a) || [];
    
    const nextNumber = quizNumbers.length > 0 ? quizNumbers[0] + 1 : 1;
    const quizTitle = `${titlePrefix} Quiz ${nextNumber}`;

    // Create quiz record
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
        sectionContent,
        sectionWordCount,
      },
    });
    
    console.log('[API] Inngest event sent successfully');
    
    // Return immediately
    return NextResponse.json({
      success: true,
      quizId: quiz.id,
      title: quizTitle,
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
