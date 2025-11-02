/**
 * Predefined section formats for lesson generation
 * These formats guide the AI to create varied, engaging lesson structures
 */

export interface SectionFormat {
  id: string;
  name: string;
  description: string;
  whenToUse: string;
  blockTemplate: string[];
  promptTemplate: string;
}

export const SECTION_FORMATS: SectionFormat[] = [
  {
    id: 'concept-intro',
    name: 'Concept Introduction',
    description: 'Introduces new concepts with definitions and key terms',
    whenToUse: 'Use for foundational concepts, new terminology, or core principles that need clear definition',
    blockTemplate: ['heading3', 'paragraph', 'callout-definition', 'paragraph', 'callout-question'],
    promptTemplate: `Create a concept introduction section with this structure:

1. Heading (with relevant emoji)
2. Opening paragraph (2-3 sentences introducing the concept)
3. Definition callout (key term + clear definition)
4. Explanation paragraph (2-3 sentences elaborating)
5. "Think About It" question callout (engaging question for reflection)

Keep paragraphs SHORT (2-3 sentences max). Use clear, precise language.

Return JSON with this exact structure:
{
  "heading": "🔍 [Section Title]",
  "introParagraph": "2-3 sentence introduction...",
  "definition": {
    "term": "Key Term",
    "definition": "Clear definition..."
  },
  "explanationParagraph": "2-3 sentence explanation...",
  "thinkAbout": "Thought-provoking question?"
}`
  },
  
  {
    id: 'worked-example',
    name: 'Worked Example',
    description: 'Step-by-step problem solving with detailed calculations',
    whenToUse: 'Use for mathematical problems, calculations, or any content requiring step-by-step solutions',
    blockTemplate: ['heading3', 'paragraph', 'callout-example', 'bullet-steps', 'paragraph'],
    promptTemplate: `Create a worked example section with this structure:

1. Heading (with relevant emoji)
2. Context paragraph (1-2 sentences setting up the problem)
3. Problem callout (the question or problem statement)
4. Solution steps as bullets (each step: label + work shown)
5. Answer paragraph (final result with units)

IMPORTANT: Show actual calculations, not just descriptions. Be specific with numbers.

Return JSON:
{
  "heading": "📐 [Section Title]",
  "contextParagraph": "Brief context...",
  "problem": "The problem or question...",
  "steps": [
    { "label": "Step 1: [Action]", "work": "Calculation shown with numbers" },
    { "label": "Step 2: [Action]", "work": "Calculation shown with numbers" }
  ],
  "answerParagraph": "Final answer with units and brief conclusion..."
}`
  },
  
  {
    id: 'list-comparison',
    name: 'List or Comparison',
    description: 'Organized lists or side-by-side comparisons',
    whenToUse: 'Use for categorizing items, listing key points, or comparing different options/concepts',
    blockTemplate: ['heading3', 'paragraph', 'bullets', 'paragraph'],
    promptTemplate: `Create a list/comparison section with this structure:

1. Heading (with relevant emoji)
2. Introduction paragraph (1-2 sentences explaining what's being listed/compared)
3. Bullet points (3-6 concise items, each 1 sentence)
4. Summary paragraph (1-2 sentences wrapping up the significance)

Keep each bullet SHORT and focused on ONE point.

Return JSON:
{
  "heading": "📋 [Section Title]",
  "introParagraph": "Brief introduction...",
  "bulletPoints": [
    "First key point...",
    "Second key point...",
    "Third key point..."
  ],
  "summaryParagraph": "Brief summary..."
}`
  },
  
  {
    id: 'formula-equation',
    name: 'Formula/Equation',
    description: 'Mathematical formulas with variable explanations',
    whenToUse: 'Use for presenting equations, mathematical relationships, or formulas that need explanation',
    blockTemplate: ['heading3', 'paragraph', 'callout-formula', 'bullets', 'paragraph'],
    promptTemplate: `Create a formula/equation section with this structure:

1. Heading (with relevant emoji)
2. Context paragraph (2 sentences explaining what the formula represents)
3. Formula callout (the actual equation/formula)
4. Variable bullets (each variable explained: "x = description")
5. Application paragraph (1-2 sentences on when/how to use it)

Present formulas clearly. Define ALL variables.

Return JSON:
{
  "heading": "🧮 [Section Title]",
  "contextParagraph": "What this formula represents...",
  "formula": "Mathematical formula (use proper notation)",
  "variables": [
    "A = area in square meters",
    "r = radius in meters"
  ],
  "applicationParagraph": "When and how to use this..."
}`
  },
  
  {
    id: 'visual-conceptual',
    name: 'Visual/Conceptual Explanation',
    description: 'Describes visual concepts, processes, or relationships',
    whenToUse: 'Use for spatial relationships, processes, or concepts that benefit from visual description',
    blockTemplate: ['heading3', 'paragraph', 'bullets', 'callout-tip', 'paragraph'],
    promptTemplate: `Create a visual/conceptual section with this structure:

1. Heading (with relevant emoji)
2. Overview paragraph (2-3 sentences describing the concept)
3. Key points as bullets (3-5 important aspects)
4. Tip callout (helpful note or common misconception)
5. Connection paragraph (1-2 sentences linking to broader context)

Use descriptive, clear language. Help readers visualize the concept.

Return JSON:
{
  "heading": "🎯 [Section Title]",
  "overviewParagraph": "Description of the concept...",
  "keyPoints": [
    "First key aspect...",
    "Second key aspect..."
  ],
  "tip": "Helpful tip...",
  "connectionParagraph": "How this connects to bigger picture..."
}`
  },
  
  {
    id: 'application-practice',
    name: 'Application & Practice',
    description: 'Critical thinking questions and application scenarios',
    whenToUse: 'Use for applying concepts, critical thinking, or practice scenarios',
    blockTemplate: ['heading3', 'callout-question', 'paragraph', 'bullets', 'paragraph'],
    promptTemplate: `Create an application/practice section with this structure:

1. Heading (with relevant emoji)
2. Main question callout (thought-provoking or application question)
3. Guidance paragraph (2 sentences on how to approach it)
4. Consideration bullets (3-4 points to think about)

Encourage active thinking. Make it practical.

Return JSON:
{
  "heading": "💡 [Section Title]",
  "mainQuestion": "Engaging question or scenario...",
  "guidanceParagraph": "How to approach this...",
  "considerationPoints": [
    "First thing to consider...",
    "Second thing to consider..."
  ]
}`
  }
];

/**
 * Get format by ID
 */
export function getFormatById(id: string): SectionFormat | undefined {
  return SECTION_FORMATS.find(f => f.id === id);
}

/**
 * Get formats description for AI planning phase
 */
export function getFormatsForPlanning(): string {
  return SECTION_FORMATS.map(f => 
    `- ${f.id}: ${f.name} - ${f.whenToUse}`
  ).join('\n');
}



