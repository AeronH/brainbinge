-- Add original_content column to lessons table
-- This stores the raw user input material used to generate the lesson

ALTER TABLE lessons
ADD COLUMN original_content TEXT;

-- Add comment for documentation
COMMENT ON COLUMN lessons.original_content IS 'Original user-provided content (text/paste/file content) used to generate the lesson outline';












