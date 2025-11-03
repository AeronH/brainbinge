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

/**
 * Extract plain text content from blocks array for quiz generation
 */
export function extractContentFromBlocks(blocks: LessonBlock[]): string {
  const parts: string[] = [];

  blocks.forEach((block) => {
    // Strip markdown formatting (**text** -> text)
    const cleanContent = block.content.replace(/\*\*(.+?)\*\*/g, '$1');

    switch (block.type) {
      case 'heading1':
      case 'heading2':
      case 'heading3':
        parts.push(cleanContent);
        parts.push('\n\n');
        break;

      case 'paragraph':
        parts.push(cleanContent);
        parts.push('\n\n');
        break;

      case 'bullet':
        parts.push('- ');
        parts.push(cleanContent);
        parts.push('\n');
        break;

      case 'numbered':
        // Number will be determined by order, just add content
        parts.push(cleanContent);
        parts.push('\n');
        break;

      case 'callout':
        parts.push(cleanContent);
        parts.push('\n\n');
        break;

      case 'divider':
        parts.push('\n---\n\n');
        break;

      default:
        // For any unknown types, just add the content
        parts.push(cleanContent);
        parts.push('\n');
    }
  });

  return parts.join('').trim();
}



