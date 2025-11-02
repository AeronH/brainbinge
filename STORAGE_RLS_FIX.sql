-- Fix Storage RLS for podcast-audio bucket
-- Run this in Supabase SQL Editor

-- Drop existing policies if they exist (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Allow authenticated users to upload podcast audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to podcast audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update podcast audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete podcast audio" ON storage.objects;

-- Allow authenticated users to upload to podcast-audio bucket
CREATE POLICY "Allow authenticated users to upload podcast audio"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'podcast-audio');

-- Allow public read access to podcast-audio bucket
CREATE POLICY "Allow public read access to podcast audio"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'podcast-audio');

-- Allow authenticated users to update their own files
CREATE POLICY "Allow authenticated users to update podcast audio"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'podcast-audio')
WITH CHECK (bucket_id = 'podcast-audio');

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated users to delete podcast audio"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'podcast-audio');

