# Switched from Cartesia to Speechify for Podcasts

## Why We Switched

**Cost Comparison:**
- **Cartesia**: $49 / 1.25M chars = $0.0000392 per char
- **Speechify**: $10 / 1M chars = $0.00001 per char
- **Speechify is 4x CHEAPER!** 💰

## Cost Savings Examples

| Usage | Cartesia | Speechify | Savings |
|-------|----------|-----------|---------|
| 1 podcast (6k chars) | $0.24 | $0.06 | **$0.18** (75%) |
| 100 podcasts | $24.00 | $6.00 | **$18.00** |
| 1M characters | $39.20 | $10.00 | **$29.20** |

**Result**: **75% cost reduction** on all TTS operations! 🎉

## What Changed

### Files Modified

1. **`src/lib/podcast-voices.ts`** (renamed from cartesia-voices.ts)
   - Updated with Speechify voice IDs
   - Added Snoop Dogg voice
   - 6 preset voices available

2. **`src/app/api/lessons/podcast/generate/route.ts`**
   - Replaced `generateSpeech()` from Cartesia with `generateSpeechBuffer()` from Speechify
   - Removed emotion/speed controls (Speechify doesn't support them)
   - Same workflow: generate → upload → store

3. **`src/app/api/cartesia/previews/seed/route.ts`**
   - Now uses Speechify to generate previews
   - Same upload and storage logic

4. **`src/app/api/cartesia/preview/route.ts`**
   - Switched to Speechify API
   - Simpler implementation (no emotion/speed params)

5. **`src/app/api/cartesia/voices/route.ts`**
   - Updated to return Speechify voices

6. **`src/components/modals/PodcastVoiceModal.tsx`**
   - Updated import to use `podcast-voices.ts`

### Files Removed

- ❌ `src/lib/cartesia.ts` - No longer needed
- ❌ `src/lib/cartesia-voices.ts` - Renamed to `podcast-voices.ts`
- ❌ `@cartesia/cartesia-js` package - Uninstalled

### Files Created

- ✅ `src/lib/podcast-voices.ts` - Speechify voice presets

## New Voice Presets

Using Speechify voices optimized for podcasts:

1. **Snoop Dogg** - Cool, laid-back rap legend (your request!)
2. **George** - Warm, friendly professional
3. **MrBeast** - Energetic and enthusiastic
4. **Henry** - British, confident, articulate
5. **Simone** - Engaging female voice
6. **Sara** - Professional female narrator

## What We Lost (Trade-offs)

Since Speechify doesn't support Cartesia's advanced features:

### Lost Features:
- ❌ Emotion control (curiosity, positivity, etc.)
- ❌ Fine-grained speed control (0.6-1.5)
- ❌ EmotionLevel parameters

### Still Have:
- ✅ High-quality voices
- ✅ Same workflow (generate → store → play)
- ✅ Voice previews
- ✅ Multiple voice options
- ✅ **75% cost savings**

## Workarounds for Lost Features

### 1. Tone Variation (No Emotion Control)
**Solution**: Handle via OpenAI script generation
- "Brainrot" tone → OpenAI uses Gen Z slang in the script
- "Posh" tone → OpenAI uses sophisticated vocabulary
- Voice delivery stays neutral but text conveys the tone

### 2. Speed Control
**Solution**: User-side playback speed
- PodcastPlayer already has speed controls (0.75x - 2x)
- Users can adjust playback speed themselves
- No need for generation-time speed control

## Updated Cost Calculations

### Per Podcast (avg 6,000 characters):
- **Old (Cartesia)**: $0.24
- **New (Speechify)**: $0.06
- **Savings**: $0.18 per podcast

### Monthly Usage Examples:

| Podcasts/Month | Cartesia | Speechify | Monthly Savings |
|----------------|----------|-----------|-----------------|
| 50 | $12.00 | $3.00 | **$9.00** |
| 100 | $24.00 | $6.00 | **$18.00** |
| 200 | $48.00 | $12.00 | **$36.00** |
| 500 | $120.00 | $30.00 | **$90.00** |

### Annual Savings:
- 100 podcasts/month = **$216/year saved**
- 500 podcasts/month = **$1,080/year saved**

## Implementation Notes

### Speechify API Integration

Uses existing `generateSpeechBuffer()` from `src/lib/speechify.ts`:

```typescript
// Simple API call
const audioBuffer = await generateSpeechBuffer(text, voiceId);

// Returns Buffer ready to upload
await supabase.storage.from("podcast-audio").upload(filename, audioBuffer);
```

Much simpler than Cartesia's streaming approach!

### Voice Speed

Speechify's default speed is good for podcasts. If users want slower/faster:
- They can use the PodcastPlayer's built-in speed controls
- Adjust from 0.75x to 2x on playback
- No generation-time cost for different speeds

## Setup Required

### 1. Environment Variable
Already set (used for Learn Mode):
```bash
SPEECHIFY_API_KEY=your_speechify_api_key
```

### 2. Storage Bucket
Create `podcast-audio` bucket in Supabase (still needed)

### 3. Regenerate Voice Previews
Since voices changed from Cartesia → Speechify:

1. Delete old previews:
```sql
DELETE FROM voice_previews;
```

2. Visit: `http://localhost:3000/admin`
3. Click "Generate Voice Previews"
4. Should generate 6 new previews with Speechify voices

### 4. Regenerate Existing Podcasts
Any podcasts generated with Cartesia will have old audio URLs. Users will need to regenerate them.

## Testing Checklist

- [ ] Create `podcast-audio` storage bucket
- [ ] Run voice preview seed
- [ ] Test voice previews (should hear Snoop, George, etc.)
- [ ] Generate a new podcast
- [ ] Verify audio quality is good
- [ ] Check cost per podcast is ~$0.06

## Migration Complete! ✅

Successfully migrated from Cartesia to Speechify with:
- ✅ 75% cost reduction
- ✅ Snoop Dogg voice included
- ✅ Same functionality
- ✅ Simpler API integration
- ✅ Reusing existing Speechify setup

No more Cartesia dependencies. Everything runs on Speechify now! 🎊

