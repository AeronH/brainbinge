import { inngest } from '@/lib/inngest/client';
import { createClient } from '@supabase/supabase-js';

// Get environment variables - validate they exist
function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}. Please check your .env.local file.`);
  }
  return value;
}

async function fetchWithTimeout(url: string, options: any, timeoutMs = 180000, retries = 2): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (attempt < retries && error.name === 'AbortError') {
        console.log(`[Inngest] Retry ${attempt + 1}...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      throw error;
    }
  }
  throw new Error('All retries failed');
}

export const generateFlashcards = inngest.createFunction(
  { 
    id: 'generate-flashcards', 
    name: 'Generate Flashcards',
    retries: 0,
  },
  { event: 'flashcard/generate' },
  async ({ event, step }) => {
    const { lessonId } = event.data;

    if (!lessonId) {
      throw new Error('lessonId required');
    }

    console.log(`[Inngest] Starting flashcard generation for lesson: ${lessonId}`);

    // Get environment variables at runtime
    const OPENAI_API_KEY = getEnvVar('OPENAI_API_KEY');
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
      // Step 1: Fetch lesson
      const lesson = await step.run('fetch-lesson', async () => {
        console.log(`[Inngest] Fetching lesson ${lessonId}...`);
        
        const { data, error } = await supabase
          .from('lessons')
          .select('*')
          .eq('id', lessonId)
          .single();

        if (error) {
          console.error(`[Inngest] Error fetching lesson:`, error);
          throw new Error(`Lesson not found: ${error.message}`);
        }

        if (!data) {
          throw new Error('Lesson not found: No data returned');
        }

        // Check if flashcards already exist
        const { data: existingFlashcards } = await supabase
          .from('flashcards')
          .select('id')
          .eq('lesson_id', lessonId)
          .limit(1);

        if (existingFlashcards && existingFlashcards.length > 0) {
          console.log(`[Inngest] Flashcards already exist for lesson ${lessonId}, skipping generation`);
          return { skip: true, lesson: data };
        }

        console.log(`[Inngest] Successfully fetched lesson: ${lessonId}`);
        return data as any;
      });

      // Check if we should skip (already has flashcards)
      if ((lesson as any).skip) {
        await step.run('update-status-ready', async () => {
          await supabase
            .from('lessons')
            .update({ flashcard_status: 'ready' })
            .eq('id', lessonId);
        });
        return { success: true, lessonId, skipped: true };
      }

      // Step 2: Update status to generating
      await step.run('update-status-generating', async () => {
        await supabase
          .from('lessons')
          .update({ flashcard_status: 'generating' })
          .eq('id', lessonId);
      });

      const content = lesson.original_content;
      const wordCount = lesson.word_count || 1000;

      if (!content) {
        await step.run('mark-error', async () => {
          await supabase.from('lessons').update({ flashcard_status: 'error' }).eq('id', lessonId);
        });
        throw new Error('No content');
      }

      // Calculate flashcard count: 1 per 150 words, minimum 20, maximum 100
      const flashcardCount = Math.min(100, Math.max(20, Math.round(wordCount / 150)));
      
      console.log(`[Inngest] Word count: ${wordCount}, Generating ${flashcardCount} flashcards`);

      // Step 3: Generate flashcards in batches
      const flashcards = await step.run('generate-flashcards', async () => {
        const BATCH_SIZE = 15; // Generate 15 flashcards per API call for better consistency
        const allFlashcards: any[] = [];
        let remaining = flashcardCount;

        while (remaining > 0) {
          const batchSize = Math.min(BATCH_SIZE, remaining);
          console.log(`[Inngest] Generating flashcard batch: ${batchSize} flashcards (${remaining} remaining)`);

          const response = await fetchWithTimeout(
            'https://api.openai.com/v1/chat/completions',
            {
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
                    content: `You are an expert educational content creator specializing in creating effective flashcards for learning and memorization.

Create exactly ${batchSize} flashcards based on the provided learning material.

Guidelines:
1. Focus on key concepts, definitions, important facts, and relationships
2. Front of card: Clear, concise question or term (keep it short and focused)
3. Back of card: Complete, accurate answer or definition (can be 1-3 sentences)
4. Mix different types of flashcards:
   - Key terms and definitions
   - Concept questions and explanations
   - Important facts and details
   - Cause and effect relationships
   - Examples and applications
5. Progress from basic to more advanced concepts
6. Make questions specific and unambiguous
7. Keep answers clear and memorable

Format your response as a JSON object with this structure:
{
  "flashcards": [
    {
      "front": "Question or term",
      "back": "Answer or definition"
    }
  ]
}`
                  },
                  {
                    role: 'user',
                    content: `Create exactly ${batchSize} flashcards based on this learning material:

Title: ${lesson.title || 'Untitled'}
Subject: ${lesson.subject || 'General'}

Content:
${content.substring(0, 8000)}`
                  }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.7
              })
            },
            180000
          );

          if (!response.ok) {
            const errorText = await response.text();
            console.error('[Inngest] Flashcard generation error:', errorText);
            throw new Error('Flashcard generation failed');
          }

          const data = await response.json();
          const parsed = JSON.parse(data.choices[0].message.content || '{}');
          const batchFlashcards = parsed.flashcards || [];
          allFlashcards.push(...batchFlashcards);
          
          remaining -= batchFlashcards.length;
          
          // If we got fewer than requested, we might have hit the limit, but continue
          if (batchFlashcards.length < batchSize && remaining > 0) {
            console.log(`[Inngest] Got ${batchFlashcards.length} instead of ${batchSize}, continuing...`);
          }

          // Small delay between batches to avoid rate limits
          if (remaining > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        // Return exactly the requested count (trim if we got more)
        const finalFlashcards = allFlashcards.slice(0, flashcardCount);
        
        if (finalFlashcards.length === 0) {
          throw new Error('No flashcards generated');
        }

        console.log(`[Inngest] Generated ${finalFlashcards.length} flashcards`);
        return finalFlashcards;
      });

      // Step 4: Save flashcards to database
      await step.run('save-flashcards', async () => {
        const flashcardsToInsert = flashcards.map((card: any, index: number) => ({
          lesson_id: lessonId,
          front: card.front,
          back: card.back,
          order_index: index,
        }));

        const { error: insertError } = await supabase
          .from('flashcards')
          .insert(flashcardsToInsert);

        if (insertError) {
          console.error('[Inngest] Error inserting flashcards:', insertError);
          throw new Error(`Failed to save flashcards: ${insertError.message}`);
        }

        console.log(`[Inngest] Saved ${flashcardsToInsert.length} flashcards`);
      });

      // Step 5: Update status to ready
      await step.run('update-status-ready', async () => {
        await supabase
          .from('lessons')
          .update({ flashcard_status: 'ready' })
          .eq('id', lessonId);
      });

      console.log('[Inngest] ✅ Flashcard generation complete');
      return { success: true, lessonId, count: flashcards.length };
    } catch (error) {
      // Mark lesson as error on failure
      console.error('[Inngest] Error generating flashcards:', error);
      await supabase.from('lessons').update({ flashcard_status: 'error' }).eq('id', lessonId);
      throw error;
    }
  }
);

