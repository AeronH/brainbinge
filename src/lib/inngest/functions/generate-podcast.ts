import { inngest } from '@/lib/inngest/client';
import { createClient } from '@supabase/supabase-js';
import { generateSpeechBuffer } from '@/lib/speechify';

// Get environment variables - validate they exist
function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}. Please check your .env.local file.`);
  }
  return value;
}

/**
 * Generate podcast script using OpenAI
 */
async function generatePodcastScript(
  lessonOutline: any,
  lessonTitle: string,
  tone: string
): Promise<Array<{ speaker: string; text: string }>> {
  const OPENAI_API_KEY = getEnvVar('OPENAI_API_KEY');
  
  console.log('[Podcast Inngest] Starting script generation...');

  const toneDescriptions = {
    brainrot: `Gen Z/internet culture style - use modern slang, memes references, and casual language. 
      Be energetic and playful. Examples: "no cap", "fr fr", "this is bussin", "lowkey", "highkey", etc.`,
    normal: `Standard conversational podcast style - friendly, clear, and engaging. 
      Natural flow with good explanations and examples.`,
    posh: `Sophisticated and refined style - use elevated vocabulary, proper grammar, and articulate language. 
      Maintain elegance and intellectual depth.`,
    casual: `Relaxed and easygoing style - conversational and approachable. 
      Like chatting with friends over coffee.`
  };

  const toneDesc = toneDescriptions[tone as keyof typeof toneDescriptions] || toneDescriptions.normal;

  const systemPrompt = `You are a podcast script writer creating a natural, engaging two-person conversation about an educational topic.

TONE: ${toneDesc}

SPEAKERS:
- Speaker 1: The main host/expert who explains concepts
- Speaker 2: The curious co-host who asks questions and adds insights

RULES FOR REALISTIC PODCAST FLOW:
1. **Natural Speaking Blocks**: Each speaker should talk for 3-6 sentences at a time, like a real podcast
2. **Occasional Interjections**: Sometimes one speaker briefly interjects while the other is explaining
3. **Realistic Podcast Structure**:
   - Opening: Brief intro/greeting (1-2 exchanges)
   - Main content: Longer blocks of explanation with occasional reactions
   - Transitions: Natural topic shifts
   - Closing: Brief wrap-up
4. **Speaking Patterns**:
   - Main explanations: 4-6 sentences per speaker
   - Reactions/questions: 1-2 sentences
   - Agreement: Short interjections like "Right," "Exactly," "Mmm-hmm"
5. **Balance**: 
   - 60% longer speaking blocks (multiple sentences)
   - 30% medium responses (2-3 sentences)
   - 10% quick reactions/interjections
6. **Use natural podcast language**
7. **Total conversation**: Aim for 15-25 exchanges (not 40!), but with LONGER turns

LESSON INFO:
Title: ${lessonTitle}
Content: ${JSON.stringify(lessonOutline, null, 2)}

Generate a podcast conversation that covers all major topics from the lesson.

Return ONLY a JSON object with a 'dialogue' array of dialogue turns. Each turn should be multiple sentences (3-6 for main points, 1-2 for reactions).`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Create the podcast script for: ${lessonTitle}`
          }
        ],
        temperature: 0.8,
        max_tokens: 4000,
        response_format: {
          type: 'json_object'
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Podcast Inngest] OpenAI error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content || '{}');
    const dialogue = parsed.dialogue || parsed.script || parsed.conversation || [];

    if (!Array.isArray(dialogue) || dialogue.length === 0) {
      console.error('[Podcast Inngest] Invalid dialogue format:', parsed);
      throw new Error('Invalid dialogue format returned from OpenAI');
    }

    console.log(`[Podcast Inngest] Generated ${dialogue.length} dialogue turns`);
    return dialogue;
  } catch (error) {
    console.error('[Podcast Inngest] Script generation error:', error);
    throw error;
  }
}

/**
 * Generate audio for a single dialogue turn
 */
async function generateAudioForTurn(
  turn: { speaker: string; text: string },
  turnIndex: number,
  voice1: string,
  voice2: string
): Promise<Buffer> {
  const voiceId = String(turn.speaker).includes('1') ? voice1 : voice2;
  console.log(`[Podcast Inngest] Generating audio for turn ${turnIndex + 1} with voice ${voiceId}`);
  
  try {
    const audioBuffer = await generateSpeechBuffer(turn.text, voiceId, 3);
    console.log(`[Podcast Inngest] ✓ Generated audio for turn ${turnIndex + 1} (${audioBuffer.length} bytes)`);
    return audioBuffer;
  } catch (error) {
    console.error(`[Podcast Inngest] ✗ Error generating audio for turn ${turnIndex + 1}:`, error);
    throw error;
  }
}

/**
 * Upload audio file to Supabase Storage
 */
async function uploadAudioFile(
  supabase: any,
  audioBuffer: Buffer,
  fileName: string
): Promise<string> {
  console.log(`[Podcast Inngest] Uploading ${fileName} (${audioBuffer.length} bytes)`);
  
  const { error: uploadError } = await supabase.storage
    .from('podcast-audio')
    .upload(fileName, audioBuffer, {
      contentType: 'audio/mpeg',
      upsert: false
    });

  if (uploadError) {
    console.error('[Podcast Inngest] Upload error:', uploadError);
    throw new Error(`Failed to upload audio: ${uploadError.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('podcast-audio')
    .getPublicUrl(fileName);

  console.log(`[Podcast Inngest] ✓ Uploaded ${fileName}`);
  return publicUrl;
}

export const generatePodcast = inngest.createFunction(
  {
    id: 'generate-podcast',
    name: 'Generate Podcast',
    retries: 0, // Disable automatic retries - we handle retries manually
  },
  { event: 'podcast/generate' },
  async ({ event, step }) => {
    const { podcastId } = event.data;

    if (!podcastId) {
      throw new Error('podcastId required');
    }

    console.log(`[Podcast Inngest] Starting generation for podcast: ${podcastId}`);

    // Get environment variables at runtime
    const SUPABASE_URL = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

    // Create Supabase admin client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    try {
      // Step 1: Fetch podcast with lesson data
      const podcast = await step.run('fetch-podcast', async () => {
        console.log(`[Podcast Inngest] Fetching podcast ${podcastId}...`);

        const { data, error } = await supabase
          .from('lesson_podcasts')
          .select('*, lessons(*)')
          .eq('id', podcastId)
          .single();

        if (error) {
          console.error('[Podcast Inngest] Error fetching podcast:', error);
          throw new Error(`Podcast not found: ${error.message}`);
        }

        if (!data) {
          throw new Error('Podcast not found');
        }

        const lesson = (data as any).lessons;
        if (!lesson) {
          throw new Error('Lesson data not found');
        }

        console.log(`[Podcast Inngest] Found podcast for lesson: ${lesson.title}`);
        return data as any;
      });

      const lesson = podcast.lessons;
      const { tone, voice_1, voice_2, user_id } = podcast;

      console.log('[Podcast Inngest] Podcast config:', { tone, voice_1, voice_2 });

      // Step 2: Generate podcast script
      const dialogue = await step.run('generate-script', async () => {
        console.log('[Podcast Inngest] Generating script...');
        return await generatePodcastScript(lesson.outline, lesson.title, tone);
      });

      console.log(`[Podcast Inngest] Script generated with ${dialogue.length} turns`);

      // Step 3: Generate audio clips and upload them in parallel batches
      // Combined into one step to avoid Buffer serialization issues between steps
      const transcript = await step.run('generate-and-upload-audio', async () => {
        console.log('[Podcast Inngest] Generating and uploading audio clips in parallel...');
        
        // Reduced batch size to avoid rate limiting (Speechify has strict limits)
        const BATCH_SIZE = 5; // Process 5 turns concurrently (reduced from 15)
        const BATCH_DELAY_MS = 2000; // Wait 2 seconds between batches to avoid rate limits
        const transcript: Array<{ turnIndex: number; speaker: string; text: string; audioUrl: string }> = [];
        const errors: Array<{ turnIndex: number; error: Error }> = [];

        // Process in batches
        for (let batchStart = 0; batchStart < dialogue.length; batchStart += BATCH_SIZE) {
          // Add delay between batches (except for first batch)
          if (batchStart > 0) {
            console.log(`[Podcast Inngest] Waiting ${BATCH_DELAY_MS}ms before next batch to avoid rate limits...`);
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
          }
          
          const batchEnd = Math.min(batchStart + BATCH_SIZE, dialogue.length);
          const batch = dialogue.slice(batchStart, batchEnd);
          
          console.log(`[Podcast Inngest] Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1}: turns ${batchStart + 1}-${batchEnd}`);

          // Generate audio AND upload for all turns in this batch concurrently
          const batchPromises = batch.map(async (turn, batchIndex) => {
            const turnIndex = batchStart + batchIndex;
            try {
              // Generate audio (includes retry logic for rate limiting)
              const audioBuffer = await generateAudioForTurn(turn, turnIndex, voice_1, voice_2);
              
              // Upload immediately after generation
              const fileName = `podcast_${podcastId}_turn_${turnIndex}_${Date.now()}_${batchIndex}.mp3`;
              console.log(`[Podcast Inngest] Uploading turn ${turnIndex + 1}...`);
              
              const audioUrl = await uploadAudioFile(supabase, audioBuffer, fileName);
              
              console.log(`[Podcast Inngest] ✓ Generated and uploaded turn ${turnIndex + 1}`);
              
              return {
                turnIndex,
                speaker: turn.speaker,
                text: turn.text,
                audioUrl,
                success: true
              };
            } catch (error) {
              console.error(`[Podcast Inngest] ✗ Failed to process turn ${turnIndex + 1}:`, error);
              return {
                turnIndex,
                error: error as Error,
                success: false
              };
            }
          });

          const batchResults = await Promise.all(batchPromises);
          
          // Separate successes and failures
          for (const result of batchResults) {
            if (result.success) {
              transcript.push({
                turnIndex: result.turnIndex,
                speaker: result.speaker,
                text: result.text,
                audioUrl: result.audioUrl
              });
            } else {
              errors.push({
                turnIndex: result.turnIndex,
                error: result.error
              });
            }
          }

          console.log(`[Podcast Inngest] Batch complete: ${transcript.length} successful, ${errors.length} failed`);
          
          // If we got rate limited in this batch, wait longer before next batch
          const rateLimited = batchResults.some(r => 
            !r.success && (
              r.error.message.includes('429') || 
              r.error.message.includes('Too Many Requests')
            )
          );
          
          if (rateLimited && batchStart + BATCH_SIZE < dialogue.length) {
            const extraDelay = 5000; // Extra 5 seconds if rate limited
            console.log(`[Podcast Inngest] Rate limit detected in batch, waiting extra ${extraDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, extraDelay));
          }
        }

        if (errors.length > 0) {
          console.warn(`[Podcast Inngest] ${errors.length} turns failed to process`);
          // Log errors but continue with successful ones
          errors.forEach(({ turnIndex, error }) => {
            console.error(`[Podcast Inngest] Turn ${turnIndex + 1} error:`, error.message);
          });
        }

        if (transcript.length === 0) {
          throw new Error('Failed to generate and upload any audio clips');
        }

        // Sort by turnIndex to maintain order
        transcript.sort((a, b) => a.turnIndex - b.turnIndex);
        
        // Remove turnIndex before returning (not needed in final transcript)
        const finalTranscript = transcript.map(({ turnIndex, ...rest }) => rest);
        
        console.log(`[Podcast Inngest] Generated and uploaded ${finalTranscript.length}/${dialogue.length} audio clips`);
        return finalTranscript;
      });

      // Step 5: Update database with transcript and status
      await step.run('update-database', async () => {
        console.log('[Podcast Inngest] Starting database update step...');
        console.log(`[Podcast Inngest] Transcript has ${transcript.length} items`);

        if (!transcript || transcript.length === 0) {
          throw new Error('No transcript data to save');
        }

        // Fetch user data for usage counter
        console.log('[Podcast Inngest] Fetching user data...');
        const { data: userData, error: userFetchError } = await supabase
          .from('users')
          .select('podcast_generations_count')
          .eq('id', user_id)
          .single();

        if (userFetchError) {
          console.error('[Podcast Inngest] Error fetching user data:', userFetchError);
          throw new Error(`Failed to fetch user data: ${userFetchError.message}`);
        }

        const currentCount = userData?.podcast_generations_count || 0;
        console.log(`[Podcast Inngest] Current podcast count: ${currentCount}`);

        // Update podcast record
        console.log('[Podcast Inngest] Updating podcast record...');
        const { error: updateError } = await supabase
          .from('lesson_podcasts')
          .update({
            transcript,
            status: 'ready'
          })
          .eq('id', podcastId);

        if (updateError) {
          console.error('[Podcast Inngest] Update error:', updateError);
          throw new Error(`Failed to update podcast: ${updateError.message}`);
        }

        console.log('[Podcast Inngest] Podcast record updated successfully');

        // Increment usage counter
        console.log('[Podcast Inngest] Incrementing usage counter...');
        const { error: counterError } = await supabase
          .from('users')
          .update({
            podcast_generations_count: currentCount + 1
          })
          .eq('id', user_id);

        if (counterError) {
          console.error('[Podcast Inngest] Error incrementing counter:', counterError);
          // Don't throw - this is not critical
        }

        console.log('[Podcast Inngest] ✅ Database updated successfully');
      });

      console.log(`[Podcast Inngest] ✅ Podcast ${podcastId} generation complete!`);
      return { success: true, podcastId };
    } catch (error) {
      // Mark podcast as error on failure
      console.error('[Podcast Inngest] Error generating podcast:', error);
      
      await step.run('mark-error', async () => {
        try {
          await supabase
            .from('lesson_podcasts')
            .update({
              status: 'error',
              transcript: {
                error: true,
                message: error instanceof Error ? error.message : String(error)
              }
            })
            .eq('id', podcastId);
          console.log('[Podcast Inngest] Marked podcast as error');
        } catch (updateError) {
          console.error('[Podcast Inngest] Failed to update error status:', updateError);
        }
      });

      throw error;
    }
  }
);

