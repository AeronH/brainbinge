# How to Update Podcast Voices with Real Speechify IDs

## The Problem

The current voice presets use placeholder IDs like "george", "sara", etc. These aren't real Speechify voice IDs, which is why you're getting 422 errors.

**Snoop Dogg works** because it has the real ID: `81dd4427-89aa-4a1a-9527-d225b44f7b28`

## Solution: Browse & Pick Real Voices

### Step 1: Start Your Dev Server
```bash
npm run dev
```

### Step 2: Go to Admin Page
Visit: `http://localhost:3000/admin`

### Step 3: Browse Voices
1. Click **"Fetch All Voices"** button
2. Wait for voices to load
3. You'll see all available Speechify voices with:
   - Voice name
   - Gender (male/female)
   - **Voice ID** (the important part!)
   - Tags
   - Preview button (click to hear)

### Step 4: Pick Your Favorites

**Keep:**
- ✅ Snoop Dogg (`81dd4427-89aa-4a1a-9527-d225b44f7b28`)

**Find 5 more good voices:**

Look for voices that would work well for podcasts:
- Clear and articulate
- Mix of male and female
- Different personalities (energetic, calm, professional)
- Use the preview button to hear them!

**Recommended tags to look for:**
- "conversational"
- "friendly"
- "professional"
- "narrator"
- "engaging"

### Step 5: Copy Voice IDs

When you find a voice you like:
1. Copy the voice ID (the long string in the code block)
2. Copy the display name
3. Note the gender

### Step 6: Update podcast-voices.ts

Open `/Users/aeronhorne/Coding/learnly/src/lib/podcast-voices.ts`

Replace the entire file with your selected voices:

```typescript
export const PODCAST_VOICE_PRESETS = [
  {
    id: "81dd4427-89aa-4a1a-9527-d225b44f7b28",
    name: "Snoop Dogg",
    description: "Cool, laid-back, and iconic rap legend voice",
    gender: "male",
  },
  {
    id: "PASTE_REAL_ID_HERE", // Example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    name: "Voice Name", // Copy from admin page
    description: "Brief description",
    gender: "male", // or "female"
  },
  // Add 4 more...
];
```

### Step 7: Clean Up Old Previews

Delete the broken previews:

```sql
-- Run in Supabase SQL Editor
DELETE FROM voice_previews;
```

### Step 8: Generate New Previews

1. Go back to `/admin`
2. Click "Generate Voice Previews"
3. Should succeed with all real voice IDs!

## Example: Good Voice Combinations

**Diverse Podcast Duo:**
- Snoop Dogg (male, casual) + Professional Female (clear, articulate)
- Energetic Male + Calm Female
- British Male + American Female

**Same Gender Mix:**
- Two males with different tones (one deep, one lighter)
- Two females with different energy levels

## Quick Fix Template

Here's a template ready to paste once you find voice IDs:

```typescript
export const PODCAST_VOICE_PRESETS = [
  {
    id: "81dd4427-89aa-4a1a-9527-d225b44f7b28",
    name: "Snoop Dogg",
    description: "Cool, laid-back rap legend",
    gender: "male",
  },
  {
    id: "YOUR_VOICE_ID_1",
    name: "Professional Male",
    description: "Clear, confident narrator",
    gender: "male",
  },
  {
    id: "YOUR_VOICE_ID_2",
    name: "Friendly Female",
    description: "Warm, engaging educator",
    gender: "female",
  },
  {
    id: "YOUR_VOICE_ID_3",
    name: "Energetic Male",
    description: "Enthusiastic and dynamic",
    gender: "male",
  },
  {
    id: "YOUR_VOICE_ID_4",
    name: "Calm Female",
    description: "Soothing and professional",
    gender: "female",
  },
  {
    id: "YOUR_VOICE_ID_5",
    name: "British Narrator",
    description: "Articulate and refined",
    gender: "male",
  },
];
```

## Why This Matters

Using correct voice IDs:
- ✅ Prevents 422 errors
- ✅ Ensures voice previews work
- ✅ Gives users actual voice variety
- ✅ Matches names with actual voices

## After Updating

Once you have real IDs:
1. Voice previews will match their names
2. No more 422 errors
3. Podcasts generate successfully
4. Users can hear accurate previews before selecting

Start your dev server and visit `/admin` to browse voices now! 🎤

