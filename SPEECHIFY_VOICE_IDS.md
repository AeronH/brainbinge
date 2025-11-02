# Speechify Voice ID Mapping

This document tracks the Speechify voice IDs mapped to each personality type.

## Voice IDs

Update the voice IDs in `/src/components/modals/CreateLessonModal.tsx`:

```typescript
const VOICE_ID_MAP: Record<string, string> = {
  freeman: "freeman-voice-id",  // TODO: Replace with actual Freeman voice ID
  snoop: "81dd4427-89aa-4a1a-9527-d225b44f7b28",  // ✅ Snoop Dogg voice
  comedian: "comedian-voice-id",  // TODO: Replace with actual comedian voice ID
  mentor: "mentor-voice-id",  // TODO: Replace with actual mentor voice ID
};
```

## Current Status

- ✅ **Snoop Dogg**: `81dd4427-89aa-4a1a-9527-d225b44f7b28`
- ⏳ **Morgan Freeman**: Needs voice ID
- ⏳ **Comedian**: Needs voice ID  
- ⏳ **Mentor**: Needs voice ID

## How to Find Voice IDs

1. Use the Speechify API to list available voices:
   ```bash
   curl -H "Authorization: Bearer YOUR_API_KEY" \
        https://api.sws.speechify.com/v1/voices
   ```

2. Look for voices that match the personality:
   - **Freeman**: Wise, calm, authoritative male voice
   - **Comedian**: Energetic, funny, expressive voice
   - **Mentor**: Professional, clear, supportive voice

3. Copy the `id` field from the voice object

4. Update the `VOICE_ID_MAP` constant in `CreateLessonModal.tsx`

## Implementation Details

- Voice selection is now **hardcoded** based on personality
- Users choose a personality (freeman, snoop, comedian, mentor)
- The system automatically maps to the corresponding Speechify voice ID
- No separate voice dropdown needed
- Simplifies the UI and reduces API calls



