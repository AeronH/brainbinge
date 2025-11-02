# Lesson Generation Feature Documentation

## Overview

The lesson generation feature allows users to create interactive AI-powered learning sessions by uploading text or PDF files. The system uses OpenAI's GPT-4o-mini to parse the content and create structured lessons with an AI professor that teaches in a personalized style.

## Architecture

### 1. Lesson Creation Flow (`/create-lesson`)

**Component:** `src/components/pages/CreateLesson.tsx`

#### Features:
- **Text Input**: Users can paste learning material directly
- **File Upload**: Support for `.txt` and `.pdf` files (PDF parsing coming soon)
- **Voice Selection**: Choose AI professor personality:
  - Freeman-style (Wise & Calm)
  - Snoop-style (Cool & Laid-back)
  - Comedian (Fun & Energetic)
  - Classic Mentor (Professional)
- **Humor Level**: PG, PG-13, or R rating
- **Subscription Gate**: Checks if user is subscribed before allowing creation

#### Process:
1. User fills in lesson details and content
2. System validates subscription status
3. On submit, calls `/api/lessons/generate` endpoint
4. Saves lesson and initial session to Supabase
5. Navigates to lesson view

### 2. Lesson Generation API

**Endpoint:** `src/app/api/lessons/generate/route.ts`

#### What it does:
- Uses OpenAI GPT-4o-mini to parse lesson content
- Generates structured outline with sections and subsections
- Creates initial greeting message based on voice style and humor level

#### Input:
```typescript
{
  content: string;      // Learning material
  title: string;        // Lesson title
  subject: string;      // Subject area
  voiceStyle: string;   // Personality type
  humorLevel: string;   // Humor rating
}
```

#### Output:
```typescript
{
  outline: {
    title: string;
    summary: string;
    sections: [{
      title: string;
      subsections: [{
        title: string;
        content: string;
        keyPoints: string[];
        examples?: string[];
      }]
    }]
  },
  initialGreeting: string;  // Personalized intro message
}
```

### 3. Lesson View (`/lesson/[id]`)

**Component:** `src/components/pages/LessonView.tsx`

#### Layout:
- **Left Panel (40%)**: Lesson outline
  - Displays structured content hierarchy
  - Shows main topics, subtopics, and key points
  - Static reference while learning

- **Right Panel (60%)**: Interactive chat
  - AI professor messages
  - User responses
  - Initial Yes/No button interaction
  - Text input for questions

#### Features:

##### Initial Interaction
- First message is the AI professor's greeting
- Shows "Yes, let's start!" and "Not yet" buttons
- Buttons only appear on the last message with `awaitingResponse: true`
- Once clicked, conversation continues

##### Chat Functionality
- Real-time message exchange
- Messages saved to Supabase session
- Timestamps on each message
- Auto-scroll to latest message
- Loading states for message sending
- Disabled input while sending

##### Data Fetching
- Fetches lesson from `lessons` table
- Fetches latest session from `sessions` table
- Loads chat history from session
- Handles loading and error states

## Database Schema

### Lessons Table
```sql
- id: uuid (PK)
- user_id: uuid (FK)
- title: text
- subject: text
- source_type: text ('pdf' | 'text')
- outline: jsonb (structured lesson content)
- summary: text
- voice_style: text
- humor_level: text
- created_at: timestamptz
```

### Sessions Table
```sql
- id: uuid (PK)
- lesson_id: uuid (FK)
- title: text
- chat_log: jsonb (array of messages)
- audio_urls: jsonb (for future audio feature)
- score: numeric (for tracking progress)
- created_at: timestamptz
```

### Message Format in chat_log
```typescript
{
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: string (ISO format);
  awaitingResponse?: boolean;
}
```

## Environment Variables

Required for lesson generation:

```env
# OpenAI API Key
OPENAI_API_KEY=sk-...

# Supabase (for data storage)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## AI Prompting Strategy

### Lesson Parsing Prompt
- Analyzes content and creates structured outline
- Breaks down into sections and subsections
- Extracts key concepts, definitions, examples
- Identifies important formulas or principles
- Returns JSON format for consistency

### Initial Greeting Prompt
- Personalized based on voice style (Freeman, Snoop, Comedian, Mentor)
- Adapts to humor level (PG, PG-13, R)
- 3-4 sentences, conversational tone
- Builds excitement about the lesson
- Ends with invitation to start

## Future Enhancements

### Planned Features (Not Yet Implemented):
1. **Audio Narration**: Text-to-speech for AI professor using ElevenLabs/PlayHT
2. **PDF Parsing**: Full PDF text extraction (currently requires manual paste)
3. **Intelligent Responses**: Context-aware AI responses during lesson (currently placeholder)
4. **Progress Tracking**: Score calculation based on user engagement
5. **Questions & Quizzes**: Inline questions during lesson
6. **Session History**: View and replay past sessions
7. **Lesson Editing**: Update lesson content after creation

## Usage Example

### Creating a Lesson:
1. Navigate to `/create-lesson`
2. Enter title: "Introduction to Physics"
3. Enter subject: "Physics"
4. Paste content or upload file
5. Select voice style: "Freeman-style"
6. Select humor level: "PG"
7. Click "Start Learning Session"
8. Wait for generation (takes ~5-10 seconds)
9. Redirected to lesson view

### Learning:
1. See lesson outline on left
2. Read AI professor's greeting on right
3. Click "Yes, let's start!" to begin
4. AI introduces first topic
5. Type questions in chat input
6. Continue conversation
7. Exit anytime (progress saved)

## Testing

### To Test Lesson Creation:
1. Ensure OpenAI API key is set
2. Be logged in with active subscription
3. Use sample content from `lesson-example.txt`
4. Verify outline generates correctly
5. Check database entries in Supabase

### To Test Lesson View:
1. Create a lesson first
2. Navigate to `/lesson/[id]`
3. Verify outline displays
4. Check initial greeting appears
5. Test Yes/No buttons
6. Try sending chat messages
7. Verify data saves to session

## Troubleshooting

### Common Issues:

**"Failed to generate lesson"**
- Check OPENAI_API_KEY is set correctly
- Verify API key has credits
- Check network connection
- View browser console for details

**"Lesson not found"**
- Verify lesson ID in URL
- Check user owns the lesson
- Ensure lesson exists in database

**Buttons not appearing**
- Check message has `awaitingResponse: true`
- Verify it's the last message
- Ensure not currently sending

**Outline not rendering**
- Check lesson.outline structure
- Verify JSON format is correct
- Check for missing subsections

## Code Locations

- **Create Lesson Page**: `src/app/create-lesson/page.tsx`
- **Create Lesson Component**: `src/components/pages/CreateLesson.tsx`
- **Lesson View Page**: `src/app/lesson/[id]/page.tsx`
- **Lesson View Component**: `src/components/pages/LessonView.tsx`
- **Generation API**: `src/app/api/lessons/generate/route.ts`
- **Database Types**: `src/lib/supabase/types.ts`

## Dependencies

- `openai` - OpenAI SDK for GPT integration
- `@supabase/supabase-js` - Database and auth
- `next` - Framework
- `react` - UI library
- `lucide-react` - Icons
- `sonner` - Toast notifications

## Best Practices

1. **Always validate content** before sending to OpenAI
2. **Handle API errors gracefully** with user-friendly messages
3. **Save progress frequently** to prevent data loss
4. **Keep messages under token limit** to control costs
5. **Use loading states** for better UX
6. **Escape user input** to prevent injection attacks (future chat feature)
7. **Rate limit API calls** to prevent abuse (future enhancement)




