import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Get all voice previews from database
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: previews, error } = await supabase
      .from("voice_previews")
      .select("*")
      .order("voice_name");

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      previews: previews || [],
    });
  } catch (error) {
    console.error("Error fetching voice previews:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch voice previews",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

