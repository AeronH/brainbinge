import React from 'react';
import type { LessonBlock } from '@/lib/lesson-blocks';

interface BlockRendererProps {
  blocks: LessonBlock[];
}

// Helper to render text with **bold** markdown formatting
function renderTextWithBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return <strong key={i} className="font-bold text-foreground">{boldText}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

export default function BlockRenderer({ blocks }: BlockRendererProps) {
  let numberedCounter = 0;
  
  return (
    <div className="space-y-5">
      {blocks.map((block, idx) => {
        // Reset counter when we hit a non-numbered block
        if (block.type !== 'numbered') {
          numberedCounter = 0;
        }
        
        switch (block.type) {
          case 'heading1':
            return (
              <h1 key={idx} className="text-4xl font-extrabold text-foreground mt-10 mb-6 tracking-tight">
                {block.content}
              </h1>
            );
          
          case 'heading2':
            return (
              <h2 key={idx} className="text-3xl font-bold text-foreground mt-10 mb-5 flex items-center gap-3">
                <span className="w-2 h-10 bg-primary rounded-full" />
                <span className="tracking-tight">{block.content}</span>
              </h2>
            );
          
          case 'heading3':
            return (
              <h3 key={idx} className="text-xl font-bold text-foreground mt-8 mb-4 ml-2 tracking-tight">
                {block.content}
              </h3>
            );
          
          case 'paragraph':
            return (
              <p key={idx} className="text-sm text-foreground/90 leading-relaxed ml-4">
                {renderTextWithBold(block.content)}
              </p>
            );
          
          case 'bullet':
            return (
              <div key={idx} className="flex items-start gap-4 ml-12">
                <span className="w-2 h-2 rounded-full bg-foreground mt-2 flex-shrink-0" />
                <p className="text-sm text-foreground/90 leading-relaxed flex-1">
                  {renderTextWithBold(block.content)}
                </p>
              </div>
            );
          
          case 'numbered':
            numberedCounter++;
            return (
              <div key={idx} className="flex items-start gap-4 ml-12">
                <span className="text-sm font-bold text-foreground mt-0.5 flex-shrink-0 min-w-[2rem]">
                  {numberedCounter}.
                </span>
                <p className="text-sm text-foreground/90 leading-relaxed flex-1">
                  {renderTextWithBold(block.content)}
                </p>
              </div>
            );
          
          case 'callout':
            return (
              <div 
                key={idx} 
                className={`ml-4 p-4 rounded-lg border-l-4 ${getCalloutStyles(block.calloutType)}`}
              >
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {renderTextWithBold(block.content)}
                </p>
              </div>
            );
          
          case 'divider':
            return (
              <hr key={idx} className="border-t border-border/50 my-10" />
            );
          
          default:
            return null;
        }
      })}
    </div>
  );
}

function getCalloutStyles(calloutType?: string): string {
  switch (calloutType) {
    case 'example':
      return 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-400 dark:border-blue-700';
    case 'tip':
      return 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-700';
    case 'question':
      return 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-400 dark:border-amber-700';
    case 'definition':
      return 'bg-purple-50/40 dark:bg-purple-950/20 border-purple-400 dark:border-purple-700';
    case 'warning':
      return 'bg-red-50/40 dark:bg-red-950/20 border-red-400 dark:border-red-700';
    case 'formula':
      return 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-400 dark:border-indigo-700';
    default:
      return 'bg-muted/40 border-muted-foreground/30';
  }
}

