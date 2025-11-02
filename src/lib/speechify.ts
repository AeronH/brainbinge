/**
 * Speechify API utility functions for text-to-speech
 */

const SPEECHIFY_API_KEY = process.env.SPEECHIFY_API_KEY;
const SPEECHIFY_BASE_URL = "https://api.sws.speechify.com/v1";

export interface SpeechifyVoice {
  id: string;
  display_name: string;
  gender: string;
  locale: string;
  models: {
    name: string;
    languages: {
      locale: string;
    }[];
  }[];
  type: string;
  avatar_image?: string;
  preview_audio?: string;
  tags?: string[];
}

/**
 * Fetches available voices from Speechify API
 */
export async function fetchVoices(): Promise<SpeechifyVoice[]> {
  if (!SPEECHIFY_API_KEY) {
    console.error("SPEECHIFY_API_KEY is not configured");
    throw new Error("Speechify API key is not configured");
  }

  try {
    const response = await fetch(`${SPEECHIFY_BASE_URL}/voices`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${SPEECHIFY_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Speechify voices API error:", response.status, errorText);
      throw new Error(`Failed to fetch voices: ${response.status}`);
    }

    const data = await response.json();
    return data.voices || data || [];
  } catch (error) {
    console.error("Error fetching Speechify voices:", error);
    throw error;
  }
}

/**
 * Generates speech audio from text using Speechify API
 * @param text - The text to convert to speech
 * @param voiceId - The Speechify voice ID to use
 * @returns Base64 encoded audio data
 */
export async function generateSpeech(
  text: string,
  voiceId: string
): Promise<string> {
  if (!SPEECHIFY_API_KEY) {
    console.error("SPEECHIFY_API_KEY is not configured");
    throw new Error("Speechify API key is not configured");
  }

  if (!text || !voiceId) {
    throw new Error("Text and voiceId are required");
  }

  try {
    const response = await fetch(`${SPEECHIFY_BASE_URL}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SPEECHIFY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: text,
        voice_id: voiceId,
        audio_format: "mp3",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Speechify speech API error:", response.status, errorText);
      throw new Error(`Failed to generate speech: ${response.status}`);
    }

    // Get the audio as array buffer
    const audioBuffer = await response.arrayBuffer();
    
    // Convert to base64
    const base64Audio = Buffer.from(audioBuffer).toString("base64");
    
    return base64Audio;
  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
}

/**
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generates speech audio and returns as Buffer (for direct upload)
 * @param text - The text to convert to speech
 * @param voiceId - The Speechify voice ID to use
 * @param retries - Number of retry attempts for rate limiting
 * @returns Buffer containing MP3 audio data
 */
export async function generateSpeechBuffer(
  text: string,
  voiceId: string,
  retries: number = 3
): Promise<Buffer> {
  if (!SPEECHIFY_API_KEY) {
    console.error("SPEECHIFY_API_KEY is not configured");
    throw new Error("Speechify API key is not configured");
  }

  if (!text || !voiceId) {
    throw new Error("Text and voiceId are required");
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Add delay before retry attempts (exponential backoff)
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10s
        console.log(`[Speechify] Retry attempt ${attempt}/${retries}, waiting ${delay}ms...`);
        await sleep(delay);
      }

      const response = await fetch(`${SPEECHIFY_BASE_URL}/audio/speech`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SPEECHIFY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: text,
          voice_id: voiceId,
          audio_format: "mp3",
        }),
      });

      // Retry on rate limiting or server errors
      if (response.status === 429 || response.status === 503 || response.status === 500) {
        const errorText = await response.text();
        console.error(`[Speechify] ${response.status} error, attempt ${attempt + 1}/${retries + 1}:`, errorText);
        lastError = new Error(`Failed to generate speech: ${response.status}`);
        continue; // Retry
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Speechify speech API error:", response.status, errorText);
        throw new Error(`Failed to generate speech: ${response.status}`);
      }

      // Speechify returns JSON with audio_data field (base64 encoded)
      const jsonResponse = await response.json();
      console.log("[Speechify] Response keys:", Object.keys(jsonResponse));
      
      if (!jsonResponse.audio_data) {
        console.error("[Speechify] No audio_data in response:", jsonResponse);
        throw new Error("No audio_data in Speechify response");
      }
      
      // Convert base64 audio data to Buffer
      const audioBuffer = Buffer.from(jsonResponse.audio_data, 'base64');
      console.log("[Speechify] Decoded audio buffer size:", audioBuffer.length);
      
      return audioBuffer;
    } catch (error) {
      if (attempt === retries) {
        console.error("Error generating speech (all retries exhausted):", error);
        throw lastError || error;
      }
      lastError = error as Error;
    }
  }

  throw lastError || new Error("Failed to generate speech after retries");
}

