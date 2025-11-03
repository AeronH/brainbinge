import { describe, it, expect } from 'vitest'
import { 
  createBlock, 
  extractContentFromBlocks,
  type LessonBlock,
  type CalloutType 
} from '@/lib/lesson-blocks'

describe('lesson-blocks', () => {
  describe('createBlock', () => {
    it('should create a basic block without calloutType', () => {
      const block = createBlock('paragraph', 'Test content', 0)
      
      expect(block).toEqual({
        type: 'paragraph',
        content: 'Test content',
        order: 0,
      })
    })

    it('should create a heading1 block', () => {
      const block = createBlock('heading1', 'Main Title', 1)
      
      expect(block.type).toBe('heading1')
      expect(block.content).toBe('Main Title')
      expect(block.order).toBe(1)
      expect(block.calloutType).toBeUndefined()
    })

    it('should create a heading2 block', () => {
      const block = createBlock('heading2', 'Section Title', 2)
      
      expect(block.type).toBe('heading2')
      expect(block.content).toBe('Section Title')
      expect(block.order).toBe(2)
    })

    it('should create a heading3 block', () => {
      const block = createBlock('heading3', 'Subsection', 3)
      
      expect(block.type).toBe('heading3')
      expect(block.content).toBe('Subsection')
    })

    it('should create a callout block with calloutType', () => {
      const block = createBlock('callout', 'Important note', 5, 'warning')
      
      expect(block).toEqual({
        type: 'callout',
        content: 'Important note',
        order: 5,
        calloutType: 'warning',
      })
    })

    it('should create callout blocks with all valid calloutTypes', () => {
      const calloutTypes: CalloutType[] = ['example', 'tip', 'question', 'definition', 'warning', 'formula']
      
      calloutTypes.forEach((calloutType, index) => {
        const block = createBlock('callout', `${calloutType} content`, index, calloutType)
        
        expect(block.type).toBe('callout')
        expect(block.calloutType).toBe(calloutType)
        expect(block.content).toBe(`${calloutType} content`)
      })
    })

    it('should create bullet blocks', () => {
      const block = createBlock('bullet', 'Bullet point', 10)
      
      expect(block.type).toBe('bullet')
      expect(block.content).toBe('Bullet point')
    })

    it('should create numbered blocks', () => {
      const block = createBlock('numbered', 'Step one', 15)
      
      expect(block.type).toBe('numbered')
      expect(block.content).toBe('Step one')
    })

    it('should create divider blocks', () => {
      const block = createBlock('divider', '', 20)
      
      expect(block.type).toBe('divider')
      expect(block.content).toBe('')
    })

    it('should handle empty content', () => {
      const block = createBlock('paragraph', '', 0)
      
      expect(block.content).toBe('')
    })

    it('should handle large order numbers', () => {
      const block = createBlock('paragraph', 'Content', 99999)
      
      expect(block.order).toBe(99999)
    })

    it('should handle negative order numbers', () => {
      const block = createBlock('paragraph', 'Content', -1)
      
      expect(block.order).toBe(-1)
    })
  })

  describe('extractContentFromBlocks', () => {
    it('should extract content from a single paragraph block', () => {
      const blocks: LessonBlock[] = [
        { type: 'paragraph', content: 'This is a paragraph.', order: 0 }
      ]
      
      const result = extractContentFromBlocks(blocks)
      
      expect(result).toBe('This is a paragraph.')
    })

    it('should extract content from multiple paragraph blocks with proper spacing', () => {
      const blocks: LessonBlock[] = [
        { type: 'paragraph', content: 'First paragraph.', order: 0 },
        { type: 'paragraph', content: 'Second paragraph.', order: 1 },
      ]
      
      const result = extractContentFromBlocks(blocks)
      
      expect(result).toBe('First paragraph.\n\nSecond paragraph.')
    })

    it('should extract heading content with proper spacing', () => {
      const blocks: LessonBlock[] = [
        { type: 'heading1', content: 'Main Title', order: 0 },
        { type: 'paragraph', content: 'Content follows.', order: 1 },
      ]
      
      const result = extractContentFromBlocks(blocks)
      
      expect(result).toBe('Main Title\n\nContent follows.')
    })

    it('should handle all heading levels consistently', () => {
      const blocks: LessonBlock[] = [
        { type: 'heading1', content: 'H1', order: 0 },
        { type: 'heading2', content: 'H2', order: 1 },
        { type: 'heading3', content: 'H3', order: 2 },
      ]
      
      const result = extractContentFromBlocks(blocks)
      
      expect(result).toBe('H1\n\nH2\n\nH3')
    })

    it('should extract bullet points with proper formatting', () => {
      const blocks: LessonBlock[] = [
        { type: 'bullet', content: 'First item', order: 0 },
        { type: 'bullet', content: 'Second item', order: 1 },
        { type: 'bullet', content: 'Third item', order: 2 },
      ]
      
      const result = extractContentFromBlocks(blocks)
      
      expect(result).toBe('- First item\n- Second item\n- Third item')
    })

    it('should extract numbered list items', () => {
      const blocks: LessonBlock[] = [
        { type: 'numbered', content: 'Step one', order: 0 },
        { type: 'numbered', content: 'Step two', order: 1 },
      ]
      
      const result = extractContentFromBlocks(blocks)
      
      expect(result).toBe('Step one\nStep two')
    })

    it('should extract callout content', () => {
      const blocks: LessonBlock[] = [
        { type: 'callout', content: 'Important note', order: 0, calloutType: 'warning' }
      ]
      
      const result = extractContentFromBlocks(blocks)
      
      expect(result).toBe('Important note')
    })

    it('should handle callouts with different types', () => {
      const blocks: LessonBlock[] = [
        { type: 'callout', content: 'Example content', order: 0, calloutType: 'example' },
        { type: 'callout', content: 'Tip content', order: 1, calloutType: 'tip' },
        { type: 'callout', content: 'Definition content', order: 2, calloutType: 'definition' },
      ]
      
      const result = extractContentFromBlocks(blocks)
      
      expect(result).toBe('Example content\n\nTip content\n\nDefinition content')
    })

    it('should handle dividers properly', () => {
      const blocks: LessonBlock[] = [
        { type: 'paragraph', content: 'Before divider', order: 0 },
        { type: 'divider', content: '', order: 1 },
        { type: 'paragraph', content: 'After divider', order: 2 },
      ]
      
      const result = extractContentFromBlocks(blocks)
      
      expect(result).toBe('Before divider\n\n\n---\n\nAfter divider')
    })

    it('should strip markdown bold formatting', () => {
      const blocks: LessonBlock[] = [
        { type: 'paragraph', content: 'This is **bold text** here.', order: 0 }
      ]
      
      const result = extractContentFromBlocks(blocks)
      
      expect(result).toBe('This is bold text here.')
    })

    it('should strip multiple bold markers in one block', () => {
      const blocks: LessonBlock[] = [
        { type: 'paragraph', content: '**First** bold and **second** bold.', order: 0 }
      ]
      
      const result = extractContentFromBlocks(blocks)
      
      expect(result).toBe('First bold and second bold.')
    })

    it('should handle mixed content types', () => {
      const blocks: LessonBlock[] = [
        { type: 'heading1', content: 'Main Topic', order: 0 },
        { type: 'paragraph', content: 'Introduction **text**.', order: 1 },
        { type: 'heading2', content: 'Subtopic', order: 2 },
        { type: 'bullet', content: 'Point one', order: 3 },
        { type: 'bullet', content: 'Point two', order: 4 },
        { type: 'callout', content: 'Note this', order: 5, calloutType: 'tip' },
        { type: 'divider', content: '', order: 6 },
        { type: 'numbered', content: 'First step', order: 7 },
      ]
      
      const result = extractContentFromBlocks(blocks)
      
      expect(result).toContain('Main Topic')
      expect(result).toContain('Introduction text.')
      expect(result).toContain('Subtopic')
      expect(result).toContain('- Point one')
      expect(result).toContain('- Point two')
      expect(result).toContain('Note this')
      expect(result).toContain('---')
      expect(result).toContain('First step')
    })

    it('should handle empty blocks array', () => {
      const result = extractContentFromBlocks([])
      
      expect(result).toBe('')
    })

    it('should handle blocks with empty content', () => {
      const blocks: LessonBlock[] = [
        { type: 'paragraph', content: '', order: 0 },
        { type: 'paragraph', content: 'Non-empty', order: 1 },
      ]
      
      const result = extractContentFromBlocks(blocks)
      
      expect(result).toBe('Non-empty')
    })

    it('should preserve special characters', () => {
      const blocks: LessonBlock[] = [
        { type: 'paragraph', content: 'Special chars: @#$%^&*()', order: 0 }
      ]
      
      const result = extractContentFromBlocks(blocks)
      
      expect(result).toBe('Special chars: @#$%^&*()')
    })

    it('should handle unicode characters', () => {
      const blocks: LessonBlock[] = [
        { type: 'paragraph', content: 'Unicode: 你好 мир 🌍', order: 0 }
      ]
      
      const result = extractContentFromBlocks(blocks)
      
      expect(result).toBe('Unicode: 你好 мир 🌍')
    })

    it('should handle very long content', () => {
      const longContent = 'a'.repeat(10000)
      const blocks: LessonBlock[] = [
        { type: 'paragraph', content: longContent, order: 0 }
      ]
      
      const result = extractContentFromBlocks(blocks)
      
      expect(result).toBe(longContent)
      expect(result.length).toBe(10000)
    })

    it('should handle nested markdown that should be stripped', () => {
      const blocks: LessonBlock[] = [
        { type: 'paragraph', content: '**Bold with **nested** bold**', order: 0 }
      ]
      
      const result = extractContentFromBlocks(blocks)
      
      expect(result).not.toContain('**')
    })

    it('should maintain newlines within content when appropriate', () => {
      const blocks: LessonBlock[] = [
        { type: 'paragraph', content: 'Line one', order: 0 },
        { type: 'bullet', content: 'Item', order: 1 },
        { type: 'paragraph', content: 'Line two', order: 2 },
      ]
      
      const result = extractContentFromBlocks(blocks)
      
      expect(result).toContain('\n')
    })

    it('should handle blocks out of order based on order property', () => {
      // The function processes blocks in the order they appear in the array
      const blocks: LessonBlock[] = [
        { type: 'paragraph', content: 'Third', order: 2 },
        { type: 'paragraph', content: 'First', order: 0 },
        { type: 'paragraph', content: 'Second', order: 1 },
      ]
      
      const result = extractContentFromBlocks(blocks)
      
      // Should process in array order, not order property
      expect(result).toBe('Third\n\nFirst\n\nSecond')
    })

    it('should handle complex real-world scenario', () => {
      const blocks: LessonBlock[] = [
        { type: 'heading1', content: '📚 Introduction to Machine Learning', order: 0 },
        { type: 'paragraph', content: '**Machine learning** is a subset of artificial intelligence.', order: 1 },
        { type: 'heading2', content: 'Key Concepts', order: 2 },
        { type: 'bullet', content: 'Supervised Learning', order: 3 },
        { type: 'bullet', content: 'Unsupervised Learning', order: 4 },
        { type: 'bullet', content: 'Reinforcement Learning', order: 5 },
        { type: 'callout', content: 'Always validate your model!', order: 6, calloutType: 'tip' },
        { type: 'divider', content: '', order: 7 },
        { type: 'heading2', content: 'Getting Started', order: 8 },
        { type: 'numbered', content: 'Install required libraries', order: 9 },
        { type: 'numbered', content: 'Prepare your dataset', order: 10 },
        { type: 'numbered', content: 'Train your model', order: 11 },
      ]
      
      const result = extractContentFromBlocks(blocks)
      
      expect(result).toContain('Introduction to Machine Learning')
      expect(result).toContain('Machine learning is a subset')
      expect(result).not.toContain('**')
      expect(result).toContain('- Supervised Learning')
      expect(result).toContain('Always validate your model!')
      expect(result).toContain('---')
      expect(result).toContain('Train your model')
    })
  })
})