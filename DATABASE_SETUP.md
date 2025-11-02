# BrainBinge Database Setup

## ✅ Database Successfully Created in Supabase

**Project Name:** BrainBinge  
**Project ID:** `ozithbabyugjtjywgndn`  
**Region:** us-east-2  
**Database Version:** PostgreSQL 17.6.1.025

---

## 📊 Tables Created

### 1. **users**
Stores user profile information and preferences.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | User ID (auto-generated) |
| email | TEXT | User email (unique) |
| name | TEXT | User's full name |
| preferences | JSONB | Voice, tone, theme defaults |
| created_at | TIMESTAMPTZ | Account creation timestamp |

**Indexes:**
- `users_email_idx` on email column

---

### 2. **lessons**
Stores learning content and lesson metadata.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Lesson ID |
| user_id | UUID (FK) | Owner (references users.id) |
| title | TEXT | Lesson title |
| subject | TEXT | Subject (e.g., "Physics") |
| source_type | TEXT | Type: 'pdf', 'link', 'text', or 'image' |
| source_url | TEXT | Original source URL (optional) |
| outline | JSONB | Parsed lesson structure |
| summary | TEXT | Short lesson summary |
| voice_style | TEXT | Voice personality used (default: 'freeman') |
| humor_level | TEXT | Humor level: 'pg', 'pg13', or 'r' (default: 'pg') |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Indexes:**
- `lessons_user_id_idx` on user_id
- `lessons_created_at_idx` on created_at (DESC)

**Constraints:**
- `source_type` must be one of: 'pdf', 'link', 'text', 'image'
- `humor_level` must be one of: 'pg', 'pg13', 'r'

---

### 3. **sessions**
Stores individual learning sessions with chat history and audio.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Session ID |
| lesson_id | UUID (FK) | Associated lesson (references lessons.id) |
| title | TEXT | Session display title |
| chat_log | JSONB | Full message exchange array |
| audio_urls | JSONB | Array of TTS audio clip URLs |
| score | NUMERIC | Understanding/performance score |
| created_at | TIMESTAMPTZ | Session timestamp |

**Indexes:**
- `sessions_lesson_id_idx` on lesson_id
- `sessions_created_at_idx` on created_at (DESC)

---

### 4. **podcasts**
Stores combined lesson podcasts.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Podcast ID |
| user_id | UUID (FK) | Owner (references users.id) |
| title | TEXT | Podcast title |
| lessons_included | JSONB | Array of lesson IDs |
| audio_url | TEXT | Generated podcast audio URL |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Indexes:**
- `podcasts_user_id_idx` on user_id
- `podcasts_created_at_idx` on created_at (DESC)

---

## 🔒 Security (Row Level Security)

All tables have **Row Level Security (RLS)** enabled with optimized policies:

### Users Table:
- Users can read and update their own data only
- Uses optimized `(select auth.uid())` for better performance

### Lessons Table:
- Users can only CRUD their own lessons
- Enforced through `user_id = (select auth.uid())`

### Sessions Table:
- Users can only access sessions for their own lessons
- Uses JOIN through lessons table to verify ownership

### Podcasts Table:
- Users can only CRUD their own podcasts
- Enforced through `user_id = (select auth.uid())`

---

## 📈 Performance Optimizations

✅ All RLS policies optimized with `(select auth.uid())` to prevent re-evaluation per row  
✅ Strategic indexes on foreign keys and timestamp columns  
✅ CASCADE deletes configured for data integrity  
✅ JSONB columns for flexible schema (outline, chat_log, preferences)

---

## 🔗 TypeScript Types

TypeScript types have been generated and saved to:
`/src/lib/supabase/types.ts`

Usage example:
```typescript
import { Database, Tables, TablesInsert } from '@/lib/supabase/types';

// Type for a lesson row
type Lesson = Tables<'lessons'>;

// Type for inserting a new lesson
type NewLesson = TablesInsert<'lessons'>;
```

---

## 🚀 Next Steps

1. **Set up Supabase Auth** in your sign-up/sign-in pages
2. **Create lesson** - Start inserting lessons when users upload content
3. **Store sessions** - Save chat logs and audio URLs as users interact
4. **Enable Storage** - Set up Supabase Storage bucket for audio files
5. **Add AI Integration** - Connect GPT-4o-mini and TTS services

---

## 📱 Database Connection

Your Supabase client is already configured in:
- `/src/lib/supabase/client.ts` - For client-side
- `/src/lib/supabase/server.ts` - For server-side
- `/src/lib/supabase/middleware.ts` - For auth middleware

**Project URL:** https://ozithbabyugjtjywgndn.supabase.co  
**Connection String:** Available in Supabase Dashboard → Settings → Database

---

## 🔧 Migrations Applied

1. ✅ `create_users_table` - Users table with RLS
2. ✅ `create_lessons_table` - Lessons table with RLS
3. ✅ `create_sessions_table` - Sessions table with RLS
4. ✅ `create_podcasts_table` - Podcasts table with RLS
5. ✅ `optimize_rls_policies` - Performance optimization for RLS

All migrations are tracked in Supabase and can be rolled back if needed.

