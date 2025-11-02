-- Create quizzes table
-- Supports multiple quizzes per lesson with configurable question types

CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  question_types JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of selected types: ['multiple_choice', 'true_false', 'fill_in_blank']
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'ready', 'error')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX quizzes_lesson_id_idx ON quizzes(lesson_id);
CREATE INDEX quizzes_status_idx ON quizzes(status);

-- Row Level Security
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read quizzes for their own lessons
CREATE POLICY "Users can read their own lesson quizzes"
  ON quizzes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = quizzes.lesson_id
      AND lessons.user_id = (SELECT auth.uid())
    )
  );

-- Policy: Users can create quizzes for their own lessons
CREATE POLICY "Users can create quizzes for their own lessons"
  ON quizzes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = quizzes.lesson_id
      AND lessons.user_id = (SELECT auth.uid())
    )
  );

-- Policy: Service role can manage quizzes (for Inngest generation)
CREATE POLICY "Service role can manage quizzes"
  ON quizzes
  FOR ALL
  USING (true);

-- Add comments for documentation
COMMENT ON TABLE quizzes IS 'Quizzes for lessons - supports multiple quizzes per lesson';
COMMENT ON COLUMN quizzes.question_types IS 'Array of question types included in this quiz: multiple_choice, true_false, fill_in_blank';
COMMENT ON COLUMN quizzes.status IS 'Generation status: pending, generating, ready, or error';



