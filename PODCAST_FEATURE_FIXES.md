# Podcast Feature Fixes

## Issues Fixed

### 1. Cartesia SDK Constructor Error

**Problem**: Getting error `_cartesia_cartesia_js__WEBPACK_IMPORTED_MODULE_0___default(...) is not a constructor` when opening lesson page.

**Root Cause**: 
- The Cartesia SDK was being imported in client components (`PodcastVoiceModal.tsx`)
- Cartesia is a Node.js SDK that should only run server-side
- The `PODCAST_VOICE_PRESETS` array was exported from `cartesia.ts` which instantiated the SDK

**Solution**:
1. Created separate file `/src/lib/cartesia-voices.ts` for voice presets
2. Moved `PODCAST_VOICE_PRESETS` to this new file
3. Updated imports in:
   - `src/components/modals/PodcastVoiceModal.tsx`
   - `src/app/api/cartesia/voices/route.ts`
4. Now client components import from `cartesia-voices.ts` (no SDK initialization)
5. Server-side code imports from `cartesia.ts` (with SDK)

### 2. Voice Preview Not Working

**Problem**: Preview button didn't play audio samples of voices.

**Solution**:
1. Created new API endpoint: `/src/app/api/cartesia/preview/route.ts`
2. Endpoint generates short preview audio using Cartesia TTS
3. Updated `PodcastVoiceModal` to:
   - Call preview endpoint when preview button clicked
   - Convert response to audio blob
   - Create audio element and play it
   - Clean up audio URL when done
   - Show loading state during preview

### 3. Cartesia SDK API Compatibility

**Problem**: Multiple TypeScript errors with Cartesia SDK types.

**Issues Found**:
- Wrong import: `import Cartesia` → should be `import { CartesiaClient }`
- Wrong property: `__experimental_controls` → should be `experimentalControls`
- Wrong property: `emotionLevel` doesn't exist in Controls type
- Missing property: `bitRate` required for MP3 output format
- Wrong emotion format: Using plain strings → should be "emotion:level" format
- Wrong model ID: `sonic-3` → should be `sonic-english`

**Solutions Applied**:
1. **Import**: Changed to `import { CartesiaClient } from "@cartesia/cartesia-js"`
2. **Initialization**: `new CartesiaClient({ apiKey: ... })`
3. **Controls**: Removed `emotionLevel`, only use `speed` and `emotion`
4. **Emotions**: Updated to correct format:
   - `"curiosity:high"` instead of `"curiosity"`
   - `"positivity:low"` instead of `"positivity"`
   - `"surprise"` (default level)
5. **Speed**: Changed to use `"normal"` | `"slow"` | `"fast"` etc. or number
6. **Output Format**: Added `bitRate: 128000` to MP3 config
7. **Model**: Changed to `"sonic-english"`

## Updated Files

### New Files
- `/src/lib/cartesia-voices.ts` - Voice presets (client-safe)
- `/src/app/api/cartesia/preview/route.ts` - Preview audio endpoint
- `/PODCAST_FEATURE_FIXES.md` - This file

### Modified Files
- `/src/lib/cartesia.ts`
  - Fixed CartesiaClient import
  - Updated emotion format to "emotion:level"
  - Removed emotionLevel parameter
  - Added proper bitRate to output format
  - Fixed speed type
  - Removed PODCAST_VOICE_PRESETS export

- `/src/components/modals/PodcastVoiceModal.tsx`
  - Changed import from `cartesia.ts` to `cartesia-voices.ts`
  - Implemented real preview functionality
  - Added audio playback with cleanup

- `/src/app/api/lessons/podcast/generate/route.ts`
  - Updated getToneEmotions usage (now returns string[] not object)
  - Removed emotionLevel parameter from generateSpeech call

- `/src/app/api/cartesia/voices/route.ts`
  - Changed import to use `cartesia-voices.ts`

## Cartesia API Reference

### Emotion Format
Emotions must be in format: `"emotion:level"`

Available emotions:
- `anger` (levels: lowest, low, medium, high, highest)
- `positivity` (levels: lowest, low, medium, high, highest)
- `surprise` (levels: lowest, low, medium, high, highest)
- `sadness` (levels: lowest, low, medium, high, highest)
- `curiosity` (levels: lowest, low, medium, high, highest)

Example: `["curiosity:high", "positivity:low", "surprise"]`

### Speed Options
- String: `"slowest"` | `"slow"` | `"normal"` | `"fast"` | `"fastest"`
- Number: 0.5 to 2.0

### Output Format (MP3)
```typescript
{
  container: "mp3",
  sampleRate: 44100, // 8000, 16000, 22050, 24000, 44100, 48000
  bitRate: 128000,   // 32000, 64000, 96000, 128000, 192000
}
```

### Model IDs
- `"sonic-english"` - High-quality English TTS
- Check Cartesia docs for other models

## Testing

✅ All linter errors resolved
✅ Client components don't import Node.js SDK
✅ Voice preview endpoint created
✅ Proper Cartesia API format

### To Test
1. Open a lesson
2. Switch to Podcast mode
3. Voice selection modal should open without errors
4. Click preview buttons to hear voice samples
5. Select tone and 2 voices
6. Generate podcast successfully

## Notes

- Cartesia SDK must stay server-side only
- Client components use `cartesia-voices.ts` for constants
- Preview generates ~2-3 second audio clips
- Emotions are subtle per user requirements
- All API calls properly typed with Cartesia SDK types

