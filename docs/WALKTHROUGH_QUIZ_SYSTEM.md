# Walkthrough Quiz System Documentation

## Overview

The Walkthrough Quiz System provides an interactive, guided learning experience where the AI professor delivers content in blocks and tests understanding with multiple-choice questions.

---

## Features

### 1. Content Block Delivery

- Content delivered in digestible ~1 minute blocks (~150-200 words)
- Each block covers one concept at a time
- User clicks "Continue" button to proceed to next block
- Progressive learning through the lesson outline

### 2. Interactive Quiz Questions

- Automatically generated every 2-3 content blocks
- 4 multiple-choice options (A, B, C, D)
- Instant feedback on answers
- Explanations provided for correct answers
- Wrong answers show correct answer + explanation

### 3. Button-Driven Navigation

- **Ready Button**: Starts the walkthrough after intro
- **Continue Button**: Advances to next content block
- **Quiz Buttons**: 4 option buttons for answering questions
- **Start Over Button**: Resets progress and begins again

### 4. Progress Tracking

- All quiz questions and answers stored in database
- Block numbers tracked in message metadata
- User can return to lesson and continue where they left off
- Quiz state persists across page refreshes

---

## Database Schema

### walkthrough_quiz_questions Table

```sql
CREATE TABLE walkthrough_quiz_questions (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  lesson_id UUID REFERENCES lessons(id),
  question TEXT NOT NULL,
  options JSONB NOT NULL,          -- Array of 4 options
  correct_answer INTEGER NOT NULL, -- 0-3 index
  explanation TEXT,
  user_answer INTEGER,             -- User's selected answer (0-3)
  is_correct BOOLEAN,
  asked_after_message_id UUID REFERENCES messages(id),
  created_at TIMESTAMPTZ
);
```

### Message Metadata Structure

```typescript
{
  buttonType: 'ready' | 'continue' | 'quiz' | 'complete' | null,
  quizQuestionId?: string,  // UUID if buttonType is 'quiz'
  blockNumber: number        // Track progression
}
```

---

## API Endpoints

### POST /api/lessons/walkthrough/next

Generates next content block or quiz question.

**Request:**
```typescript
{
  sessionId: string;
  lessonId: string;
  action: 'start' | 'continue' | 'answer_quiz';
  quizAnswer?: number;  // If answering quiz (0-3)
}
```

**Response:**
```typescript
{
  message: Message;
  quizQuestion?: QuizQuestion;
  quizResult?: {
    isCorrect: boolean;
    correctAnswer: number;
    explanation: string;
  };
  isComplete?: boolean;  // True if lesson is finished
}
```

**Logic Flow:**
1. Verify user owns the lesson
2. Fetch session and message history
3. Count blocks delivered (assistant messages)
4. If answering quiz:
   - Update quiz question with user's answer
   - Generate feedback message
5. If time for quiz (every 3 blocks):
   - Generate quiz question via OpenAI
   - Save to database
   - Return quiz message
6. Else:
   - Generate next content block via OpenAI
   - Determine if last block
   - Return content message

### POST /api/lessons/walkthrough/reset

Resets walkthrough progress and starts over.

**Request:**
```typescript
{
  sessionId: string;
  lessonId: string;
}
```

**Response:**
```typescript
{
  session: Session;  // New session
  message: Message;  // Initial "Ready?" message
}
```

**Logic:**
1. Delete all messages for current session
2. Delete all quiz questions for current session
3. Create new session with same lesson
4. Create initial ready message
5. Return new session data

---

## User Flow Example

```
1. User creates lesson
2. Selects "Walkthrough" mode
3. Sees intro message with "Ready" button
   ↓
4. Clicks "Ready"
5. Receives first content block with "Continue" button
   ↓
6. Clicks "Continue"
7. Receives second content block with "Continue" button
   ↓
8. Clicks "Continue"  
9. Receives third content block with "Continue" button
   ↓
10. Clicks "Continue"
11. Receives quiz question with 4 option buttons (A, B, C, D)
    ↓
12a. User selects correct answer
     → "Correct! [explanation]" + "Continue" button
    ↓
12b. User selects wrong answer
     → "Not quite. Correct is option X. [explanation]" + "Continue" button
    ↓
13. Clicks "Continue"
14. Receives next content block
    ↓
... (repeat steps 6-14 until lesson complete)
    ↓
N. Receives completion message with "Start Over" button
N+1. Optional: Click "Start Over" to reset and begin again
```

---

## OpenAI Prompts

### Content Block Generation

```
You are an AI professor teaching "{lesson.title}".

Voice style: {voiceStyle}
- freeman: Wise, calm, thoughtful like Morgan Freeman
- snoop: Cool, laid-back, casual like Snoop Dogg
- comedian: Energetic, funny, entertaining
- mentor: Professional, encouraging, supportive

Lesson outline:
{lesson.outline}

Current section: {currentSection.title}

Previous content covered:
{previous 2 blocks}

Generate the next content block (~150-200 words, ~1 minute spoken).
- Be conversational and engaging
- Use examples when helpful
- Maintain the voice style personality
- Build on previous content
- Cover one concept at a time
- End naturally, ready for user to click "Continue"
```

### Quiz Question Generation

```
Based on the content covered in recent blocks, generate a multiple choice question.

Requirements:
- Test understanding of key concept
- 4 plausible options
- One clearly correct answer
- Brief explanation for correct answer

Return JSON:
{
  "question": "...",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": 0-3,
  "explanation": "..."
}
```

---

## Component: LessonView.tsx

### Key State Variables

```typescript
const [currentQuiz, setCurrentQuiz] = useState<QuizQuestion | null>(null);
const [isSending, setIsSending] = useState(false);
const [isStarting, setIsStarting] = useState(false);
```

### Handler Functions

**handleReady()**: Starts walkthrough, fetches first content block

**handleContinue()**: Fetches next block or quiz question

**handleQuizAnswer(index)**: Submits quiz answer, gets feedback

**handleStartOver()**: Resets walkthrough to beginning

### Button Rendering Logic

Buttons only show for:
- Last assistant message
- In walkthrough mode
- When not currently sending

Button type determined by message metadata:
- `buttonType: 'ready'` → Shows "Ready" button
- `buttonType: 'continue'` → Shows "Continue" button
- `buttonType: 'quiz'` → Shows 4 quiz option buttons
- `buttonType: 'complete'` → Shows "Start Over" button

### Input Area

- **Walkthrough mode**: Input disabled, shows helper text "Use the buttons above..."
- **Q&A mode**: Input enabled for free-form questions

---

## Quiz Question Display

```tsx
{buttonType === "quiz" && currentQuiz && (
  <div className="space-y-3 w-full max-w-2xl">
    {(currentQuiz.options as string[]).map((option, idx) => (
      <Button
        key={idx}
        onClick={() => handleQuizAnswer(idx)}
        variant="outline"
        className="w-full justify-start text-left"
      >
        <span className="font-semibold mr-3">
          {String.fromCharCode(65 + idx)}.
        </span>
        <span>{option}</span>
      </Button>
    ))}
  </div>
)}
```

---

## State Persistence

### On Page Load
1. Fetch lesson data
2. Fetch latest session
3. Fetch all messages for session
4. **Check for unanswered quiz question**
5. If found, load into `currentQuiz` state

This ensures:
- User can refresh during quiz without losing question
- Progress is maintained across sessions
- Quiz state syncs with database

---

## Testing Checklist

- [ ] Create lesson and select walkthrough mode
- [ ] Click "Ready" button → first block appears
- [ ] Click "Continue" → second block appears
- [ ] Progress through 2-3 blocks
- [ ] Quiz question appears with 4 options
- [ ] Select correct answer → see positive feedback
- [ ] Select wrong answer → see explanation
- [ ] Click "Continue" after quiz → next block appears
- [ ] Complete entire lesson → see "Start Over" button
- [ ] Click "Start Over" → lesson resets
- [ ] Refresh page during walkthrough → progress maintained
- [ ] Refresh during quiz → quiz question still displayed
- [ ] Switch to Q&A mode → input field appears
- [ ] Switch back to walkthrough → buttons appear

---

## Key Design Decisions

### 1. On-Demand Generation
- Content blocks and quizzes generated as needed
- Saves tokens compared to pre-generating entire walkthrough
- Allows dynamic content based on user's pace

### 2. Separate Quiz Table
- Named `walkthrough_quiz_questions` for future expansion
- Other quiz types can be added (e.g., `practice_quiz_questions`)
- Includes both session_id and lesson_id for flexibility

### 3. Button-Only Interface for Walkthrough
- Enforces structured progression
- Prevents users from getting off-track
- Clear visual indication of next action

### 4. Metadata-Driven UI
- Button type stored in message metadata
- Single rendering logic handles all button types
- Easy to add new button types in future

### 5. Block Number Tracking
- Metadata includes `blockNumber` 
- Enables knowing when to show quizzes
- Helps AI understand lesson progression

---

## Future Enhancements

### Potential Additions:
1. **Adaptive Quiz Difficulty**: Adjust question complexity based on user performance
2. **Spaced Repetition**: Re-test concepts from earlier blocks
3. **Hints System**: Provide hints before showing correct answer
4. **Progress Bar**: Visual indicator of lesson completion
5. **Quiz Statistics**: Track accuracy over time
6. **Multiple Quiz Formats**: True/False, fill-in-blank, matching
7. **Branch Logic**: Different paths based on quiz performance
8. **Review Mode**: Replay incorrect answers at end

---

## Performance Considerations

### Optimizations:
- Messages indexed by `(session_id, created_at)` for fast retrieval
- Quiz questions indexed by `(session_id, created_at)` and `lesson_id`
- Only unanswered quiz fetched on load (`is_correct IS NULL`)
- Block count calculated client-side from message array
- RLS policies use efficient `auth.uid()` pattern

### Token Usage:
- Average content block: ~300-400 tokens
- Average quiz generation: ~200-300 tokens
- Total for 10-block lesson with 3 quizzes: ~4,500-5,500 tokens
- Cost per walkthrough: ~$0.01-0.02 at GPT-4o-mini pricing

---

## Troubleshooting

### Issue: Buttons not appearing
- Check message metadata has `buttonType` field
- Verify message is last in array
- Ensure `selectedMode === 'walkthrough'`
- Check `isSending` is false

### Issue: Quiz not loading after refresh
- Verify quiz question exists in database
- Check `user_answer IS NULL` for unanswered quizzes
- Ensure `setCurrentQuiz()` called in `fetchLessonData()`

### Issue: Content blocks repetitive
- Review OpenAI prompt includes previous blocks
- Check `blockNumber` incrementing correctly
- Verify current section calculated properly

### Issue: Start Over not working
- Check session and lesson IDs passed correctly
- Verify new session created successfully
- Ensure old messages/quizzes deleted
- Check toast notification appears

---

## Summary

The Walkthrough Quiz System provides a structured, interactive learning experience with:
- ✅ Block-by-block content delivery
- ✅ Automated quiz generation every 2-3 blocks
- ✅ Instant feedback on answers
- ✅ Progress tracking and persistence
- ✅ Start over functionality
- ✅ Clean button-driven UI
- ✅ Optimized database queries
- ✅ Scalable architecture for future features

This creates an engaging, pedagogically sound learning experience that guides users through material while testing comprehension along the way.




