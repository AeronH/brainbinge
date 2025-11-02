import { NextResponse } from "next/server";
import { PODCAST_VOICE_PRESETS } from "@/lib/podcast-voices";

/**
 * Get available Speechify voices for podcast generation
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      voices: PODCAST_VOICE_PRESETS,
    });
  } catch (error) {
    console.error("Error fetching podcast voices:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch voices",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

