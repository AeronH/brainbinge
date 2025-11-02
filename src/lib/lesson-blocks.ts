/**
 * TypeScript types for block-based lesson structure
 */

export type CalloutType = 'example' | 'tip' | 'question' | 'definition' | 'warning' | 'formula';

export interface LessonBlock {
  type: 'heading1' | 'heading2' | 'heading3' | 'paragraph' | 'bullet' | 'numbered' | 'callout' | 'divider';
  content: string;
  order: number;
  calloutType?: CalloutType; // Only for callout blocks
}

export interface BlockBasedOutline {
  title: string;
  summary: string;
  blocks: LessonBlock[];
  practiceExercises: Array<{
    question: string;
    hint: string;
  }>;
  reviewQuestions: string[];
  keyTakeaways: string[];
}

/**
 * Helper to create a block
 */
export function createBlock(
  type: LessonBlock['type'],
  content: string,
  order: number,
  calloutType?: CalloutType
): LessonBlock {
  const block: LessonBlock = { type, content, order };
  if (calloutType) {
    block.calloutType = calloutType;
  }
  return block;
}



