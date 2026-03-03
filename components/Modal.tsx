'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function Modal({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  function onDismiss() {
    router.back();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div 
        className="absolute inset-0" 
        onClick={onDismiss}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-[#111111] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
        <button
          onClick={onDismiss}
          className="absolute right-4 top-4 rounded-full p-2 text-black/50 hover:bg-black/5 hover:text-black dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

