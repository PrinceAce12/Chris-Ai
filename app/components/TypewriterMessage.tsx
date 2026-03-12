'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
const CodeBlock = dynamic(() => import('./CodeBlock').then(mod => mod.CodeBlock), { ssr: false });

export function TypewriterMessage({ text, onComplete }: { text: string, onComplete?: () => void }) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 5); // Adjust speed here
      return () => clearTimeout(timeout);
    } else {
      onComplete?.();
    }
  }, [currentIndex, text, onComplete]);

  return (
    <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-pre:border-0 text-[14px] sm:text-[15px] tracking-wide">
      {displayedText}
    </div>
  );
}
