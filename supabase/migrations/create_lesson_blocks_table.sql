-- Create lesson_blocks table for normalized lesson content
-- This replaces storing everything in the lessons.outline JSONB column

CREATE TABLE IF NOT EXISTS lesson_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'heading1', 'heading2', 'heading3', 'paragraph', 'bullet', 'callout', 'divider'
  content TEXT NOT NULL,
  order_index INTEGER NOT NULL, -- Order within the lesson
  callout_type TEXT, -- 'definition', 'example', 'question', 'tip', 'formula' (only for callout types)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for efficient querying by lesson
CREATE INDEX idx_lesson_blocks_lesson_id ON lesson_blocks(lesson_id);
CREATE INDEX idx_lesson_blocks_order ON lesson_blocks(lesson_id, order_index);

-- Add RLS policies
ALTER TABLE lesson_blocks ENABLE ROW LEVEL SECURITY;

-- Users can read blocks for their own lessons
CREATE POLICY "Users can read their own lesson blocks"
  ON lesson_blocks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = lesson_blocks.lesson_id
      AND lessons.user_id = auth.uid()
    )
  );

-- Service role can insert blocks (for Edge Function generation)
CREATE POLICY "Service role can insert lesson blocks"
  ON lesson_blocks
  FOR INSERT
  WITH CHECK (true);

-- Service role can update blocks
CREATE POLICY "Service role can update lesson blocks"
  ON lesson_blocks
  FOR UPDATE
  USING (true);

-- Service role can delete blocks
CREATE POLICY "Service role can delete lesson blocks"
  ON lesson_blocks
  FOR DELETE
  USING (true);

-- Add practice exercises table
CREATE TABLE IF NOT EXISTS lesson_practice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'exercise', 'review_question', 'key_takeaway'
  content TEXT NOT NULL,
  hint TEXT, -- Only for exercises
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_lesson_practice_lesson_id ON lesson_practice(lesson_id);
CREATE INDEX idx_lesson_practice_order ON lesson_practice(lesson_id, order_index);

-- Add RLS policies for practice
ALTER TABLE lesson_practice ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own lesson practice"
  ON lesson_practice
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = lesson_practice.lesson_id
      AND lessons.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage lesson practice"
  ON lesson_practice
  FOR ALL
  USING (true);

-- Add comment for documentation
COMMENT ON TABLE lesson_blocks IS 'Normalized storage for lesson content blocks (headings, paragraphs, callouts, etc.)';
COMMENT ON TABLE lesson_practice IS 'Practice exercises, review questions, and key takeaways for lessons';
COMMENT ON COLUMN lesson_blocks.type IS 'Block type: heading1, heading2, heading3, paragraph, bullet, callout, divider';
COMMENT ON COLUMN lesson_blocks.callout_type IS 'Callout variant: definition, example, question, tip, formula (only used when type=callout)';
COMMENT ON COLUMN lesson_practice.type IS 'Practice type: exercise, review_question, key_takeaway';





