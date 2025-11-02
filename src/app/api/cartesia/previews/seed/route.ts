import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSpeechBuffer, fetchVoices } from "@/lib/speechify";

/**
 * Automatically fetch Speechify voices, pick good ones for podcasts,
 * generate previews, and save everything to DB
 */
export async function POST() {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Always include Snoop Dogg first
    const snoopId = "81dd4427-89aa-4a1a-9527-d225b44f7b28";
    const snoopVoice = {
      id: snoopId,
      display_name: "Snoop Dogg",
      gender: "male",
      locale: "en-US",
      type: "shared",
    };

    // Fetch all Speechify voices
    console.log("Fetching voices from Speechify API...");
    const allVoices = await fetchVoices();

    // Filter for good English podcast voices (excluding Snoop since we're adding him manually)
    const englishVoices = allVoices.filter((v: any) => 
      v.locale?.includes("en") &&
      v.type === "shared" &&
      v.id !== snoopId && // Exclude Snoop from this list
      (v.gender === "male" || v.gender === "female")
    );

    // Pick 5 more diverse voices (mix of male and female)
    const males = englishVoices.filter((v: any) => v.gender === "male");
    const females = englishVoices.filter((v: any) => v.gender === "female");

    // Get 2-3 males and 2-3 females
    const additionalMales = males.slice(0, 3);
    const additionalFemales = females.slice(0, 2);
    
    // Combine: Snoop first, then others
    const selectedVoices = [snoopVoice, ...additionalMales, ...additionalFemales].slice(0, 6);

    console.log(`Selected ${selectedVoices.length} voices for podcasts:`, 
      selectedVoices.map((v: any) => v.display_name));

    const results = [];

    for (const voice of selectedVoices) {
      try {
        // Check if preview already exists
        const { data: existing } = await supabase
          .from("voice_previews")
          .select("id")
          .eq("voice_id", voice.id)
          .maybeSingle();

        if (existing) {
          results.push({
            voiceId: voice.id,
            voiceName: voice.display_name,
            status: "skipped",
            message: "Preview already exists",
          });
          continue;
        }

        // Generate preview text
        const previewText = `Hi! I'm ${voice.display_name}. I'll help make your learning experience engaging and memorable.`;

        // Add delay to avoid rate limiting
        if (results.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 600));
        }

        // Generate audio using Speechify (4x cheaper!)
        const audioBuffer = await generateSpeechBuffer(
          previewText,
          voice.id,
          3 // retry attempts
        );

        // Upload to Supabase Storage (podcast-audio bucket)
        const fileName = `voice_preview_${voice.id}_${Date.now()}.mp3`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("podcast-audio")
          .upload(fileName, audioBuffer, {
            contentType: "audio/mpeg",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("podcast-audio")
          .getPublicUrl(fileName);

        // Save to database
        const { error: insertError } = await supabase
          .from("voice_previews")
          .insert({
            voice_id: voice.id,
            voice_name: voice.display_name,
            preview_text: previewText,
            audio_url: publicUrl,
          });

        if (insertError) {
          throw new Error(`Database insert failed: ${insertError.message}`);
        }

        results.push({
          voiceId: voice.id,
          voiceName: voice.display_name,
          status: "success",
          audioUrl: publicUrl,
        });

        console.log(`✅ Generated preview for ${voice.display_name}`);
      } catch (error) {
        console.error(`Error processing voice ${voice.id}:`, error);
        results.push({
          voiceId: voice.id,
          voiceName: voice.display_name,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Update podcast-voices.ts data for frontend to use
    // Note: The actual voice IDs are now in the database (voice_previews table)
    // Frontend fetches from there, so PODCAST_VOICE_PRESETS is just a fallback

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} voices`,
      results,
    });
  } catch (error) {
    console.error("Error seeding voice previews:", error);
    return NextResponse.json(
      {
        error: "Failed to seed voice previews",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

