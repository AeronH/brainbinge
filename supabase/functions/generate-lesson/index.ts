import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const FORMATS = [
  {
    id: 'concept-intro',
    name: 'Concept Introduction',
    whenToUse: 'Introducing new concepts, definitions, foundational ideas',
    promptTemplate: `Create a concept introduction with SHORT paragraphs (2-3 sentences max):
1. Heading with emoji
2. Opening paragraph (2-3 sentences, **bold** key terms)
3. Definition callout
4. Explanation paragraph (2-3 sentences, **bold** important concepts)
5. Think About It question

IMPORTANT: Use **bold** formatting for key terms, concepts, and important words.

Return JSON:
{
  "heading": "🔍 [Title]",
  "introParagraph": "Text with **bold terms**...",
  "definition": { "term": "...", "definition": "..." },
  "explanationParagraph": "Text with **bold concepts**...",
  "thinkAbout": "..."
}`
  },
  {
    id: 'worked-example',
    name: 'Worked Example',
    whenToUse: 'Math problems, step-by-step solutions, calculations',
    promptTemplate: `Create a worked example with DETAILED calculations:
1. Heading with emoji
2. Context (1-2 sentences)
3. Problem statement
4. Steps showing ALL work
5. Answer paragraph

Show COMPLETE calculations. **Bold** important values and results.

Return JSON:
{
  "heading": "📐 [Title]",
  "contextParagraph": "...",
  "problem": "...",
  "steps": [{ "label": "Step 1", "work": "Full calculation with **bold** results" }],
  "answerParagraph": "..."
}`
  },
  {
    id: 'list-comparison',
    name: 'List/Comparison',
    whenToUse: 'Categorizing, listing points, comparing',
    promptTemplate: `Create a comprehensive list:
1. Heading with emoji
2. Intro (1-2 sentences)
3. Bullets (include ALL relevant points, **bold** key info)
4. Summary (1-2 sentences)

**Bold** important terms in bullets.

Return JSON:
{
  "heading": "📋 [Title]",
  "introParagraph": "...",
  "bulletPoints": ["Text with **bold** terms", "..."],
  "summaryParagraph": "..."
}`
  },
  {
    id: 'formula-equation',
    name: 'Formula/Equation',
    whenToUse: 'Equations, mathematical relationships',
    promptTemplate: `Create a formula section covering ALL formulas in this topic:
1. Heading with emoji
2. Context (2 sentences, **bold** key concepts)
3. Formula
4. Variables defined (ALL variables)
5. Application note

Return JSON:
{
  "heading": "🧮 [Title]",
  "contextParagraph": "...",
  "formula": "...",
  "variables": ["**A** = ...", "**B** = ..."],
  "applicationParagraph": "..."
}`
  },
  {
    id: 'visual-conceptual',
    name: 'Visual/Conceptual',
    whenToUse: 'Visual concepts, processes, spatial relationships',
    promptTemplate: `Create a visual section covering the concept thoroughly:
1. Heading with emoji
2. Overview (2-3 sentences, **bold** key aspects)
3. Key points bullets (comprehensive)
4. Tip callout
5. Connection paragraph

Return JSON:
{
  "heading": "🎯 [Title]",
  "overviewParagraph": "...",
  "keyPoints": ["Point with **bold** terms", "..."],
  "tip": "...",
  "connectionParagraph": "..."
}`
  },
  {
    id: 'application-practice',
    name: 'Application & Practice',
    whenToUse: 'Critical thinking, practice, application',
    promptTemplate: `Create an application section:
1. Heading with emoji
2. Question callout
3. Guidance (2 sentences)
4. Points to consider (thorough)

Return JSON:
{
  "heading": "💡 [Title]",
  "mainQuestion": "...",
  "guidanceParagraph": "...",
  "considerationPoints": ["..."],
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

// Calculate appropriate number of sections based on content length
function calculateSectionCount(contentLength: number): number {
  const wordCount = countWords(contentLength);
  
  if (wordCount < 200) return 3;           // Short: 3 sections
  if (wordCount < 500) return 4;           // Medium: 4 sections
  if (wordCount < 1000) return 5;          // Standard: 5 sections
  if (wordCount < 2000) return 6;          // Long: 6 sections
  if (wordCount < 5000) return 8;          // Very long: 8 sections
  if (wordCount < 10000) return 12;        // Extra long: 12 sections
  if (wordCount < 20000) return 16;        // Massive: 16 sections
  return Math.min(20, Math.ceil(wordCount / 1200)); // Cap at 20 sections max
}

function formatToBlocks(formatId: string, data: any, startOrder: number): any[] {
  const blocks = [];
  let order = startOrder;

  if (formatId === 'concept-intro') {
    if (data.heading) blocks.push({ type: 'heading3', content: data.heading, order: order++ });
    if (data.introParagraph) blocks.push({ type: 'paragraph', content: data.introParagraph, order: order++ });
    if (data.definition) {
      blocks.push({
        type: 'callout',
        content: `**${data.definition.term}**: ${data.definition.definition}`,
        calloutType: 'definition',
        order: order++
      });
    }
    if (data.explanationParagraph) blocks.push({ type: 'paragraph', content: data.explanationParagraph, order: order++ });
    if (data.thinkAbout) {
      blocks.push({
        type: 'callout',
        content: `**Think About It:** ${data.thinkAbout}`,
        calloutType: 'question',
        order: order++
      });
    }
  } else if (formatId === 'worked-example') {
    if (data.heading) blocks.push({ type: 'heading3', content: data.heading, order: order++ });
    if (data.contextParagraph) blocks.push({ type: 'paragraph', content: data.contextParagraph, order: order++ });
    if (data.problem) blocks.push({
      type: 'callout',
      content: `**Problem:** ${data.problem}`,
      calloutType: 'example',
      order: order++
    });
    if (data.steps && Array.isArray(data.steps)) {
      for (const step of data.steps) {
        if (step.label && step.work) {
          blocks.push({
            type: 'bullet',
            content: `**${step.label}:** ${step.work}`,
            order: order++
          });
        }
      }
    }
    if (data.answerParagraph) blocks.push({ type: 'paragraph', content: data.answerParagraph, order: order++ });
  } else if (formatId === 'list-comparison') {
    if (data.heading) blocks.push({ type: 'heading3', content: data.heading, order: order++ });
    if (data.introParagraph) blocks.push({ type: 'paragraph', content: data.introParagraph, order: order++ });
    if (data.bulletPoints && Array.isArray(data.bulletPoints)) {
      for (const point of data.bulletPoints) {
        if (point) blocks.push({ type: 'bullet', content: point, order: order++ });
      }
    }
    if (data.summaryParagraph) blocks.push({ type: 'paragraph', content: data.summaryParagraph, order: order++ });
  } else if (formatId === 'formula-equation') {
    if (data.heading) blocks.push({ type: 'heading3', content: data.heading, order: order++ });
    if (data.contextParagraph) blocks.push({ type: 'paragraph', content: data.contextParagraph, order: order++ });
    if (data.formula) blocks.push({
      type: 'callout',
      content: data.formula,
      calloutType: 'formula',
      order: order++
    });
    if (data.variables && Array.isArray(data.variables)) {
      for (const variable of data.variables) {
        if (variable) blocks.push({ type: 'bullet', content: variable, order: order++ });
      }
    }
    if (data.applicationParagraph) blocks.push({ type: 'paragraph', content: data.applicationParagraph, order: order++ });
  } else if (formatId === 'visual-conceptual') {
    if (data.heading) blocks.push({ type: 'heading3', content: data.heading, order: order++ });
    if (data.overviewParagraph) blocks.push({ type: 'paragraph', content: data.overviewParagraph, order: order++ });
    if (data.keyPoints && Array.isArray(data.keyPoints)) {
      for (const point of data.keyPoints) {
        if (point) blocks.push({ type: 'bullet', content: point, order: order++ });
      }
    }
    if (data.tip) blocks.push({
      type: 'callout',
      content: `**Tip:** ${data.tip}`,
      calloutType: 'tip',
      order: order++
    });
    if (data.connectionParagraph) blocks.push({ type: 'paragraph', content: data.connectionParagraph, order: order++ });
  } else if (formatId === 'application-practice') {
    if (data.heading) blocks.push({ type: 'heading3', content: data.heading, order: order++ });
    if (data.mainQuestion) blocks.push({
      type: 'callout',
      content: data.mainQuestion,
      calloutType: 'question',
      order: order++
    });
    if (data.guidanceParagraph) blocks.push({ type: 'paragraph', content: data.guidanceParagraph, order: order++ });
    if (data.considerationPoints && Array.isArray(data.considerationPoints)) {
      for (const point of data.considerationPoints) {
        if (point) blocks.push({ type: 'bullet', content: point, order: order++ });
      }
    }
  }

  return blocks;
}

function fetchWithTimeout(url: string, options: any, timeoutMs = 180000, retries = 2) {
  return (async () => {
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
          console.log(`Retry ${attempt + 1}...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        throw error;
      }
    }
    throw new Error('All retries failed');
  })();
}

Deno.serve(async (req) => {
  console.log('[Edge] Request received');
  
  try {
    const { lessonId } = await req.json();
    
    if (!lessonId) return new Response(JSON.stringify({ error: 'lessonId required' }), { status: 400 });
    
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const { data: lesson, error: fetchError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();
    
    if (fetchError || !lesson) {
      await supabase.from('lessons').update({ status: 'error' }).eq('id', lessonId);
      return new Response(JSON.stringify({ error: 'Lesson not found' }), { status: 404 });
    }
    
    const content = (lesson as any).original_content;
    
    if (!content) {
      await supabase.from('lessons').update({ status: 'error' }).eq('id', lessonId);
      return new Response(JSON.stringify({ error: 'No content' }), { status: 400 });
    }
    
    const inputWordCount = countWords(content);
    const targetSectionCount = calculateSectionCount(content);
    
    console.log(`[Edge] Content: ${content.length} chars, ${inputWordCount} words`);
    console.log(`[Edge] Target sections: ${targetSectionCount}`);
    
    // Generate title
    console.log('[Edge] Generating title...');
    const titleResponse = await fetchWithTimeout(
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
    
    if (!titleResponse.ok) throw new Error('Title failed');
    const titleData = await titleResponse.json();
    const title = titleData.choices[0].message.content?.trim() || 'New Lesson';
    console.log(`[Edge] Title: ${title}`);
    
    // PHASE 1: Planning
    console.log('[Edge] Phase 1: Planning...');
    const formatsDesc = FORMATS.map(f => `- ${f.id}: ${f.whenToUse}`).join('\n');
    
    const planningPrompt = `Analyze this ${inputWordCount}-word content and create a COMPREHENSIVE lesson plan that covers EVERYTHING in detail.

Input length: ${inputWordCount} words
Target: ${targetSectionCount} sections (scaled to cover all content thoroughly)

Create ${targetSectionCount} sections. For EACH section, choose the BEST format.

Available formats:
${formatsDesc}

CRITICAL INSTRUCTIONS FOR LARGE CONTENT:
- Create ${targetSectionCount} sections to cover ALL material comprehensively
- Each section should cover a specific portion of the content in depth
- Don't skip or summarize - include all important concepts, examples, and details
- Vary format choices to keep lessons engaging
- Break complex topics into multiple focused sections
- For longer content, MORE sections = MORE comprehensive coverage

Return JSON:
{
  "summary": "2-3 sentence overview of the entire lesson",
  "sections": [
    {
      "sectionTitle": "Specific topic",
      "formatId": "format ID from available formats",
      "topicDescription": "What this section covers in detail (2-3 sentences)"
    }
  ]
}`;
    
    const planResponse = await fetchWithTimeout(
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
              content: `You are a lesson planning expert. For ${inputWordCount}-word content, create ${targetSectionCount} comprehensive sections that cover EVERYTHING. Don't summarize - break the content into detailed sections.`
            },
            { role: 'user', content: `${planningPrompt}\n\nFull content:\n${content}` }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7
        })
      },
      120000
    );
    
    if (!planResponse.ok) {
      const errorText = await planResponse.text();
      console.error('[Edge] Planning error:', errorText);
      throw new Error('Planning failed');
    }
    
    const planData = await planResponse.json();
    const plan = JSON.parse(planData.choices[0].message.content);
    console.log(`[Edge] Plan: ${plan.sections?.length || 0} sections (target: ${targetSectionCount})`);
    
    // PHASE 2: Generate sections
    console.log('[Edge] Phase 2: Generating sections...');
    const allBlocks = [];
    let currentOrder = 0;
    
    allBlocks.push({ type: 'heading1', content: `🎓 ${title}`, order: currentOrder++ });
    allBlocks.push({ type: 'paragraph', content: plan.summary || '', order: currentOrder++ });
    allBlocks.push({ type: 'divider', content: '', order: currentOrder++ });
    
    for (let i = 0; i < plan.sections.length; i++) {
      const section = plan.sections[i];
      let formatDef = FORMATS.find(f => f.id === section.formatId);
      
      if (!formatDef) {
        console.log(`[Edge] Unknown format: ${section.formatId}, using list`);
        formatDef = FORMATS.find(f => f.id === 'list-comparison');
        section.formatId = 'list-comparison';
      }
      
      console.log(`[Edge] Section ${i + 1}/${plan.sections.length}: ${section.sectionTitle} (${section.formatId})`);
      
      const sectionEmojis = ['📚', '🔬', '✨', '🎯', '💡', '🔍', '📊', '🧪', '🎨', '⚡', '🌟', '🔥', '💫', '🎭', '🚀', '🌈', '🎪', '🔮', '🎯', '💎'];
      allBlocks.push({
        type: 'heading2',
        content: `${sectionEmojis[i % sectionEmojis.length]} ${section.sectionTitle}`,
        order: currentOrder++
      });
      
      const sectionPrompt = `${formatDef.promptTemplate}

Section topic: ${section.sectionTitle}
What to cover: ${section.topicDescription}

CRITICAL INSTRUCTIONS:
- This is section ${i + 1} of ${plan.sections.length} covering a ${inputWordCount}-word document
- Cover this topic in COMPLETE DETAIL from the source material
- Include ALL relevant details, examples, formulas, calculations, and explanations
- Use **markdown bold** for important terms and values
- Keep paragraphs SHORT (2-3 sentences) but comprehensive
- Don't summarize or skip content - be thorough
- Extract ALL relevant information from the source for this section

Full source material:
${content}`;
      
      try {
        const sectionResponse = await fetchWithTimeout(
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
                  content: `You are an educational content writer creating section ${i + 1} of ${plan.sections.length} for comprehensive lesson. Extract ALL relevant information for this section and present it clearly with SHORT paragraphs. **Bold** key terms. Be thorough - don't skip details.`
                },
                { role: 'user', content: sectionPrompt }
              ],
              response_format: { type: 'json_object' },
              temperature: 0.7
            })
          },
          180000,
          2
        );
        
        if (!sectionResponse.ok) {
          const errorText = await sectionResponse.text();
          console.error(`[Edge] Section ${i + 1} error:`, errorText);
          throw new Error('Section failed');
        }
        
        const sectionData = await sectionResponse.json();
        const sectionContent = JSON.parse(sectionData.choices[0].message.content);
        const sectionBlocks = formatToBlocks(section.formatId, sectionContent, currentOrder);
        
        allBlocks.push(...sectionBlocks);
        currentOrder += sectionBlocks.length;
        
        const sectionWordCount = countWordsInBlocks(sectionBlocks);
        console.log(`[Edge] Section ${i + 1} ✓ (${sectionBlocks.length} blocks, ${sectionWordCount} words)`);
        
      } catch (error) {
        console.error(`[Edge] Section ${i + 1} failed:`, error);
        throw error;
      }
      
      if (i < plan.sections.length - 1) {
        allBlocks.push({ type: 'divider', content: '', order: currentOrder++ });
      }
    }
    
    // PHASE 3: Practice
    console.log('[Edge] Phase 3: Practice...');
    const practiceResponse = await fetchWithTimeout(
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
            { role: 'system', content: 'Create comprehensive practice content.' },
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
    
    let practice: any = {
      practiceExercises: [],
      reviewQuestions: [],
      keyTakeaways: []
    };
    
    if (practiceResponse.ok) {
      const practiceData = await practiceResponse.json();
      practice = JSON.parse(practiceData.choices[0].message.content || '{}');
    }
    
    const outline = {
      title,
      summary: plan.summary || '',
      blocks: allBlocks,
      practiceExercises: practice.practiceExercises || [],
      reviewQuestions: practice.reviewQuestions || [],
      keyTakeaways: practice.keyTakeaways || []
    };
    
    const wordCount = countWordsInBlocks(allBlocks);
    console.log(`[Edge] Complete! ${allBlocks.length} blocks, ${wordCount} words (input: ${inputWordCount} words)`);
    console.log(`[Edge] Compression ratio: ${((wordCount / inputWordCount) * 100).toFixed(1)}%`);
    
    await supabase
      .from('lessons')
      .update({
        title,
        outline,
        summary: plan.summary || '',
        word_count: wordCount,
        status: 'ready'
      })
      .eq('id', lessonId);
    
    return new Response(
      JSON.stringify({ success: true, lessonId }),
      { status: 200 }
    );
    
  } catch (error: any) {
    console.error('[Edge] Error:', error);
    console.error('[Edge] Stack:', error instanceof Error ? error.stack : 'No stack');
    
    try {
      const body = await req.clone().json();
      if (body.lessonId) {
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
        await supabase.from('lessons').update({ status: 'error' }).eq('id', body.lessonId);
      }
    } catch (e) {}
    
    return new Response(
      JSON.stringify({
        error: 'Failed',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500 }
    );
  }
});



