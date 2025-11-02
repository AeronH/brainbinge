import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Check if a podcast exists for a lesson
 */
export async function POST(request: NextRequest) {
  try {
    const { lessonId } = await request.json();

    if (!lessonId) {
      return NextResponse.json(
        { error: "lessonId is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if podcast exists for this lesson
    const { data: podcast, error } = await supabase
      .from("lesson_podcasts")
      .select("id, tone, voice_1, voice_2, created_at")
      .eq("lesson_id", lessonId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return NextResponse.json({
      exists: !!podcast,
      podcast: podcast || null,
    });
  } catch (error) {
    console.error("Error checking podcast:", error);
    return NextResponse.json(
      { 
        error: "Failed to check podcast",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

