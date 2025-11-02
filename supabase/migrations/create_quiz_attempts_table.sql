-- Create quiz_attempts table
-- Stores user quiz attempts and scores

CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL, -- Array of {question_id, user_answer, is_correct}
  score NUMERIC NOT NULL CHECK (score >= 0 AND score <= 100),
  completed_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX quiz_attempts_lesson_id_idx ON quiz_attempts(lesson_id);
CREATE INDEX quiz_attempts_user_id_idx ON quiz_attempts(user_id);
CREATE INDEX quiz_attempts_completed_at_idx ON quiz_attempts(completed_at DESC);

-- Row Level Security
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own quiz attempts
CREATE POLICY "Users can read their own quiz attempts"
  ON quiz_attempts
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- Policy: Users can insert their own quiz attempts
CREATE POLICY "Users can insert their own quiz attempts"
  ON quiz_attempts
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Policy: Users can delete their own quiz attempts
CREATE POLICY "Users can delete their own quiz attempts"
  ON quiz_attempts
  FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- Add comments for documentation
COMMENT ON TABLE quiz_attempts IS 'User quiz attempts and scores';
COMMENT ON COLUMN quiz_attempts.answers IS 'Array of answer objects: [{question_id, user_answer, is_correct}]';
COMMENT ON COLUMN quiz_attempts.score IS 'Percentage score (0-100)';












