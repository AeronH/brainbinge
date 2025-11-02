-- Update quiz_questions table to support new quiz structure
-- Add quiz_id, update question_type constraint, add missing_word field

-- First, delete all existing quiz_questions since they don't have quiz_id and won't work with new structure
DELETE FROM quiz_questions;

-- Drop RLS policies first (they depend on lesson_id)
DROP POLICY IF EXISTS "Users can read their own lesson quiz questions" ON quiz_questions;
DROP POLICY IF EXISTS "Service role can insert quiz questions" ON quiz_questions;

-- Remove lesson_id foreign key constraint
ALTER TABLE quiz_questions
DROP CONSTRAINT IF EXISTS quiz_questions_lesson_id_fkey;

-- Drop lesson_id column (no longer needed - questions belong to quizzes)
ALTER TABLE quiz_questions
DROP COLUMN IF EXISTS lesson_id;

-- Add quiz_id column
ALTER TABLE quiz_questions
ADD COLUMN quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE;

-- Add missing_word column for fill-in-blank questions
ALTER TABLE quiz_questions
ADD COLUMN missing_word TEXT;

-- Drop old question_type constraint
ALTER TABLE quiz_questions
DROP CONSTRAINT IF EXISTS quiz_questions_question_type_check;

-- Add new constraint with fill_in_blank instead of short_answer
ALTER TABLE quiz_questions
ADD CONSTRAINT quiz_questions_question_type_check 
CHECK (question_type IN ('multiple_choice', 'true_false', 'fill_in_blank'));

-- Update indexes
DROP INDEX IF EXISTS quiz_questions_lesson_id_idx;
DROP INDEX IF EXISTS quiz_questions_order_idx;

CREATE INDEX quiz_questions_quiz_id_idx ON quiz_questions(quiz_id);
CREATE INDEX quiz_questions_order_idx ON quiz_questions(quiz_id, order_index);

-- Create new RLS policies
-- Policy: Users can read quiz questions for their own quizzes
CREATE POLICY "Users can read their own quiz questions"
  ON quiz_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quizzes
      JOIN lessons ON lessons.id = quizzes.lesson_id
      WHERE quizzes.id = quiz_questions.quiz_id
      AND lessons.user_id = (SELECT auth.uid())
    )
  );

-- Policy: Service role can manage quiz questions (for Inngest generation)
CREATE POLICY "Service role can manage quiz questions"
  ON quiz_questions
  FOR ALL
  USING (true);

-- Update comments
COMMENT ON TABLE quiz_questions IS 'AI-generated quiz questions for quizzes';
COMMENT ON COLUMN quiz_questions.question_type IS 'Type of question: multiple_choice, true_false, or fill_in_blank';
COMMENT ON COLUMN quiz_questions.missing_word IS 'The correct word/phrase for fill_in_blank questions';

