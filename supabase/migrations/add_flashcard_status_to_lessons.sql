-- Add flashcard_status column to lessons table
ALTER TABLE lessons
ADD COLUMN flashcard_status TEXT DEFAULT 'pending' CHECK (flashcard_status IN ('pending', 'generating', 'ready', 'error'));

COMMENT ON COLUMN lessons.flashcard_status IS 'Status of flashcard generation: pending, generating, ready, or error';



