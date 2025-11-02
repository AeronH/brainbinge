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

export const generateQuiz = inngest.createFunction(
  { 
    id: 'generate-quiz', 
    name: 'Generate Quiz',
    retries: 0,
  },
  { event: 'quiz/generate' },
  async ({ event, step }) => {
    const { quizId, lessonId, questionTypes } = event.data;

    if (!quizId || !lessonId || !questionTypes || !Array.isArray(questionTypes) || questionTypes.length === 0) {
      throw new Error('quizId, lessonId, and questionTypes array required');
    }

    console.log(`[Inngest] Starting quiz generation for quiz: ${quizId}, lesson: ${lessonId}, types: ${questionTypes.join(', ')}`);

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
      // Step 1: Fetch lesson and quiz
      const { lesson, quiz } = await step.run('fetch-data', async () => {
        console.log(`[Inngest] Fetching lesson ${lessonId} and quiz ${quizId}...`);
        
        const [lessonResult, quizResult] = await Promise.all([
          supabase.from('lessons').select('*').eq('id', lessonId).single(),
          supabase.from('quizzes').select('*').eq('id', quizId).single()
        ]);

        if (lessonResult.error) {
          throw new Error(`Lesson not found: ${lessonResult.error.message}`);
        }
        if (quizResult.error) {
          throw new Error(`Quiz not found: ${quizResult.error.message}`);
        }

        if (!lessonResult.data || !quizResult.data) {
          throw new Error('Lesson or quiz not found');
        }

        return {
          lesson: lessonResult.data as any,
          quiz: quizResult.data as any
        };
      });

      const content = lesson.original_content;
      const wordCount = lesson.word_count || 1000;

      if (!content) {
        await step.run('mark-error', async () => {
          await supabase.from('quizzes').update({ status: 'error' }).eq('id', quizId);
        });
        throw new Error('No content');
      }

      // Calculate total question count: 1 per 150 words, minimum 20, maximum 100
      const totalQuestionCount = Math.min(100, Math.max(20, Math.round(wordCount / 150)));
      
      // Distribute questions across selected types proportionally
      const questionsPerType = Math.floor(totalQuestionCount / questionTypes.length);
      const remainder = totalQuestionCount % questionTypes.length;
      
      const typeCounts: Record<string, number> = {};
      questionTypes.forEach((type: string, index: number) => {
        typeCounts[type] = questionsPerType + (index < remainder ? 1 : 0);
      });

      console.log(`[Inngest] Word count: ${wordCount}, Total questions: ${totalQuestionCount}`);
      console.log(`[Inngest] Distribution:`, typeCounts);

      // Step 2: Update quiz status to generating
      await step.run('update-status-generating', async () => {
        await supabase
          .from('quizzes')
          .update({ status: 'generating' })
          .eq('id', quizId);
      });

      // Step 3: Generate questions for each type in parallel batches
      const allQuestions = await step.run('generate-questions', async () => {
        const questionPromises = questionTypes.map(async (questionType: string) => {
          const count = typeCounts[questionType];
          
          if (questionType === 'multiple_choice') {
            return generateMultipleChoiceQuestions(content, lesson, count, OPENAI_API_KEY);
          } else if (questionType === 'true_false') {
            return generateTrueFalseQuestions(content, lesson, count, OPENAI_API_KEY);
          } else if (questionType === 'fill_in_blank') {
            return generateFillInBlankQuestions(content, lesson, count, OPENAI_API_KEY);
          } else {
            throw new Error(`Unknown question type: ${questionType}`);
          }
        });

        const results = await Promise.all(questionPromises);
        const flatQuestions = results.flat();
        
        // Shuffle questions to mix types together using Fisher-Yates shuffle
        for (let i = flatQuestions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [flatQuestions[i], flatQuestions[j]] = [flatQuestions[j], flatQuestions[i]];
        }
        
        return flatQuestions;
      });

      // Step 4: Save questions to database
      await step.run('save-questions', async () => {
        const questionsToInsert = allQuestions.map((q: any, index: number) => ({
          quiz_id: quizId,
          question: q.question || q.question_text || '',
          question_type: q.question_type,
          options: q.options || null,
          correct_answer: q.correct_answer || q.missing_word || '',
          explanation: q.explanation || '',
          missing_word: q.missing_word || null,
          order_index: index,
        }));

        const { error: insertError } = await supabase
          .from('quiz_questions')
          .insert(questionsToInsert);

        if (insertError) {
          console.error('[Inngest] Error inserting questions:', insertError);
          throw new Error(`Failed to save questions: ${insertError.message}`);
        }

        console.log(`[Inngest] Saved ${questionsToInsert.length} questions`);
      });

      // Step 5: Update quiz status to ready
      await step.run('update-status-ready', async () => {
        await supabase
          .from('quizzes')
          .update({ status: 'ready' })
          .eq('id', quizId);
      });

      console.log('[Inngest] ✅ Quiz generation complete');
      return { success: true, quizId, count: allQuestions.length };
    } catch (error) {
      // Mark quiz as error on failure
      console.error('[Inngest] Error generating quiz:', error);
      await supabase.from('quizzes').update({ status: 'error' }).eq('id', quizId);
      throw error;
    }
  }
);

async function generateMultipleChoiceQuestions(
  content: string,
  lesson: any,
  count: number,
  apiKey: string
): Promise<any[]> {
  const BATCH_SIZE = 12; // Generate 12 questions per API call for better consistency
  const allQuestions: any[] = [];
  let remaining = count;

  while (remaining > 0) {
    const batchSize = Math.min(BATCH_SIZE, remaining);
    console.log(`[Inngest] Generating multiple choice batch: ${batchSize} questions (${remaining} remaining)`);

    const response = await fetchWithTimeout(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an expert educational assessment creator. Generate multiple choice quiz questions that test understanding, not just memorization.

Create exactly ${batchSize} multiple choice questions with these guidelines:
1. Each question must have exactly 4 options (A, B, C, D)
2. Only one option should be clearly correct
3. Other options should be plausible but incorrect
4. Mix difficulty levels (easy, medium, hard)
5. Questions should test comprehension, analysis, and application - not just recall
6. Include detailed explanations for why the correct answer is right

Format your response as a JSON object with this structure:
{
  "questions": [
    {
      "question": "Question text here?",
      "question_type": "multiple_choice",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "explanation": "Detailed explanation of why this is correct"
    }
  ]
}`
            },
            {
              role: 'user',
              content: `Create exactly ${batchSize} multiple choice questions based on this learning material:

Title: ${lesson.title || 'Untitled'}
Subject: ${lesson.subject || 'General'}

Content:
${content.substring(0, 8000)}`
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.8
        })
      },
      180000
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Inngest] Multiple choice generation error:', errorText);
      throw new Error('Multiple choice question generation failed');
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content || '{}');
    const batchQuestions = parsed.questions || [];
    allQuestions.push(...batchQuestions);
    
    remaining -= batchQuestions.length;
    
    // If we got fewer than requested, we might have hit the limit, but continue
    if (batchQuestions.length < batchSize && remaining > 0) {
      console.log(`[Inngest] Got ${batchQuestions.length} instead of ${batchSize}, continuing...`);
    }

    // Small delay between batches to avoid rate limits
    if (remaining > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Return exactly the requested count (trim if we got more)
  return allQuestions.slice(0, count);
}

async function generateTrueFalseQuestions(
  content: string,
  lesson: any,
  count: number,
  apiKey: string
): Promise<any[]> {
  const BATCH_SIZE = 12; // Generate 12 questions per API call for better consistency
  const allQuestions: any[] = [];
  let remaining = count;

  while (remaining > 0) {
    const batchSize = Math.min(BATCH_SIZE, remaining);
    console.log(`[Inngest] Generating true/false batch: ${batchSize} questions (${remaining} remaining)`);

    const response = await fetchWithTimeout(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an expert educational assessment creator. Generate true/false quiz questions that test understanding.

Create exactly ${batchSize} true/false questions with these CRITICAL guidelines:
1. Statements should be clear and unambiguous
2. Mix true and false statements (roughly 50/50)
3. False statements should be plausible but incorrect
4. Questions should test comprehension, not just recall
5. Include detailed explanations for why each answer is correct

CRITICAL: The correct_answer field MUST accurately reflect whether the statement is actually TRUE or FALSE.
- If the statement is factually correct, correct_answer must be "true"
- If the statement is factually incorrect, correct_answer must be "false"
- The explanation must clearly explain why the statement is true or false, and must match the correct_answer value

Format your response as a JSON object with this structure:
{
  "questions": [
    {
      "question": "Statement here that is either true or false.",
      "question_type": "true_false",
      "correct_answer": "true",
      "explanation": "Detailed explanation of why this statement is true or false, matching the correct_answer"
    }
  ]
}`
            },
            {
              role: 'user',
              content: `Create exactly ${batchSize} true/false questions based on this learning material:

Title: ${lesson.title || 'Untitled'}
Subject: ${lesson.subject || 'General'}

Content:
${content.substring(0, 8000)}`
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.8
        })
      },
      180000
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Inngest] True/false generation error:', errorText);
      throw new Error('True/false question generation failed');
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content || '{}');
    const batchQuestions = parsed.questions || [];
    allQuestions.push(...batchQuestions);
    
    remaining -= batchQuestions.length;
    
    // If we got fewer than requested, we might have hit the limit, but continue
    if (batchQuestions.length < batchSize && remaining > 0) {
      console.log(`[Inngest] Got ${batchQuestions.length} instead of ${batchSize}, continuing...`);
    }

    // Small delay between batches to avoid rate limits
    if (remaining > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Return exactly the requested count (trim if we got more)
  return allQuestions.slice(0, count);
}

async function generateFillInBlankQuestions(
  content: string,
  lesson: any,
  count: number,
  apiKey: string
): Promise<any[]> {
  const BATCH_SIZE = 12; // Generate 12 questions per API call for better consistency
  const allQuestions: any[] = [];
  let remaining = count;

  while (remaining > 0) {
    const batchSize = Math.min(BATCH_SIZE, remaining);
    console.log(`[Inngest] Generating fill-in-blank batch: ${batchSize} questions (${remaining} remaining)`);

    const response = await fetchWithTimeout(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an expert educational assessment creator. Generate fill-in-the-blank questions that test understanding of key concepts.

Create exactly ${batchSize} fill-in-the-blank questions with these guidelines:
1. Each question should have ONE blank represented by underscores (_____)
2. The blank should be a key term, concept, or important word from the lesson
3. The sentence should provide enough context to deduce the answer
4. Mix difficulty levels (easy, medium, hard)
5. Questions should test comprehension and application, not just recall
6. Include detailed explanations for why each answer is correct
7. The missing word should be 1-3 words maximum

Format your response as a JSON object with this structure:
{
  "questions": [
    {
      "question_text": "The process of _____ involves converting light energy into chemical energy.",
      "question_type": "fill_in_blank",
      "missing_word": "photosynthesis",
      "explanation": "Photosynthesis is the biological process where plants convert light energy (usually from the sun) into chemical energy stored in glucose molecules."
    }
  ]
}

Important: 
- The question_text must contain exactly one blank marked with underscores (_____) 
- The missing_word should be the exact word/phrase that belongs in the blank
- Don't include the answer in the question_text`
            },
            {
              role: 'user',
              content: `Create exactly ${batchSize} fill-in-the-blank questions based on this learning material:

Title: ${lesson.title || 'Untitled'}
Subject: ${lesson.subject || 'General'}

Content:
${content.substring(0, 8000)}`
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.8
        })
      },
      180000
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Inngest] Fill-in-blank generation error:', errorText);
      throw new Error('Fill-in-blank question generation failed');
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content || '{}');
    const batchQuestions = parsed.questions || [];
    allQuestions.push(...batchQuestions);
    
    remaining -= batchQuestions.length;
    
    // If we got fewer than requested, we might have hit the limit, but continue
    if (batchQuestions.length < batchSize && remaining > 0) {
      console.log(`[Inngest] Got ${batchQuestions.length} instead of ${batchSize}, continuing...`);
    }

    // Small delay between batches to avoid rate limits
    if (remaining > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Return exactly the requested count (trim if we got more)
  return allQuestions.slice(0, count);
}

