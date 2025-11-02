# Speechify TTS Debugging Guide

## How Audio Should Work

### 1. Lesson Creation
- User selects personality (e.g., Snoop Dogg)
- Personality maps to Speechify voice ID: `81dd4427-89aa-4a1a-9527-d225b44f7b28`
- Voice ID stored in `lessons.voice_style` field

### 2. Message Generation (Server-Side)
When user clicks "Ready" or "Continue":
1. `/api/lessons/walkthrough/next` generates text with GPT
2. Calls `generateMessageAudio(content, lesson.voice_style)`
3. Speechify API called: `POST /v1/audio/speech` with `voice_id` and `input`
4. Audio returned as MP3 buffer
5. Converted to base64 string
6. Stored in `message.metadata.audioData`
7. Message returned to client

### 3. Audio Playback (Client-Side)
When message arrives:
1. `LearnMode` component receives message
2. `useEffect` detects new assistant message
3. Checks `message.metadata.audioData` exists
4. Calls `playMessageAudio(messageId, audioData)`
5. Creates `Audio` element with base64 data URL
6. Calls `audio.play()`
7. Audio should play automatically

## Debug Checklist

### ✅ Step 1: Check Environment
```bash
# In .env.local
SPEECHIFY_API_KEY=your_key_here
```

**Action:** Open `.env.local` and verify the key exists and is valid.

### ✅ Step 2: Check Lesson Voice ID
1. Create a lesson with Snoop Dogg personality
2. Check the database:
```sql
SELECT id, title, voice_style FROM lessons ORDER BY created_at DESC LIMIT 1;
```

**Expected:** `voice_style` should be `"81dd4427-89aa-4a1a-9527-d225b44f7b28"`

**If NULL or wrong:**
- The voice ID mapping failed
- Check `VOICE_ID_MAP` in `CreateLessonModal.tsx`

### ✅ Step 3: Check Server Logs
When you click "Ready" or "Continue", check your **server terminal** for:

```
[TTS] Attempting to generate audio for message. VoiceId: 81dd4427... Content length: 150
```

**If you see "No voiceId provided":**
- The lesson doesn't have a voice_style set
- Recreate the lesson

**If you see Speechify API errors:**
- Check API key is valid
- Check you have credits/permissions
- Verify the voice ID exists in Speechify

**If you see "Successfully generated audio":**
- Audio generation is working! ✅
- Problem is client-side

### ✅ Step 4: Check Browser Console
Open DevTools Console and look for:

```
[Audio] New message received. Has audioData: true MessageId: xyz...
[Audio] Attempting to play audio for message
[Audio] playMessageAudio called. AudioData length: 150000
[Audio] Creating new audio element
[Audio] Calling play() on audio element
[Audio] Audio playing successfully
```

**Common Issues:**

**"Has audioData: false"**
- Audio wasn't generated server-side
- Check server logs from Step 3

**"Error playing audio: NotAllowedError"**
- Browser blocking autoplay
- Click anywhere on page first, then try
- Or manually click play button on message

**"Error playing audio: InvalidStateError"**
- Audio data might be corrupted
- Check base64 format is correct

### ✅ Step 5: Manual Test
1. Click on a message bubble's play button (▶️)
2. Check console for same logs
3. If manual play works but autoplay doesn't → browser blocking autoplay

### ✅ Step 6: Check Message Metadata
In browser console, after a message appears:
```javascript
// Get the messages from React DevTools or add this temporarily
console.log(messages[messages.length - 1].metadata);
```

**Should see:**
```json
{
  "buttonType": "continue",
  "blockNumber": 1,
  "audioData": "//uQx...very long base64 string..."
}
```

**If audioData is missing:** Server didn't generate it (check Step 3)

## Common Problems & Solutions

### Problem: No Audio Generated (Server-Side)

**Symptoms:**
- Server logs show "No voiceId provided"
- Message metadata has no `audioData`

**Solutions:**
1. Verify lesson has `voice_style` in database
2. Recreate lesson with personality selected
3. Check voice ID mapping is correct

### Problem: API Key Invalid

**Symptoms:**
- Server logs: "Speechify speech API error: 401"

**Solutions:**
1. Get new API key from Speechify
2. Update `.env.local`
3. Restart Next.js dev server

### Problem: Browser Blocks Autoplay

**Symptoms:**
- Console: "NotAllowedError: play() failed"
- Manual play button works

**Solutions:**
1. Click anywhere on page first (user interaction)
2. Unmute the page
3. Check browser autoplay settings

### Problem: Wrong Voice

**Symptoms:**
- Audio plays but doesn't sound like Snoop Dogg

**Solutions:**
1. Check lesson's `voice_style` is correct Snoop ID
2. Verify voice ID in Speechify dashboard
3. Test voice ID manually via API

## Testing Audio Generation

### Test 1: Direct API Call
```bash
curl -X POST https://api.sws.speechify.com/v1/audio/speech \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Hello, this is a test",
    "voice_id": "81dd4427-89aa-4a1a-9527-d225b44f7b28",
    "audio_format": "mp3"
  }' \
  --output test.mp3
```

Play `test.mp3` - if it plays → API works, issue is in our code.

### Test 2: Check Voice Exists
```bash
curl https://api.sws.speechify.com/v1/voices \
  -H "Authorization: Bearer YOUR_KEY" | grep "81dd4427"
```

Should return the Snoop voice object.

## Next Steps

After running these checks:
1. Note which step failed
2. Check the relevant section above
3. Share logs/errors for more specific help

Most common issue is **browser autoplay blocking** - try clicking the manual play button first!



