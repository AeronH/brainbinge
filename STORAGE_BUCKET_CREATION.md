# Creating the podcast-audio Storage Bucket

## Overview

The `podcast-audio` bucket is specifically for podcast-related content:
- Voice preview audio files
- Podcast episode audio files

This is **separate** from the `lesson-audio` bucket which is used for Learn Mode walkthrough audio.

## Quick Steps

### Option 1: Via Supabase Dashboard (Easiest)

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your "BrainBinge" project

2. **Navigate to Storage**
   - Click "Storage" in the left sidebar
   - Click the "New bucket" button

3. **Create the bucket**
   - **Name**: `podcast-audio`
   - **Public bucket**: ✅ Yes (check this box)
   - Click "Create bucket"

4. **Verify it's public**
   - Click on the `podcast-audio` bucket
   - Go to "Configuration" tab
   - Ensure "Public bucket" is toggled ON

### Option 2: Via SQL (Alternative)

If you prefer SQL, run this in your Supabase SQL Editor:

```sql
-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('podcast-audio', 'podcast-audio', true);

-- Verify it was created
SELECT * FROM storage.buckets WHERE name = 'podcast-audio';
```

## Bucket Configuration

**Bucket Name**: `podcast-audio`
**Public Access**: Yes (required for playing audio in browser)
**File Types**: Audio files (MP3)
**Purpose**: Podcast episodes and voice previews

### Why Public?

The bucket needs to be public so that:
- Voice preview audio can play in the modal
- Podcast audio can play in the PodcastPlayer
- Browser can directly access the audio URLs

## Storage Organization

Your Supabase project should have TWO storage buckets:

1. **`lesson-audio`** (existing) - Learn Mode walkthrough audio
2. **`podcast-audio`** (new) - Podcast episodes and voice previews

### File Naming Convention

Files stored in the `podcast-audio` bucket:
- **Voice Previews**: `voice_preview_{voiceId}_{timestamp}.mp3`
- **Podcast Audio**: `podcast_{lessonId}_turn_{turnIndex}_{timestamp}.mp3`

Example:
```
podcast-audio/
  ├── voice_preview_694f9389_1735678901234.mp3
  ├── voice_preview_79a125e8_1735678901235.mp3
  ├── podcast_abc123_turn_0_1735678902345.mp3
  ├── podcast_abc123_turn_1_1735678902346.mp3
  └── ...

lesson-audio/ (existing - DO NOT MODIFY)
  ├── walkthrough_audio_files...
  └── ...
```

## Security Considerations

### Current Setup (Public Bucket)
✅ **Pros**:
- Simple to implement
- Works immediately in browser
- No additional authentication needed

⚠️ **Cons**:
- Anyone with the URL can access the audio
- Consider if this is acceptable for your use case

### Alternative: Private Bucket with RLS (Optional)

If you need private audio files:

```sql
-- Make bucket private
UPDATE storage.buckets 
SET public = false 
WHERE name = 'podcast-audio';

-- Create RLS policy for authenticated users
CREATE POLICY "Users can access their own audio files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'podcast-audio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

Then update the code to use signed URLs instead of public URLs.

## Verification

After creating the bucket, verify it works:

### 1. Check bucket exists
```sql
SELECT * FROM storage.buckets WHERE name = 'podcast-audio';
```

Should return:
```
id            | name          | public
--------------|---------------|--------
podcast-audio | podcast-audio | true
```

### 2. Test upload (via Supabase Dashboard)
- Go to Storage → podcast-audio
- Click "Upload file"
- Upload any MP3 file
- Click on the file
- Copy the public URL
- Try opening the URL in your browser - should play audio

### 3. Test from your app
Once the bucket is created, run the voice preview seed endpoint:
```
POST http://localhost:3000/api/cartesia/previews/seed
```

This will:
- Generate 6 voice preview audio files
- Upload them to the `podcast-audio` bucket
- Save the URLs in the database

## Troubleshooting

### "Bucket not found" error
- Make sure bucket name is exactly `podcast-audio` (no spaces, lowercase)
- Check bucket exists in Supabase Dashboard → Storage
- **Note**: `lesson-audio` is a different bucket for Learn Mode audio

### "Access denied" error
- Make sure the `podcast-audio` bucket is set to public
- Check the "Public bucket" toggle is ON

### CORS issues
If you get CORS errors when playing audio:

1. Go to Storage settings in Supabase
2. Add CORS configuration:
```json
{
  "allowedOrigins": ["http://localhost:3000", "https://your-production-domain.com"],
  "allowedMethods": ["GET"],
  "allowedHeaders": ["*"],
  "maxAge": 3600
}
```

### Files not appearing
- Check upload was successful in Supabase Dashboard
- Verify public URL format: `https://[project-ref].supabase.co/storage/v1/object/public/podcast-audio/[filename]`
- Try accessing the URL directly in browser

## Size Limits

Default Supabase Storage limits:
- **Free tier**: 1 GB storage
- **Pro tier**: 100 GB storage

Estimated usage:
- Voice preview: ~50 KB each × 6 = ~300 KB total
- Podcast episode: ~100 KB per turn × 30 turns = ~3 MB per podcast

You can store ~300 podcasts in the free tier.

## Next Steps After Creating Bucket

1. ✅ Create the `podcast-audio` bucket (you're doing this now)
2. Run voice preview seed: `POST /api/cartesia/previews/seed`
3. Generate a test podcast to verify storage works
4. Check the Storage → podcast-audio tab in Supabase to see your files

## Important Notes

- **DO NOT** delete or modify the existing `lesson-audio` bucket - it's used for Learn Mode
- The `podcast-audio` bucket is specifically for podcast feature
- Both buckets should be public for audio playback to work

## Common Issues

**Issue**: "Cannot read properties of null (reading 'publicUrl')"
**Solution**: The bucket doesn't exist. Create it first.

**Issue**: Audio won't play in browser
**Solution**: Make sure bucket is public, not private.

**Issue**: Upload fails with permission error
**Solution**: Check your service role key is correctly set in `.env.local`

