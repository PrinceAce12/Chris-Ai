import React, { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';

export function TypewriterMessage({ text, onComplete }: { text: string, onComplete?: () => void }) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 10); // Adjust speed here
      return () => clearTimeout(timeout);
    } else {
      onComplete?.();
    }
  }, [currentIndex, text, onComplete]);

  return (
    <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-pre:border-0 text-[14px] sm:text-[15px] tracking-wide">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: CodeBlock,
          p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6 text-black dark:text-white">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold mb-4 mt-6 text-black dark:text-white">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-bold mb-3 mt-5 text-black dark:text-white">{children}</h3>,
          blockquote: ({ children }) => <blockquote className="border-l-4 border-black/20 dark:border-white/20 pl-4 italic text-black/70 dark:text-white/70 my-4">{children}</blockquote>,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 underline underline-offset-2 decoration-blue-400/30 hover:decoration-blue-400 transition-colors">{children}</a>,
          table: ({ children }) => <div className="overflow-x-auto my-6"><table className="w-full text-left border-collapse">{children}</table></div>,
          th: ({ children }) => <th className="border-b border-black/10 dark:border-white/10 px-4 py-3 font-medium text-black/90 dark:text-white/90 bg-black/5 dark:bg-white/5">{children}</th>,
          td: ({ children }) => <td className="border-b border-black/5 dark:border-white/5 px-4 py-3 text-black/70 dark:text-white/70">{children}</td>,
        }}
      >
        {displayedText}
      </Markdown>
    </div>
  );
}
