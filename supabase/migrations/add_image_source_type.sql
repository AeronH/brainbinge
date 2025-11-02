-- Add 'image' as a valid source_type for lessons
-- This allows users to upload images (PNG, JPG, WEBP) and extract text using OCR

-- First, drop the existing constraint if it exists
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_source_type_check;

-- Recreate the constraint with 'image' included
ALTER TABLE lessons
ADD CONSTRAINT lessons_source_type_check
CHECK (source_type IS NULL OR source_type IN ('pdf', 'link', 'text', 'image'));

-- Add comment for documentation
COMMENT ON COLUMN lessons.source_type IS 'Type of lesson source: pdf, link, text, or image';

