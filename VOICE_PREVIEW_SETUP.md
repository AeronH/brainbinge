# Voice Preview Setup Guide

## Overview

Voice previews are now pre-generated and stored in the database to avoid calling the Cartesia API every time a user clicks a preview button.

## Setup Steps

### 1. Database Migration (Already Done)

Created `voice_previews` table with:
- `voice_id` - Cartesia voice ID
- `voice_name` - Display name
- `preview_text` - Text used for preview
- `audio_url` - Supabase Storage URL

### 2. Generate Voice Previews

You need to seed the voice previews once. This will generate audio for all preset voices and store them.

**Option A: Using API Endpoint (Recommended)**

1. Make sure you're logged in to the app
2. Call the seed endpoint:

```bash
curl -X POST http://localhost:3000/api/cartesia/previews/seed \
  -H "Cookie: your-session-cookie"
```

Or visit in browser (while logged in):
```
http://localhost:3000/api/cartesia/previews/seed
```

**Option B: Using Node Script**

Create a one-time script:

```typescript
// scripts/seed-voice-previews.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seedPreviews() {
  const response = await fetch('http://localhost:3000/api/cartesia/previews/seed', {
    method: 'POST',
  });
  const data = await response.json();
  console.log(data);
}

seedPreviews();
```

### 3. Verify Previews

Check the database:

```sql
SELECT voice_id, voice_name, audio_url FROM voice_previews;
```

Should see 6 rows (one for each voice preset).

### 4. Update Voice IDs (If Needed)

If you want to use different Cartesia voices:

1. Update `/src/lib/cartesia-voices.ts` with new voice IDs
2. Delete existing previews:
```sql
DELETE FROM voice_previews;
```
3. Re-run the seed endpoint

## How It Works

### Before (❌ Bad)
```
User clicks preview
  → API call to /api/cartesia/preview
  → Generate audio with Cartesia (costs money + slow)
  → Play audio
  → Discard audio
  
Every click = New API call = $$$
```

### After (✅ Good)
```
First time setup:
  → Seed endpoint generates all previews
  → Uploads to Supabase Storage
  → Saves URLs in database

User clicks preview:
  → Fetch preview URLs from DB (cached)
  → Play stored audio file
  → No Cartesia API call
  
Preview clicks = Free & instant!
```

## Podcast Audio Storage

### Current Implementation (Already Working ✅)

When a podcast is generated:

1. **OpenAI generates conversation script** (stored as JSON in `transcript` field)
2. **For each dialogue turn:**
   - Generate audio with Cartesia
   - Upload to Supabase Storage: `lesson-audio/podcast_{lessonId}_turn_{i}_{timestamp}.mp3`
   - Get public URL
   - Store URL in transcript

3. **Save to database:**
```sql
INSERT INTO lesson_podcasts (
  lesson_id,
  user_id,
  tone,
  voice_1,
  voice_2,
  transcript -- Contains: [{speaker, text, audioUrl}, ...]
)
```

### When User Plays Podcast

1. **PodcastMode fetches podcast:**
```typescript
const { data: podcast } = await supabase
  .from("lesson_podcasts")
  .select("*")
  .eq("lesson_id", lessonId)
```

2. **PodcastPlayer loads audio from stored URLs:**
```typescript
transcript.forEach(turn => {
  const audio = new Audio(turn.audioUrl); // Already in Storage!
  audio.play();
});
```

### Result

✅ Podcasts are generated ONCE
✅ Audio files stored in Supabase Storage
✅ Re-listening = FREE (no regeneration)
✅ Instant playback from storage

## Storage Bucket Setup

Make sure you have the `lesson-audio` bucket in Supabase:

1. Go to Supabase Dashboard → Storage
2. Create bucket named `lesson-audio`
3. Make it public (or configure RLS if you want private)
4. Set appropriate CORS if needed

## Cost Savings

### Voice Previews
- **Before**: 10 users × 6 voices × 3 previews each = 180 API calls
- **After**: 6 API calls (one-time setup) = **96.7% cost reduction**

### Podcasts
- **Before**: User listens 5 times = 5× generation cost
- **After**: Generated once, played 5 times = **80% cost reduction**

## Maintenance

### Adding New Voices

1. Add to `PODCAST_VOICE_PRESETS` in `/src/lib/cartesia-voices.ts`
2. Run seed endpoint again (skips existing, adds new)

### Regenerating Previews

If voice quality improves or you want to update:

```sql
-- Delete specific voice
DELETE FROM voice_previews WHERE voice_id = 'voice-id-here';

-- Or delete all
DELETE FROM voice_previews;
```

Then re-run seed endpoint.

## Troubleshooting

### Preview not playing?

1. Check database has previews:
```sql
SELECT COUNT(*) FROM voice_previews;
```
Should be 6 (or number of presets).

2. Check Storage bucket exists and is public
3. Check audio URLs are accessible (try opening in browser)
4. Check browser console for errors

### Podcast regenerating every time?

1. Verify podcast saved in database:
```sql
SELECT * FROM lesson_podcasts WHERE lesson_id = 'your-lesson-id';
```

2. Check `transcript` field has audio URLs:
```json
[
  {
    "speaker": 1,
    "text": "...",
    "audioUrl": "https://....supabase.co/storage/v1/object/public/lesson-audio/..."
  }
]
```

3. Verify Storage files exist

## Files Changed

- `src/app/api/cartesia/previews/seed/route.ts` - Seed endpoint
- `src/app/api/cartesia/previews/route.ts` - Get previews
- `src/components/modals/PodcastVoiceModal.tsx` - Use stored previews
- `VOICE_PREVIEW_SETUP.md` - This file

## Migration Applied

```sql
CREATE TABLE voice_previews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voice_id TEXT NOT NULL UNIQUE,
  voice_name TEXT NOT NULL,
  preview_text TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voice_previews_voice_id ON voice_previews(voice_id);
```

