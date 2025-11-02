# Voice Selection After Lesson Creation

## Summary

Voice selection has been moved from the lesson creation modal to after the lesson is created. When users open a lesson for the first time, they choose their AI professor voice, which then generates a personalized greeting and starts the learning experience.

## Changes Made

### 1. Removed Voice from Creation Modal
**File:** `src/components/modals/CreateLessonModal.tsx`

**Removed:**
- Voice/personality selection dropdown
- VOICE_ID_MAP usage

**Updated:**
- Form state now only contains `content`
- API call no longer sends `personality` or `voiceId`
- Description updated: "Paste your learning material and we'll prepare your lesson!"
- Added hint: "You'll choose your AI professor voice when you start learning"

### 2. Updated Lesson Generation API
**File:** `src/app/api/lessons/generate/route.ts`

**Changes:**
- Removed `personality` and `voiceId` from request parameters
- No longer generates initial greeting (moved to voice selection)
- Sets `voice_style` to `null` when creating lesson
- Response no longer includes `initialGreeting`, `voiceId`, or `personality`

### 3. New Voice Selection API
**File:** `src/app/api/lessons/set-voice/route.ts` (NEW)

**Purpose:**  
Handles voice selection after lesson creation and generates personalized greeting.

**Endpoint:** `POST /api/lessons/set-voice`

**Request:**
```json
{
  "lessonId": "uuid",
  "personality": "snoop | freeman | comedian | mentor",
  "voiceId": "speechify-voice-id"
}
```

**Response:**
```json
{
  "greeting": "Personalized AI professor greeting...",
  "voiceId": "speechify-voice-id",
  "personality": "snoop"
}
```

**What it does:**
1. Validates lesson ownership
2. Fetches lesson details (title, outline, summary)
3. Generates personality-specific greeting using GPT-4o-mini
4. Updates lesson's `voice_style` in database
5. Returns greeting for first message

### 4. Voice Selection UI in LearnMode
**File:** `src/components/lesson/LearnMode.tsx`

**New State:**
```typescript
const [isSelectingVoice, setIsSelectingVoice] = useState(!lesson.voice_style);
const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
```

**New Handler:**
```typescript
const handleVoiceSelection = async (personality: string, voiceId: string) => {
  // Calls /api/lessons/set-voice
  // Updates lesson.voice_style
  // Auto-starts learn mode after voice selection
}
```

**Voice Options:**
1. **Morgan Freeman** (🎭) - Wise & Calming
2. **Snoop Dogg** (🎤) - Cool & Laid-back  
3. **Comedian** (😄) - Fun & Energetic
4. **Classic Mentor** (👨‍🏫) - Professional & Supportive

**UI Design:**
- Full-screen centered card layout
- 2x2 grid on desktop, stacked on mobile
- Large emoji icons for each professor
- Hover effects and transitions
- "Select Professor" button on each card
- Loading state: "Setting up..." when clicked

## User Flow

### Before (Old Flow)
1. Click "Create Lesson"
2. Fill content
3. Select voice from dropdown
4. Submit
5. Open lesson
6. Choose Learn/Q&A mode
7. Start learning

### After (New Flow)
1. Click "Create Lesson"
2. Fill content only
3. Submit (faster!)
4. Open lesson (auto-opens to Learn mode UI)
5. **See voice selection screen first**
6. Choose AI professor
7. Professor greets you and lesson starts

## Benefits

1. **Simpler Creation**: Only content needed, one field instead of two
2. **Better UX**: Voice selection is more prominent and engaging
3. **Contextual Choice**: Choose voice when about to learn, not beforehand
4. **Auto-Start**: After voice selection, automatically enters learn mode
5. **Personalized Start**: Each professor introduces themselves uniquely

## Technical Details

### Voice Selection Trigger

The voice selector shows when:
```typescript
const [isSelectingVoice, setIsSelectingVoice] = useState(!lesson.voice_style);
```

So if `lesson.voice_style` is `null`, the selector appears.

### Voice-to-Greeting Flow

1. User selects voice → `handleVoiceSelection()` called
2. API call to `/api/lessons/set-voice` with personality
3. GPT generates greeting based on personality + lesson details
4. Lesson's `voice_style` updated in database
5. `isSelectingVoice` set to `false`
6. Toast: "Professor voice set! Starting your lesson..."
7. After 500ms delay, auto-calls `startSession("learn")`

### Personality Descriptions

**Freeman:**
```
Wise, calm, thoughtful - like Morgan Freeman.
Deep wisdom, measured pace, makes complex ideas feel profound yet accessible.
```

**Snoop:**
```
Cool, laid-back, casual - like Snoop Dogg.
Friendly, uses casual language, makes learning feel chill and fun.
```

**Comedian:**
```
Energetic, funny, entertaining - like a stand-up comedian teaching.
Uses humor to make points memorable.
```

**Mentor:**
```
Professional, encouraging, supportive - classic teacher style.
Clear, patient, builds confidence.
```

## Database Schema

No changes needed! The `voice_style` column already exists:
- **On creation**: Set to `null`
- **After selection**: Updated to selected voice ID

## Code Locations

**Frontend:**
- Modal: `src/components/modals/CreateLessonModal.tsx` (lines 44-46, 67-75, 87-89, 108-132)
- LearnMode: `src/components/lesson/LearnMode.tsx` (lines 78-79, 143-180, 688-766)

**Backend:**
- Generation API: `src/app/api/lessons/generate/route.ts` (lines 9-11, 169-171, 193, 204-207)
- Voice API: `src/app/api/lessons/set-voice/route.ts` (entire file)

## Testing

### Test 1: New Lesson Creation
1. Create a new lesson with any content
2. Lesson generates successfully
3. Click to open lesson
4. **Verify**: Voice selection screen appears
5. **Verify**: 4 professor options displayed
6. Select any professor
7. **Verify**: "Professor voice set!" toast appears
8. **Verify**: Learn mode starts automatically
9. **Verify**: Professor greets you in chosen personality

### Test 2: Existing Lesson
1. Open a lesson that already has voice_style set
2. **Verify**: Voice selection does NOT appear
3. **Verify**: Goes directly to lesson content or mode selection

### Test 3: Voice Persistence
1. Select a voice for a lesson
2. Exit and re-enter the lesson
3. **Verify**: Voice selection does NOT appear again
4. **Verify**: Uses previously selected voice

## Error Handling

**If voice API fails:**
- Shows error toast: "Failed to set voice. Please try again."
- Stays on voice selection screen
- User can try selecting again

**If greeting generation fails:**
- API logs error but still updates voice_style
- Returns basic greeting or proceeds with voice set

## Future Enhancements

1. **Voice Preview**: Play sample audio before selecting
2. **Change Voice**: Button to change professor mid-lesson
3. **Voice Samples**: Short audio clips for each option
4. **More Voices**: Add additional personality options
5. **Custom Voices**: Let users record their own voice
6. **Voice Memory**: Remember last-used voice as default suggestion

## Related Documentation

- `LESSON_CREATION_SIMPLIFICATION.md` - Auto-title generation
- `MODAL_LESSON_CREATION.md` - Modal-based creation flow
- `LESSON_GENERATION_IMPROVEMENTS.md` - Content expansion logic

