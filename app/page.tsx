'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Send, Menu, Plus, User as UserIcon, MessageSquare, Settings } from 'lucide-react';
import { PlanetLogo } from '@/components/PlanetLogo';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI } from '@google/genai';
import { CodeBlock } from '@/app/components/CodeBlock';
import Link from 'next/link';

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '' });

export default function ChrisChat() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [messages, setMessages] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/landing');
      } else {
        setUser(currentUser);
        if (messages.length === 0) {
          setMessages([{ role: 'model', text: 'Hello! I am Chris. How can I help you today?' }]);
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    try {
      setMessages(prev => [...prev, { role: 'model', text: '' }]);

      const response = await ai.models.generateContentStream({
        model: 'gemini-3.1-flash-preview',
        contents: userText,
      });

      let fullText = '';
      for await (const chunk of response) {
        fullText += chunk.text;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text = fullText;
          return newMessages;
        });
      }
    } catch (error) {
      console.error("Gemini API Error:", error);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].text = "I'm sorry, I encountered an error processing your request. Please check your API key.";
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-[#050505] text-black dark:text-white">
        <PlanetLogo className="w-8 h-8 animate-pulse" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-[100dvh] w-full bg-white dark:bg-[#050505] text-black dark:text-white font-sans overflow-hidden">
      
      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-40 w-72 h-full bg-neutral-50 dark:bg-[#111] border-r border-black/10 dark:border-white/10 transition-transform duration-300 flex flex-col`}>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <PlanetLogo className="w-6 h-6" />
            ChrisAi
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg">
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <div className="px-3 pb-4">
          <button onClick={() => setMessages([{ role: 'model', text: 'Hello! I am Chris. How can I help you today?' }])} className="w-full flex items-center gap-3 px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium hover:opacity-90 transition-opacity">
            <Plus className="w-5 h-5" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto premium-scrollbar px-3 py-2 space-y-1">
          <div className="text-xs font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider px-3 mb-2">Recent</div>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-left transition-colors">
            <MessageSquare className="w-4 h-4 opacity-70" />
            <span className="text-sm truncate">Current Conversation</span>
          </button>
        </div>

        <div className="p-4 border-t border-black/10 dark:border-white/10">
          <Link href="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <div className="w-8 h-8 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user.displayName || 'User'}</div>
              <div className="text-xs text-black/50 dark:text-white/50 truncate">{user.email}</div>
            </div>
            <Settings className="w-4 h-4 opacity-50" />
          </Link>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-black/5 dark:border-white/5 bg-white/80 dark:bg-[#050505]/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 -ml-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg">
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-semibold md:hidden">ChrisAi</span>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto premium-scrollbar p-4 md:p-8">
          <div className="max-w-3xl mx-auto space-y-8 pb-20">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-black dark:bg-white text-white dark:text-black'}`}>
                  {msg.role === 'user' ? <UserIcon className="w-5 h-5" /> : <PlanetLogo className="w-5 h-5" />}
                </div>
                <div className={`flex-1 max-w-[85%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block text-left ${msg.role === 'user' ? 'bg-black/5 dark:bg-white/10 px-4 py-2.5 rounded-2xl rounded-tr-sm' : 'prose prose-invert max-w-none text-[15px] leading-relaxed'}`}>
                    {msg.role === 'user' ? (
                      msg.text
                    ) : (
                      msg.text === '' ? (
                        <div className="flex gap-1 items-center h-6">
                          <div className="w-1.5 h-1.5 bg-black/50 dark:bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 bg-black/50 dark:bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 bg-black/50 dark:bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      ) : (
                        <ReactMarkdown
                          components={{
                            code({node, inline, className, children, ...props}: any) {
                              const match = /language-(\w+)/.exec(className || '')
                              return !inline && match ? (
                                <CodeBlock className={className} {...props}>
                                  {children}
                                </CodeBlock>
                              ) : (
                                <code className="bg-black/10 dark:bg-white/10 rounded px-1.5 py-0.5 text-sm font-mono" {...props}>
                                  {children}
                                </code>
                              )
                            }
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-gradient-to-t from-white via-white to-transparent dark:from-[#050505] dark:via-[#050505] absolute bottom-0 left-0 right-0">
          <div className="max-w-3xl mx-auto relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Chris anything..."
              className="w-full bg-neutral-100 dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 rounded-2xl pl-4 pr-12 py-4 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 resize-none premium-scrollbar"
              rows={1}
              style={{ minHeight: '56px', maxHeight: '200px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 bottom-2 p-2 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-80 disabled:opacity-50 disabled:hover:opacity-50 transition-opacity"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="text-center mt-2 text-xs text-black/40 dark:text-white/40">
            Chris can make mistakes. Consider verifying important information.
          </div>
        </div>
      </div>
    </div>
  );
}
