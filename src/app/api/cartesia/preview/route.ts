import { NextRequest, NextResponse } from "next/server";
import { generateSpeechBuffer } from "@/lib/speechify";

/**
 * Generate a preview audio sample for a voice using Speechify
 */
export async function POST(request: NextRequest) {
  try {
    const { voiceId, voiceName } = await request.json();

    if (!voiceId) {
      return NextResponse.json(
        { error: "voiceId is required" },
        { status: 400 }
      );
    }

    // Generate a short preview text
    const previewText = `Hi! I'm ${voiceName || "your AI voice"}. I'll be helping you learn through engaging conversations.`;

    // Generate audio using Speechify (4x cheaper than Cartesia!)
    const audioBuffer = await generateSpeechBuffer(
      previewText,
      voiceId
    );

    // Return audio as response
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error generating voice preview:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate preview",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

