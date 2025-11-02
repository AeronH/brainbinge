# Supabase Storage Bucket Setup

## What Changed

The audio system has been upgraded to store audio files in **Supabase Storage** instead of in the database metadata column. This fixes the issue where large audio files (400KB+) were being truncated when stored in JSONB.

## Required Setup

You need to create a **Storage Bucket** in Supabase to store the audio files.

### Step 1: Create Storage Bucket

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on **Storage** in the left sidebar
4. Click **New bucket**
5. Configure the bucket:
   - **Name:** `lesson-audio`
   - **Public bucket:** ✅ **YES** (enable this!)
   - Click **Create bucket**

### Step 2: Set up Storage Policy

To allow authenticated users to upload and access audio files, set up RLS policies:

1. In the Storage page, click on the `lesson-audio` bucket
2. Click on **Policies** tab
3. Click **New Policy**
4. Add the following policies:

**Policy 1: Allow authenticated users to upload**
```sql
CREATE POLICY "Authenticated users can upload audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lesson-audio');
```

**Policy 2: Allow public to read**
```sql
CREATE POLICY "Public can view audio"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'lesson-audio');
```

**Policy 3: Allow authenticated users to update their audio**
```sql
CREATE POLICY "Authenticated users can update audio"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'lesson-audio')
WITH CHECK (bucket_id = 'lesson-audio');
```

### Quick SQL Setup (Alternative)

Or run this in the **SQL Editor** in Supabase:

```sql
-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-audio', 'lesson-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Set up policies
CREATE POLICY IF NOT EXISTS "Authenticated users can upload audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lesson-audio');

CREATE POLICY IF NOT EXISTS "Public can view audio"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'lesson-audio');

CREATE POLICY IF NOT EXISTS "Authenticated users can update audio"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'lesson-audio')
WITH CHECK (bucket_id = 'lesson-audio');
```

## How It Works Now

### Backend (API)
1. Message is created in database first (to get message ID)
2. Audio is generated via Speechify TTS
3. Audio is uploaded to `lesson-audio/message-audio/{messageId}.mp3`
4. Public URL is retrieved from Storage
5. Message is updated with `audioUrl` in metadata

### Frontend
1. Receives message with `metadata.audioUrl`
2. Creates HTML5 Audio element with the URL
3. Automatically plays audio when message arrives
4. Shows play/pause/restart controls

## Testing

After setting up the bucket, test the audio:

1. Create a new lesson
2. Select a voice
3. Start "Guided Learn" mode
4. Click "Ready"

You should see in the console:
```
[Storage] Converting to buffer. Buffer size: 300000
[Storage] Audio uploaded successfully: message-audio/xxx.mp3
[Storage] Public URL: https://...supabase.co/storage/v1/object/public/lesson-audio/message-audio/xxx.mp3
[Audio Debug] Has audioUrl: true
[Audio] ✓ Audio playing successfully
```

## Benefits

✅ No more 400KB+ JSONB truncation issues  
✅ Proper file storage for media assets  
✅ Public URLs that work everywhere  
✅ Faster database queries (no large blobs)  
✅ Can enable CDN caching in the future  
✅ Better scalability  

## Troubleshooting

### Error: "Bucket does not exist"
- Make sure you created the `lesson-audio` bucket (exact name)

### Error: "new row violates row-level security policy"
- Check that policies are set up correctly
- Make sure the bucket is marked as **public**

### Error: "storage/object-not-found"
- Check that audio was uploaded successfully in server logs
- Verify the file path structure: `message-audio/{messageId}.mp3`

### Audio doesn't play
- Check browser console for CORS errors
- Verify the audioUrl in metadata
- Check that bucket is public

