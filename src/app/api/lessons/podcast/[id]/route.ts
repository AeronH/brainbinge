import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Get podcast by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: podcastId } = await params;

    if (!podcastId) {
      return NextResponse.json(
        { error: "Podcast ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch podcast
    const { data: podcast, error: podcastError } = await supabase
      .from("lesson_podcasts")
      .select("*")
      .eq("id", podcastId)
      .eq("user_id", user.id)
      .single();

    if (podcastError || !podcast) {
      return NextResponse.json(
        { error: "Podcast not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      podcast,
    });
  } catch (error) {
    console.error("Error fetching podcast:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch podcast",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * Delete podcast
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: podcastId } = await params;

    if (!podcastId) {
      return NextResponse.json(
        { error: "Podcast ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch podcast to get audio URLs for cleanup
    const { data: podcast, error: fetchError } = await supabase
      .from("lesson_podcasts")
      .select("*")
      .eq("id", podcastId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !podcast) {
      return NextResponse.json(
        { error: "Podcast not found" },
        { status: 404 }
      );
    }

    // Delete audio files from storage
    const transcript = podcast.transcript as any[];
    if (Array.isArray(transcript)) {
      const audioUrls = transcript
        .map((turn) => turn.audioUrl)
        .filter(Boolean);

      for (const url of audioUrls) {
        try {
          // Extract file path from URL
          const urlParts = url.split("/podcast-audio/");
          if (urlParts.length > 1) {
            const filePath = urlParts[1];
            await supabase.storage.from("podcast-audio").remove([filePath]);
          }
        } catch (error) {
          console.error("Error deleting audio file:", error);
          // Continue with deletion even if file cleanup fails
        }
      }
    }

    // Delete podcast record
    const { error: deleteError } = await supabase
      .from("lesson_podcasts")
      .delete()
      .eq("id", podcastId)
      .eq("user_id", user.id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: "Podcast deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting podcast:", error);
    return NextResponse.json(
      { 
        error: "Failed to delete podcast",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

