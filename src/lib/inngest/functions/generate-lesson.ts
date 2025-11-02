import { inngest } from '@/lib/inngest/client';
import { createClient } from '@supabase/supabase-js';

// Get environment variables - validate they exist
function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}. Please check your .env.local file.`);
  }
  return value;
}

const FORMATS = [
  {
    id: 'concept-intro',
    name: 'Concept Introduction',
    whenToUse: 'Introducing new concepts, definitions, foundational ideas',
    promptTemplate: `Create a RICH, VARIED concept introduction with multiple elements:
1. Heading with emoji
2. Opening - Use 2-3 SHORT paragraphs (2-3 sentences each) OR a bulleted list if introducing multiple items
3. Definition callout if there's a key term to define
4. Explanation - Use MULTIPLE short paragraphs (2-3 sentences each) that naturally break concepts apart. Each paragraph should cover ONE idea or example.
5. Use bullets (5+ items) or numbered lists for examples, comparisons, or lists of items
6. Include ONE example maximum (optional, only if truly helpful)
7. Think About It question if appropriate

CRITICAL STRUCTURE REQUIREMENTS:
- Create RICH content: Aim for 5+ bullets, maximum 1 example per subsection
- VARY the structure: Mix paragraphs, bullets, numbered lists, callouts
- Keep paragraphs SHORT (2-3 sentences max)
- Each paragraph should cover ONE distinct idea or example
- Use bullets for lists of items, examples, or comparisons (MUST have 5+ items)
- Use numbered lists for sequential steps or methods
- Break concepts naturally - don't just split text arbitrarily
- **Bold** key terms and concepts

Return JSON (use arrays for multiple paragraphs, bullets for lists):
{
  "heading": "🔍 [Title]",
  "introParagraphs": ["Short paragraph 1...", "Short paragraph 2...", "Short paragraph 3..."],
  "definition": { "term": "...", "definition": "..." },
  "explanationParagraphs": ["First idea...", "Second idea...", "Third idea..."],
  "bulletedList": ["Item 1", "Item 2", "Item 3", "Item 4", "Item 5"],
  "examples": ["Example 1..."],
  "thinkAbout": "..."
}`
  },
  {
    id: 'worked-example',
    name: 'Worked Example',
    whenToUse: 'Math problems, step-by-step solutions, calculations',
    promptTemplate: `Create a RICH worked example with multiple elements:
1. Heading with emoji
2. Context - 2-3 SHORT paragraphs (2-3 sentences each) OR bullets for background info
3. Problem statement - Full problem text in callout
4. Steps - Use numbered list showing EVERY step of work (must have 3+ steps)
5. Answer - 2-3 SHORT paragraphs (2-3 sentences each) explaining the result

CRITICAL:
- Use numbered lists for sequential steps (MUST have 3+ steps)
- Use bullets for related points or considerations (5+ items)
- Keep paragraphs SHORT (2-3 sentences max)
- **Bold** important values and results
- Each paragraph covers ONE idea
- Include ONE example only if it adds significant value

Return JSON:
{
  "heading": "📐 [Title]",
  "contextParagraphs": ["Short context 1...", "Short context 2...", "Short context 3..."],
  "problem": "Full problem...",
  "steps": [{ "label": "Step 1", "work": "Complete work with **bold** results" }, { "label": "Step 2", "work": "..." }, { "label": "Step 3", "work": "..." }],
  "answerParagraphs": ["Short answer 1...", "Short answer 2...", "Short answer 3..."]
}`
  },
  {
    id: 'list-comparison',
    name: 'List/Comparison',
    whenToUse: 'Categorizing, listing points, comparing',
    promptTemplate: `Create a RICH comprehensive list with multiple elements:
1. Heading with emoji
2. Intro - 2-3 SHORT paragraphs (2-3 sentences) introducing the list
3. Use bullets for the main list items - Include EVERY point from source, **bold** key info (MUST have 5+ items)
4. Between bullets, add short explanatory paragraphs (2-3 sentences) if needed for context
5. Include ONE example maximum (optional, only if truly helpful)
6. Summary - 2-3 SHORT paragraphs (2-3 sentences) concluding thoughts

CRITICAL:
- Use bullets for lists of items (MUST have 5+ items)
- Add short paragraphs BETWEEN bullets to explain or provide context
- Keep paragraphs SHORT (2-3 sentences max)
- **Bold** important terms in bullets
- Include ALL points from source
- Add maximum 1 example only if it adds significant value

Return JSON:
{
  "heading": "📋 [Title]",
  "introParagraphs": ["Short intro 1...", "Short intro 2...", "Short intro 3..."],
  "bulletPoints": ["All points with **bold** terms", "...", "...", "...", "..."],
  "explanationParagraphs": ["Context between items...", "..."],
  "examples": ["Example 1..."],
  "summaryParagraphs": ["Short summary 1...", "Short summary 2...", "Short summary 3..."]
}`
  },
  {
    id: 'formula-equation',
    name: 'Formula/Equation',
    whenToUse: 'Equations, mathematical relationships',
    promptTemplate: `Create a RICH formula section with multiple elements:
1. Heading with emoji
2. Context - 2-3 SHORT paragraphs (2-3 sentences), **bold** key concepts
3. Formula in callout
4. Variables - Use bullets OR numbered list to define ALL variables (MUST have 3+ variables)
5. Application - 2-3 SHORT paragraphs (2-3 sentences) with use cases

CRITICAL:
- Use bullets for variable definitions (MUST have 3+ variables)
- Keep paragraphs SHORT (2-3 sentences max)
- **Bold** key concepts
- Each paragraph covers ONE idea
- Include ONE example maximum (optional, only if truly helpful)

Return JSON:
{
  "heading": "🧮 [Title]",
  "contextParagraphs": ["Short context 1...", "Short context 2...", "Short context 3..."],
  "formula": "...",
  "variables": ["**A** = complete description", "**B** = complete description", "**C** = complete description"],
  "applicationParagraphs": ["Short application 1...", "Short application 2...", "Short application 3..."],
  "examples": ["Example 1...", "Example 2..."]
}`
  },
  {
    id: 'visual-conceptual',
    name: 'Visual/Conceptual',
    whenToUse: 'Visual concepts, processes, spatial relationships',
    promptTemplate: `Create a RICH visual section with multiple elements:
1. Heading with emoji
2. Overview - 2-3 SHORT paragraphs (2-3 sentences), **bold** key aspects
3. Key points - Use bullets for EVERY important point (MUST have 5+ points)
4. Tip callout if helpful
5. Include ONE example maximum (optional, only if truly helpful)
6. Connection section - 2-3 SHORT paragraphs (2-3 sentences) connecting concepts

CRITICAL:
- Use bullets for key points (MUST have 5+ points)
- Keep paragraphs SHORT (2-3 sentences max)
- **Bold** key aspects
- Each paragraph covers ONE idea
- Include maximum 1 example only if it adds significant value

Return JSON:
{
  "heading": "🎯 [Title]",
  "overviewParagraphs": ["Short overview 1...", "Short overview 2...", "Short overview 3..."],
  "keyPoints": ["All points with **bold** terms", "...", "...", "...", "..."],
  "tip": "...",
  "examples": ["Example 1..."],
  "connectionParagraphs": ["Short connection 1...", "Short connection 2...", "Short connection 3..."]
}`
  },
  {
    id: 'application-practice',
    name: 'Application & Practice',
    whenToUse: 'Critical thinking, practice, application',
    promptTemplate: `Create a RICH application section with multiple elements:
1. Heading with emoji
2. Question callout
3. Guidance - 2-3 SHORT paragraphs (2-3 sentences) OR bullets for guidance points
4. Points to consider - Use bullets for ALL relevant points (MUST have 5+ points)
5. Include ONE example maximum (optional, only if truly helpful)

CRITICAL:
- Use bullets for lists of points (MUST have 5+ points)
- Keep paragraphs SHORT (2-3 sentences max)
- Each paragraph covers ONE idea
- Include maximum 1 example only if it adds significant value

Return JSON:
{
  "heading": "💡 [Title]",
  "mainQuestion": "...",
  "guidanceParagraphs": ["Short guidance 1...", "Short guidance 2...", "Short guidance 3..."],
  "considerationPoints": ["All points...", "...", "...", "...", "..."],
  "examples": ["Example 1...", "Example 2..."]
}`
  }
];

function countWords(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function countWordsInBlocks(blocks: any[]): number {
  if (!blocks || !Array.isArray(blocks)) return 0;
  return blocks.reduce((total, block) => {
    if (!block || !block.content) return total;
    return total + countWords(block.content);
  }, 0);
}

function calculateTargetWordCount(inputWords: number) {
  const min = Math.floor(inputWords * 0.85);
  const max = Math.floor(inputWords * 0.95);
  return { min, max };
}

function calculateSectionCount(content: string): number {
  const wordCount = countWords(content);
  
  if (wordCount < 200) return 3;
  if (wordCount < 500) return 4;
  if (wordCount < 1000) return 5;
  if (wordCount < 2000) return 6;
  if (wordCount < 5000) return 8;
  if (wordCount < 10000) return 12;
  if (wordCount < 20000) return Math.max(16, Math.ceil(wordCount / 1100));
  return Math.min(20, Math.ceil(wordCount / 1100));
}

function formatToBlocks(formatId: string, data: any, startOrder: number): any[] {
  const blocks = [];
  let order = startOrder;

  // Helper to add paragraphs (handles both single strings and arrays)
  const addParagraphs = (paragraphs: string | string[] | undefined) => {
    if (!paragraphs) return;
    const paras = Array.isArray(paragraphs) ? paragraphs : [paragraphs];
    paras.forEach(para => {
      if (para && para.trim()) {
        blocks.push({ type: 'paragraph', content: para.trim(), order: order++, calloutType: null });
      }
    });
  };

  // Helper to add bullets
  const addBullets = (bullets: string[] | undefined) => {
    if (!bullets || !Array.isArray(bullets)) return;
    bullets.forEach(bullet => {
      if (bullet && bullet.trim()) {
        blocks.push({ type: 'bullet', content: bullet.trim(), order: order++, calloutType: null });
      }
    });
  };

  // Helper to add numbered list
  const addNumberedList = (items: string[] | undefined) => {
    if (!items || !Array.isArray(items)) return;
    items.forEach(item => {
      if (item && item.trim()) {
        blocks.push({ type: 'numbered', content: item.trim(), order: order++, calloutType: null });
      }
    });
  };

  if (formatId === 'concept-intro') {
    if (data.heading) blocks.push({ type: 'heading3', content: data.heading, order: order++, calloutType: null });
    
    // Handle intro paragraphs (array or single)
    addParagraphs(data.introParagraphs || data.introParagraph);
    
    // Handle bulleted list if present
    addBullets(data.bulletedList);
    
    if (data.definition) {
      blocks.push({
        type: 'callout',
        content: `**${data.definition.term}**: ${data.definition.definition}`,
        calloutType: 'definition',
        order: order++
      });
    }
    
    // Handle explanation paragraphs (array or single)
    addParagraphs(data.explanationParagraphs || data.explanationParagraph);
    
    // Handle examples if present
    if (data.examples && Array.isArray(data.examples)) {
      data.examples.forEach((example: string) => {
        if (example && example.trim()) {
          blocks.push({
            type: 'callout',
            content: `**Example:** ${example.trim()}`,
            calloutType: 'example',
            order: order++
          });
        }
      });
    }
    
    if (data.thinkAbout) {
      blocks.push({
        type: 'callout',
        content: `**Think About It:** ${data.thinkAbout}`,
        calloutType: 'question',
        order: order++
      });
    }
  } else if (formatId === 'worked-example') {
    if (data.heading) blocks.push({ type: 'heading3', content: data.heading, order: order++, calloutType: null });
    
    // Handle context paragraphs (array or single)
    addParagraphs(data.contextParagraphs || data.contextParagraph);
    
    // Handle bullets for context if present
    addBullets(data.contextBullets);
    
    if (data.problem) blocks.push({
      type: 'callout',
      content: `**Problem:** ${data.problem}`,
      calloutType: 'example',
      order: order++
    });
    
    // Handle steps - can be numbered list or bullets
    if (data.steps && Array.isArray(data.steps)) {
      for (const step of data.steps) {
        if (step.label && step.work) {
          blocks.push({
            type: 'numbered',
            content: `**${step.label}:** ${step.work}`,
            order: order++,
            calloutType: null
          });
        }
      }
    }
    
    // Handle answer paragraphs (array or single)
    addParagraphs(data.answerParagraphs || data.answerParagraph);
  } else if (formatId === 'list-comparison') {
    if (data.heading) blocks.push({ type: 'heading3', content: data.heading, order: order++, calloutType: null });
    
    // Handle intro paragraphs (array or single)
    addParagraphs(data.introParagraphs || data.introParagraph);
    
    // Handle bullet points
    addBullets(data.bulletPoints);
    
    // Handle explanatory paragraphs between bullets (for context)
    addParagraphs(data.explanationParagraphs);
    
    // Handle examples if present
    if (data.examples && Array.isArray(data.examples)) {
      data.examples.forEach((example: string) => {
        if (example && example.trim()) {
          blocks.push({
            type: 'callout',
            content: `**Example:** ${example.trim()}`,
            calloutType: 'example',
            order: order++
          });
        }
      });
    }
    
    // Handle summary paragraphs (array or single)
    addParagraphs(data.summaryParagraphs || data.summaryParagraph);
  } else if (formatId === 'formula-equation') {
    if (data.heading) blocks.push({ type: 'heading3', content: data.heading, order: order++, calloutType: null });
    
    // Handle context paragraphs (array or single)
    addParagraphs(data.contextParagraphs || data.contextParagraph);
    
    if (data.formula) blocks.push({
      type: 'callout',
      content: data.formula,
      calloutType: 'formula',
      order: order++
    });
    
    // Handle variables - can be bullets or numbered list
    if (data.variables && Array.isArray(data.variables)) {
      // Check if we should use numbered list (if format suggests it)
      const useNumbered = data.useNumberedList || false;
      if (useNumbered) {
        addNumberedList(data.variables);
      } else {
        addBullets(data.variables);
      }
    }
    
    // Handle application paragraphs (array or single)
    addParagraphs(data.applicationParagraphs || data.applicationParagraph);
    
    // Handle examples if present
    if (data.examples && Array.isArray(data.examples)) {
      data.examples.forEach((example: string) => {
        if (example && example.trim()) {
          blocks.push({
            type: 'callout',
            content: `**Example:** ${example.trim()}`,
            calloutType: 'example',
            order: order++
          });
        }
      });
    }
    
    // Handle summary paragraphs (array or single)
    addParagraphs(data.summaryParagraphs || data.summaryParagraph);
  } else if (formatId === 'formula-equation') {
    if (data.heading) blocks.push({ type: 'heading3', content: data.heading, order: order++, calloutType: null });
    
    // Handle overview paragraphs (array or single)
    addParagraphs(data.overviewParagraphs || data.overviewParagraph);
    
    // Handle key points as bullets
    addBullets(data.keyPoints);
    
    if (data.tip) blocks.push({
      type: 'callout',
      content: `**Tip:** ${data.tip}`,
      calloutType: 'tip',
      order: order++
    });
    
    // Handle examples if present
    if (data.examples && Array.isArray(data.examples)) {
      data.examples.forEach((example: string) => {
        if (example && example.trim()) {
          blocks.push({
            type: 'callout',
            content: `**Example:** ${example.trim()}`,
            calloutType: 'example',
            order: order++
          });
        }
      });
    }
    
    // Handle connection paragraphs (array or single)
    addParagraphs(data.connectionParagraphs || data.connectionParagraph);
  } else if (formatId === 'application-practice') {
    if (data.heading) blocks.push({ type: 'heading3', content: data.heading, order: order++, calloutType: null });
    if (data.mainQuestion) blocks.push({
      type: 'callout',
      content: data.mainQuestion,
      calloutType: 'question',
      order: order++
    });
    
    // Handle guidance paragraphs (array or single) or bullets
    addParagraphs(data.guidanceParagraphs || data.guidanceParagraph);
    addBullets(data.guidanceBullets);
    
    // Handle consideration points as bullets
    addBullets(data.considerationPoints);
    
    // Handle examples if present
    if (data.examples && Array.isArray(data.examples)) {
      data.examples.forEach((example: string) => {
        if (example && example.trim()) {
          blocks.push({
            type: 'callout',
            content: `**Example:** ${example.trim()}`,
            calloutType: 'example',
            order: order++
          });
        }
      });
    }
  }

  return blocks;
}

// Generate subsections for a major section
async function generateSubsectionsForSection(
  section: { sectionTitle: string; topicDescription: string },
  content: string,
  wordsPerSection: number,
  allFormats: typeof FORMATS,
  sectionIndex: number,
  totalSections: number,
  OPENAI_API_KEY: string
): Promise<Array<{ formatId: string; subsectionTitle: string; content: any }>> {
  const formatsDesc = allFormats.map(f => `- ${f.id}: ${f.whenToUse}`).join('\n');
  
  const subsectionPlanningPrompt = `You are creating subsections for a major section: "${section.sectionTitle}"

Section Description: ${section.topicDescription}

This section needs to cover approximately ${wordsPerSection} words from the source content.

Determine how many subsections (3-5 recommended) and which format to use for each subsection.
Each subsection should cover a distinct aspect of this topic.

Available formats:
${formatsDesc}

Return JSON:
{
  "subsections": [
    {
      "subsectionTitle": "Subsection title",
      "formatId": "format ID",
      "topicDescription": "What this subsection covers"
    }
  ]
}`;

  const response = await fetchWithTimeout(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Plan 3-5 subsections for section "${section.sectionTitle}". Each subsection should use a different format and cover distinct aspects.`
          },
          { role: 'user', content: `${subsectionPlanningPrompt}\n\nSource content:\n${content}` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7
      })
    },
    120000
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Inngest] Subsection planning error for section ${sectionIndex + 1}:`, errorText);
    throw new Error(`Subsection planning failed for section ${sectionIndex + 1}`);
  }

  const planData = await response.json();
  const parsedPlan = JSON.parse(planData.choices[0].message.content);
  
  if (!parsedPlan.subsections || !Array.isArray(parsedPlan.subsections)) {
    throw new Error(`Invalid subsection plan for section ${sectionIndex + 1}`);
  }

  console.log(`[Inngest] Section ${sectionIndex + 1}: Planning ${parsedPlan.subsections.length} subsections`);

  // Generate all subsections in parallel
  const subsectionPromises = parsedPlan.subsections.map(async (subsection: any, subIndex: number) => {
    const formatDef = allFormats.find(f => f.id === subsection.formatId) || allFormats.find(f => f.id === 'list-comparison');
    
    if (!formatDef) {
      throw new Error(`Unknown format: ${subsection.formatId}`);
    }

    const wordsPerSubsection = Math.floor(wordsPerSection / parsedPlan.subsections.length);
    
    const subsectionPrompt = `${formatDef.promptTemplate}

Subsection: ${subsection.subsectionTitle}
Cover: ${subsection.topicDescription}

CRITICAL WORD COUNT REQUIREMENT:
- This subsection must output approximately ${wordsPerSubsection} words
- Subsection ${subIndex + 1} of ${parsedPlan.subsections.length} in section "${section.sectionTitle}"
- Preserve 85-95% of ALL relevant source content for this topic
- Include EVERY detail, example, explanation, formula from source
- Use as many paragraphs, bullets, and callouts as needed
- DO NOT SUMMARIZE - reformat the full content

Source content:
${content}`;

    const subsectionResponse = await fetchWithTimeout(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Generate subsection ${subIndex + 1}/${parsedPlan.subsections.length} for section "${section.sectionTitle}". OUTPUT TARGET: ~${wordsPerSubsection} words. Preserve ALL content.

CRITICAL STRUCTURE REQUIREMENTS:
- Create RICH content: Aim for 5+ bullets, maximum 1 example per subsection
- VARY the structure: Mix paragraphs, bullets, numbered lists, callouts
- Keep paragraphs SHORT (2-3 sentences max)
- Each paragraph should cover ONE distinct idea or example
- Use bullets for lists of items, examples, or comparisons (MUST have 5+ items)
- Use numbered lists for sequential steps or methods
- Break concepts naturally - don't just split text arbitrarily
- **Bold** key terms and concepts
- DO NOT SUMMARIZE - reformat the full content with varied structure`
            },
            { role: 'user', content: subsectionPrompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7
        })
      },
      180000,
      2
    );

    if (!subsectionResponse.ok) {
      const errorText = await subsectionResponse.text();
      console.error(`[Inngest] Subsection ${subIndex + 1} error:`, errorText);
      throw new Error(`Subsection ${subIndex + 1} failed`);
    }

    const subsectionData = await subsectionResponse.json();
    const subsectionContent = JSON.parse(subsectionData.choices[0].message.content);
    
    return {
      formatId: subsection.formatId,
      subsectionTitle: subsection.subsectionTitle,
      content: subsectionContent
    };
  });

  const subsections = await Promise.all(subsectionPromises);
  console.log(`[Inngest] Section ${sectionIndex + 1}: Generated ${subsections.length} subsections`);
  
  return subsections;
}

async function fetchWithTimeout(url: string, options: any, timeoutMs = 180000, retries = 2): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (attempt < retries && error.name === 'AbortError') {
        console.log(`[Inngest] Retry ${attempt + 1}...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      throw error;
    }
  }
  throw new Error('All retries failed');
}

export const generateLesson = inngest.createFunction(
  { 
    id: 'generate-lesson', 
    name: 'Generate Lesson',
    retries: 0, // Disable automatic retries - we handle retries manually
  },
  { event: 'lesson/generate' },
  async ({ event, step }) => {
    const { lessonId } = event.data;

    if (!lessonId) {
      throw new Error('lessonId required');
    }

    console.log(`[Inngest] Starting generation for lesson: ${lessonId}`);

    // Get environment variables at runtime
    const OPENAI_API_KEY = getEnvVar('OPENAI_API_KEY');
    const SUPABASE_URL = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

    // Create Supabase admin client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    try {
    // Step 1: Fetch lesson (with retry to handle eventual consistency)
    const lesson = await step.run('fetch-lesson', async () => {
      console.log(`[Inngest] Fetching lesson ${lessonId}...`);
      
      // Retry logic for eventual consistency
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        const { data, error } = await supabase
          .from('lessons')
          .select('*')
          .eq('id', lessonId)
          .single();

        if (error) {
          // PGRST116 means no rows found - lesson doesn't exist
          if (error.code === 'PGRST116') {
            console.error(`[Inngest] Lesson ${lessonId} does not exist in database`);
            throw new Error(`Lesson ${lessonId} not found in database`);
          }
          
          console.error(`[Inngest] Error fetching lesson (attempt ${attempts + 1}):`, error);
          if (attempts < maxAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempts + 1))); // Exponential backoff
            attempts++;
            continue;
          }
          throw new Error(`Lesson not found: ${error.message}`);
        }

        if (!data) {
          console.warn(`[Inngest] No data returned (attempt ${attempts + 1})`);
          if (attempts < maxAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempts + 1)));
            attempts++;
            continue;
          }
          throw new Error('Lesson not found: No data returned');
        }

        // Idempotency check: if lesson is already complete, skip
        if (data.status === 'ready') {
          console.log(`[Inngest] Lesson ${lessonId} is already complete, skipping generation`);
          return { skip: true, lesson: data };
        }

        // If lesson is in error state, we can retry
        if (data.status === 'error') {
          console.log(`[Inngest] Lesson ${lessonId} was in error state, retrying generation`);
        }

        console.log(`[Inngest] Successfully fetched lesson: ${lessonId}, status: ${data.status}`);
        return data as any;
      }

      throw new Error('Failed to fetch lesson after retries');
    });

    // Check if we should skip (already complete)
    if ((lesson as any).skip) {
      console.log(`[Inngest] Skipping generation for lesson ${lessonId} - already complete`);
      return { success: true, lessonId, skipped: true };
    }

    const content = lesson.original_content;

    if (!content) {
      await step.run('mark-error', async () => {
        await supabase.from('lessons').update({ status: 'error' }).eq('id', lessonId);
      });
      throw new Error('No content');
    }

    const inputWordCount = countWords(content);
    const targetSectionCount = calculateSectionCount(content);
    const targetWords = calculateTargetWordCount(inputWordCount);

    console.log(`[Inngest] Content: ${content.length} chars, ${inputWordCount} words`);
    console.log(`[Inngest] Target sections: ${targetSectionCount}`);
    console.log(`[Inngest] Target output: ${targetWords.min}-${targetWords.max} words (85-95% retention)`);

    // Step 2: Generate title
    const title = await step.run('generate-title', async () => {
      console.log('[Inngest] Generating title...');
      
      const response = await fetchWithTimeout(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'Create a concise lesson title (3-8 words). Return only the title.' },
              { role: 'user', content: `Title for: ${content.substring(0, 1000)}` }
            ],
            temperature: 0.7,
            max_tokens: 50
          })
        },
        60000
      );

      if (!response.ok) throw new Error('Title failed');
      const titleData = await response.json();
      const titleText = titleData.choices[0].message.content?.trim() || 'New Lesson';
      console.log(`[Inngest] Title: ${titleText}`);
      return titleText;
    });

    // Step 3: Create plan
    const plan = await step.run('create-plan', async () => {
      console.log('[Inngest] Phase 1: Planning...');
      
      const planningPrompt = `You are creating a lesson that must OUTPUT ${targetWords.min}-${targetWords.max} WORDS from ${inputWordCount} input words.

CRITICAL OUTPUT REQUIREMENTS:
- YOUR OUTPUT MUST BE ${targetWords.min}-${targetWords.max} WORDS (85-95% of input)
- This is NOT a summary - you must preserve nearly ALL content
- Reformat for clarity but DO NOT condense or remove content
- Break into ${targetSectionCount} major sections for organization
- Think: Reformatting a textbook chapter, keeping 90% of words

Create ${targetSectionCount} major sections. Each section will contain multiple subsections (determined during generation).

Return JSON:
{
  "summary": "2-3 sentence overview",
  "sections": [{
    "sectionTitle": "Topic",
    "topicDescription": "What this section covers (2-3 sentences)"
  }]
}`;

      const response = await fetchWithTimeout(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `Create ${targetSectionCount} major sections by identifying natural topic breaks. CRITICAL: Final lesson must be ${targetWords.min}-${targetWords.max} words. Preserve 85-95% of content. Do NOT assign formats - just identify section topics.`
              },
              { role: 'user', content: `${planningPrompt}\n\nFull content:\n${content}` }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7
          })
        },
        120000
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Inngest] Planning error:', errorText);
        throw new Error('Planning failed');
      }

      const planData = await response.json();
      const parsedPlan = JSON.parse(planData.choices[0].message.content);
      console.log(`[Inngest] Plan: ${parsedPlan.sections?.length || 0} sections`);
      return parsedPlan;
    });

    // Step 4: Generate sections with subsections in parallel batches
    const allBlocks = await step.run('generate-sections', async () => {
      console.log('[Inngest] Phase 2: Generating sections with subsections...');
      const blocks: any[] = [];
      let totalWordsGenerated = 0;
      const wordsPerSection = Math.floor(targetWords.min / plan.sections.length);

      // Process sections in batches of 3 for parallelization
      const batchSize = 3;
      for (let batchStart = 0; batchStart < plan.sections.length; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, plan.sections.length);
        const batch = plan.sections.slice(batchStart, batchEnd);
        
        console.log(`[Inngest] Processing batch ${Math.floor(batchStart / batchSize) + 1}: sections ${batchStart + 1}-${batchEnd}`);

        // Generate all sections in this batch in parallel
        const batchPromises = batch.map(async (section: any, batchIndex: number) => {
          const sectionIndex = batchStart + batchIndex;
          const sectionEmojis = ['📚', '🔬', '✨', '🎯', '💡', '🔍', '📊', '🧪', '🎨', '⚡', '🌟', '🔥', '💫', '🎭', '🚀', '🌈', '🎪', '🔮', '🎯', '💎'];
          
          console.log(`[Inngest] Section ${sectionIndex + 1}/${plan.sections.length}: ${section.sectionTitle}`);

          // Generate subsections for this section
          const subsections = await generateSubsectionsForSection(
            section,
            content,
            wordsPerSection,
            FORMATS,
            sectionIndex,
            plan.sections.length,
            OPENAI_API_KEY
          );

          // Build blocks for this section
          const sectionBlocks: any[] = [];
          
          // Add major section heading (heading2)
          // Use large gaps for ordering: section index * 1000
          const sectionBaseOrder = sectionIndex * 1000;
          sectionBlocks.push({
            type: 'heading2',
            content: `${sectionEmojis[sectionIndex % sectionEmojis.length]} ${section.sectionTitle}`,
            order: sectionBaseOrder,
            calloutType: null
          });

          // Process each subsection
          for (let subIndex = 0; subIndex < subsections.length; subIndex++) {
            const subsection = subsections[subIndex];
            const subsectionBaseOrder = sectionBaseOrder + (subIndex + 1) * 10;
            
            // Convert subsection content to blocks
            const subsectionBlocks = formatToBlocks(subsection.formatId, subsection.content, subsectionBaseOrder);
            sectionBlocks.push(...subsectionBlocks);
          }

          const sectionWordCount = countWordsInBlocks(sectionBlocks);
          console.log(`[Inngest] Section ${sectionIndex + 1} ✓ (${sectionBlocks.length} blocks, ${sectionWordCount} words)`);
          
          return { sectionIndex, blocks: sectionBlocks, wordCount: sectionWordCount };
        });

        // Wait for all sections in batch to complete
        const batchResults = await Promise.all(batchPromises);
        
        // Sort by sectionIndex to maintain order
        batchResults.sort((a, b) => a.sectionIndex - b.sectionIndex);
        
        // Add blocks from this batch
        for (const result of batchResults) {
          blocks.push(...result.blocks);
          totalWordsGenerated += result.wordCount;
          
          // Add divider between major sections (except after last section)
          if (result.sectionIndex < plan.sections.length - 1) {
            const dividerOrder = (result.sectionIndex + 1) * 1000 - 1;
            blocks.push({ type: 'divider', content: '', order: dividerOrder, calloutType: null });
          }
        }
        
        console.log(`[Inngest] Batch complete. Total so far: ${blocks.length} blocks, ${totalWordsGenerated} words`);
      }

      // Sort blocks by order_index to ensure correct sequence
      blocks.sort((a, b) => a.order - b.order);
      
      // Renumber blocks sequentially (preserving relative order)
      blocks.forEach((block, index) => {
        block.order = index;
      });

      console.log(`[Inngest] All sections complete! ${blocks.length} blocks, ${totalWordsGenerated} words`);
      return blocks;
    });

    // Step 5: Generate practice
    const practice = await step.run('generate-practice', async () => {
      console.log('[Inngest] Phase 3: Practice...');
      
      const response = await fetchWithTimeout(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'Create practice content.' },
              {
                role: 'user',
                content: `For "${title}", create JSON:
{
  "practiceExercises": [{"question": "...", "hint": "..."}],
  "reviewQuestions": ["..."],
  "keyTakeaways": ["..."]
}

Context:
${content.substring(0, 2000)}`
              }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7
          })
        },
        90000
      );

      if (response.ok) {
        const practiceData = await response.json();
        return JSON.parse(practiceData.choices[0].message.content || '{}');
      }

      return {
        practiceExercises: [],
        reviewQuestions: [],
        keyTakeaways: []
      };
    });

    // Step 6: Save blocks and practice to database
    await step.run('save-blocks-and-practice', async () => {
      const wordCount = countWordsInBlocks(allBlocks);
      const retentionRatio = (wordCount / inputWordCount * 100).toFixed(1);
      console.log(`[Inngest] Complete! ${allBlocks.length} blocks, ${wordCount} words`);
      console.log(`[Inngest] Input: ${inputWordCount} | Output: ${wordCount} | Target: ${targetWords.min}-${targetWords.max}`);
      console.log(`[Inngest] Retention: ${retentionRatio}% (target: 85-95%)`);
      console.log('[Inngest] Saving to database...');

      // Save blocks to lesson_blocks table
      const blocksToInsert = allBlocks.map(block => ({
        lesson_id: lessonId,
        type: block.type,
        content: block.content,
        order_index: block.order,
        callout_type: block.calloutType || null
      }));

      const { error: blocksError } = await supabase.from('lesson_blocks').insert(blocksToInsert);
      if (blocksError) {
        console.error('[Inngest] Blocks error:', blocksError);
        throw new Error(`Failed to save blocks: ${blocksError.message}`);
      }
      console.log(`[Inngest] Saved ${blocksToInsert.length} blocks`);

      // Save practice items to lesson_practice table
      if (practice.practiceExercises.length > 0 || practice.reviewQuestions.length > 0 || practice.keyTakeaways.length > 0) {
        const practiceItems = [];
        let practiceOrder = 0;

        practice.practiceExercises.forEach((ex: any) => {
          practiceItems.push({
            lesson_id: lessonId,
            type: 'exercise',
            content: ex.question,
            hint: ex.hint || null,
            order_index: practiceOrder++
          });
        });

        practice.reviewQuestions.forEach((q: string) => {
          practiceItems.push({
            lesson_id: lessonId,
            type: 'review_question',
            content: q,
            hint: null,
            order_index: practiceOrder++
          });
        });

        practice.keyTakeaways.forEach((kt: string) => {
          practiceItems.push({
            lesson_id: lessonId,
            type: 'key_takeaway',
            content: kt,
            hint: null,
            order_index: practiceOrder++
          });
        });

        const { error: practiceError } = await supabase.from('lesson_practice').insert(practiceItems);
        if (practiceError) {
          console.error('[Inngest] Practice error:', practiceError);
        } else {
          console.log(`[Inngest] Saved ${practiceItems.length} practice items`);
        }
      }

      return { wordCount, blocksCount: blocksToInsert.length };
    });

    // Step 7: Update lesson status
    await step.run('update-database', async () => {
      const wordCount = countWordsInBlocks(allBlocks);
      
      const { error: updateError } = await supabase
        .from('lessons')
        .update({
          title,
          summary: plan.summary || '',
          word_count: wordCount,
          status: 'ready'
        })
        .eq('id', lessonId);

      if (updateError) {
        console.error('[Inngest] Update error:', updateError);
        throw new Error(`Failed to update: ${updateError.message}`);
      }

      console.log('[Inngest] ✅ Success');
      return { success: true, lessonId };
    });

    return { success: true, lessonId };
    } catch (error) {
      // Mark lesson as error on failure
      console.error('[Inngest] Error generating lesson:', error);
      await supabase.from('lessons').update({ status: 'error' }).eq('id', lessonId);
      throw error;
    }
  }
);
