# Speechify TTS Integration Setup

## Environment Configuration

To enable Speechify text-to-speech, add the following to your `.env.local` file:

```env
SPEECHIFY_API_KEY=your_speechify_api_key_here
```

### Getting Your Speechify API Key

1. Visit [Speechify API](https://speechify.com/api) or contact Speechify for API access
2. Sign up for an API account
3. Copy your API key
4. Add it to your `.env.local` file

## Features Enabled

Once configured, the following features will be available:

- **Personality-Based Voices**: Choose a personality (Snoop Dogg, Morgan Freeman, etc.) that automatically maps to a Speechify voice
- **Auto-Play**: Assistant messages will automatically play audio when they appear (unless muted)
- **Manual Controls**: Each message bubble has play/pause/restart controls
- **Mute Button**: Global mute button in lesson header controls auto-play

## Voice ID Configuration

Voice IDs are hardcoded and mapped to personalities in `CreateLessonModal.tsx`. See `SPEECHIFY_VOICE_IDS.md` for:
- Current voice ID mappings
- Instructions to find and add new voice IDs
- How to update the `VOICE_ID_MAP` constant

## Testing

1. Create a new lesson and select a personality (e.g., Snoop Dogg)
2. Start a Learn session
3. Audio should auto-play for each AI professor message in the selected voice
4. Use the controls on each message bubble to replay or pause
5. Test the mute button to disable auto-play

## Troubleshooting

- **Audio not playing**: Check browser console for errors, ensure audio data is being generated
- **Slow message generation**: Audio is generated server-side before messages appear - this is expected
- **Wrong voice**: Verify the voice ID mapping in `VOICE_ID_MAP` is correct
- **Missing voice IDs**: Add the required voice IDs following instructions in `SPEECHIFY_VOICE_IDS.md`

## API Endpoints Used

- `GET https://api.sws.speechify.com/v1/voices` - Fetch available voices
- `POST https://api.sws.speechify.com/v1/audio/speech` - Generate speech from text

### Voice API Response Structure

The voices API returns an array of voice objects with the following structure:
```json
{
  "id": "unique_voice_id",
  "display_name": "Voice Name",
  "gender": "male|female",
  "locale": "en-US",
  "models": [
    {
      "name": "simba-base",
      "languages": [
        { "locale": "en-US" }
      ]
    }
  ],
  "type": "shared",
  "avatar_image": "url",
  "preview_audio": "url",
  "tags": ["tag1", "tag2"]
}
```

## Storage

Audio is stored as base64-encoded MP3 data in the `messages.metadata.audioData` field. This allows:
- Instant replay without regenerating
- Session persistence
- Offline playback of cached messages

If base64 size becomes an issue (messages > 200KB), consider migrating to Supabase Storage URLs.

