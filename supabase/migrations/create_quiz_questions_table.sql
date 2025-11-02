-- Create quiz_questions table
-- Stores AI-generated quiz questions for each lesson

CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  options JSONB, -- Array of options for multiple choice questions, null for other types
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX quiz_questions_lesson_id_idx ON quiz_questions(lesson_id);
CREATE INDEX quiz_questions_order_idx ON quiz_questions(lesson_id, order_index);

-- Row Level Security
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read quiz questions for their own lessons
CREATE POLICY "Users can read their own lesson quiz questions"
  ON quiz_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = quiz_questions.lesson_id
      AND lessons.user_id = (SELECT auth.uid())
    )
  );

-- Policy: Service role can insert quiz questions (for API generation)
CREATE POLICY "Service role can insert quiz questions"
  ON quiz_questions
  FOR INSERT
  WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE quiz_questions IS 'AI-generated quiz questions for lessons';
COMMENT ON COLUMN quiz_questions.question_type IS 'Type of question: multiple_choice, true_false, or short_answer';
COMMENT ON COLUMN quiz_questions.options IS 'Array of answer options for multiple choice questions (JSONB array of strings)';
COMMENT ON COLUMN quiz_questions.correct_answer IS 'The correct answer (option text for MC, true/false for T/F, example answer for short answer)';
COMMENT ON COLUMN quiz_questions.explanation IS 'Explanation of why this answer is correct';












