import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { generateLesson } from '@/lib/inngest/functions/generate-lesson';
import { generatePodcast } from '@/lib/inngest/functions/generate-podcast';
import { generateFlashcards } from '@/lib/inngest/functions/generate-flashcards';
import { generateQuiz } from '@/lib/inngest/functions/generate-quiz';

// Create the Inngest serve handler
// This endpoint handles sync (GET/PUT) and events (POST)
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generateLesson,
    generatePodcast,
    generateFlashcards,
    generateQuiz,
  ],
});

