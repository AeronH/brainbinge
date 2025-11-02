import { NextResponse } from "next/server";
import { fetchVoices } from "@/lib/speechify";

/**
 * Fetch all available Speechify voices with full details
 * Use this to find good voice IDs for podcasts
 */
export async function GET() {
  try {
    const voices = await fetchVoices();
    
    // Filter for English voices that would work well for podcasts
    const englishVoices = voices.filter((voice: any) => 
      voice.locale?.includes("en") || voice.locale === "en-US"
    );

    // Sort by type (shared voices first) and name
    const sortedVoices = englishVoices.sort((a: any, b: any) => {
      if (a.type === "shared" && b.type !== "shared") return -1;
      if (a.type !== "shared" && b.type === "shared") return 1;
      return (a.display_name || "").localeCompare(b.display_name || "");
    });

    return NextResponse.json({
      success: true,
      total: voices.length,
      englishVoices: sortedVoices.length,
      voices: sortedVoices,
      // Also return a formatted list for easy copy-paste
      formatted: sortedVoices.map((v: any) => ({
        id: v.id,
        name: v.display_name,
        gender: v.gender,
        locale: v.locale,
        type: v.type,
        tags: v.tags,
        preview: v.preview_audio,
      })),
    });
  } catch (error) {
    console.error("Error fetching all voices:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch voices",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

