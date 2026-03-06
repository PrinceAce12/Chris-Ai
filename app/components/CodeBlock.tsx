import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export const CodeBlock = ({ className, children, node, ref, ...rest }: any) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  
  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (match) {
    const language = match[1];
    return (
      <div className="relative my-6 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-[#0d0d0d]">
        <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
          <span className="text-xs font-mono text-white/50">{language}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/10 text-white/50 hover:text-white text-xs font-medium transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? <span className="text-green-400">Copied</span> : 'Copy'}
          </button>
        </div>
        <SyntaxHighlighter
          {...rest}
          PreTag="div"
          language={language}
          style={vscDarkPlus}
          customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
          className="text-[13px] sm:text-sm"
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    );
  }

  return (
    <code {...rest} className={`${className || ''} bg-black/5 dark:bg-white/10 text-black/90 dark:text-white/90 rounded-md px-1.5 py-0.5 font-mono text-[13px]`}>
      {children}
    </code>
  );
};
