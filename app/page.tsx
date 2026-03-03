'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Menu,
  Plus,
  Search,
  BrainCircuit,
  Paperclip,
  Mic,
  ArrowUp,
  Sparkles,
  X,
  FileText,
  Image as ImageIcon,
  Globe,
  Settings,
  MessageSquare,
  Sun,
  Moon,
  Check,
  Copy,
  Folder,
  Bell,
  Clock,
  ChevronsLeft,
  LogOut,
  User as UserIcon,
  ChevronRight,
  Trash2,
  Download,
  ChevronDown,
  RefreshCw,
  Volume2,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  AudioLines,
  Share,
  Edit,
  MapPin
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { createClient } from '@/utils/supabase/client';

// --- Types ---
type Role = 'user' | 'ai';

interface FileAttachment {
  base64: string;
  mimeType: string;
  name: string;
}

interface Message {
  id: string;
  role: Role;
  text: string;
  isThinking?: boolean;
  groundingChunks?: any[];
  file?: FileAttachment;
  isError?: boolean;
}

interface Toast {
  id: string;
  message: string;
  type: 'error' | 'warning';
}

import { PlanetLogo } from '@/components/PlanetLogo';

// --- Components ---
const CodeBlock = ({ className, children, node, ref, ...rest }: any) => {
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
      <div className="relative my-6 rounded-xl overflow-hidden border border-white/10 bg-[#0d0d0d]">
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
    <code {...rest} className={`${className || ''} bg-white/10 text-white/90 rounded-md px-1.5 py-0.5 font-mono text-[13px]`}>
      {children}
    </code>
  );
};

// --- Simple Memory Cache for AI Responses ---
const aiResponseCache = new Map<string, any>();

// --- Main Component ---
export default function ChrisAI() {
  const router = useRouter();
  const supabase = createClient();
  const [session, setSession] = useState<any>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setStatus(session ? "authenticated" : "unauthenticated");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setStatus(session ? "authenticated" : "unauthenticated");
    });

    return () => subscription.unsubscribe();
  }, []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isThinkMode, setIsThinkMode] = useState(false);
  const [isDeepSearchMode, setIsDeepSearchMode] = useState(false);
  const [isImagineMode, setIsImagineMode] = useState(false);
  const [isMapsMode, setIsMapsMode] = useState(false);
  const [attachedFile, setAttachedFile] = useState<FileAttachment | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // --- Fetch Chat History ---
  useEffect(() => {
    if (status === "authenticated") {
      fetchChatHistory();
    }
  }, [status]);

  const fetchChatHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/chats");
      if (res.ok) {
        const data = await res.json();
        setChatHistory(data);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadChat = (chat: any) => {
    setCurrentChatId(chat.id);
    setMessages(chat.messages.map((m: any) => ({
      id: m.id,
      role: m.role,
      text: m.content,
      createdAt: m.createdAt
    })));
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const startNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  // --- Local Storage Caching for Messages (Fallback for non-logged in users) ---
  useEffect(() => {
    setIsClient(true);
    if (status === "unauthenticated") {
      const savedMessages = localStorage.getItem('chrisai_messages');
      if (savedMessages) {
        try {
          setMessages(JSON.parse(savedMessages));
        } catch (e) {
          console.error('Failed to parse cached messages', e);
        }
      }
    }
  }, [status]);

  useEffect(() => {
    if (!isClient || status === "authenticated") return;
    if (messages.length > 0) {
      localStorage.setItem('chrisai_messages', JSON.stringify(messages));
    } else {
      localStorage.removeItem('chrisai_messages');
    }
  }, [messages, isClient, status]);

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('chrisai_messages');
    setCurrentChatId(null);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const deleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this chat?")) return;
    
    try {
      const res = await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
      if (res.ok) {
        if (currentChatId === chatId) {
          setCurrentChatId(null);
          setMessages([]);
        }
        fetchChatHistory();
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

  const groupHistoryByDate = (history: any[]) => {
    const groups: { [key: string]: any[] } = {
      "Today": [],
      "Yesterday": [],
      "Previous 7 Days": [],
      "Older": []
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    history.forEach(chat => {
      const chatDate = new Date(chat.updatedAt);
      if (chatDate >= today) groups["Today"].push(chat);
      else if (chatDate >= yesterday) groups["Yesterday"].push(chat);
      else if (chatDate >= sevenDaysAgo) groups["Previous 7 Days"].push(chat);
      else groups["Older"].push(chat);
    });

    return groups;
  };

  // --- Responsive Sidebar ---
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Auto-scroll ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // --- Auto-resize Textarea ---
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '0px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
      textareaRef.current.style.overflowY = scrollHeight > 200 ? 'auto' : 'hidden';
    }
  }, [input]);

  // --- Toast System ---
  const addToast = (message: string, type: 'error' | 'warning') => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // --- Voice Dictation ---
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setInput((prev) => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          addToast('Microphone access denied. Please allow permissions.', 'warning');
          setIsListening(false);
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        addToast('Microphone access denied. Please allow permissions.', 'warning');
      }
    }
  };

  // --- File Upload ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = (event.target?.result as string).split(',')[1];
      setAttachedFile({
        base64: base64String,
        mimeType: file.type,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = () => setAttachedFile(null);

  // --- API Integration ---
  const getGenAI = () => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      addToast('API Key missing. Please configure GEMINI_API_KEY.', 'error');
      return null;
    }
    return new GoogleGenAI({ apiKey });
  };

  const handleError = (error: any) => {
    const msg = error?.message || '';
    if (msg.includes('413') || msg.toLowerCase().includes('payload too large')) {
      addToast('Payload Too Large: The request exceeds server size limits.', 'error');
    } else if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate limit')) {
      addToast('Rate Limit Exceeded: Too many requests. Please wait.', 'warning');
    } else if (msg.includes('400') || msg.toLowerCase().includes('invalid')) {
      addToast('Context Length Exceeded: Prompt is too long for model capacity.', 'error');
    } else if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
      addToast('Model Not Found: The selected AI model is currently unavailable.', 'error');
    } else {
      addToast('An unexpected error occurred. Please try again.', 'error');
    }
    console.error('API Error:', error); // Log the full error for debugging, but don't show it to the user
  };

  const enhancePrompt = async () => {
    if (!input.trim()) return;
    const ai = getGenAI();
    if (!ai) return;

    setIsGenerating(true);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Improve this prompt to be highly detailed and effective for an AI model. Only return the improved prompt, nothing else. Original prompt: "${input}"`
      });
      if (response.text) {
        setInput(response.text.trim());
      }
    } catch (error) {
      handleError(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !attachedFile) || isGenerating) return;

    const ai = getGenAI();
    if (!ai) return;

    const userText = input.trim();
    const currentFile = attachedFile;
    
    setInput('');
    setAttachedFile(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      file: currentFile || undefined
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setIsGenerating(true);

    try {
      // Build history for context
      const historyContents = messages.map(msg => {
        const parts: any[] = [];
        if (msg.file) {
          parts.push({
            inlineData: {
              data: msg.file.base64,
              mimeType: msg.file.mimeType
            }
          });
        }
        if (msg.text) {
          parts.push({ text: msg.text });
        }
        return {
          role: msg.role === 'user' ? 'user' : 'model',
          parts
        };
      });

      // Current message parts
      const currentParts: any[] = [];
      if (currentFile) {
        currentParts.push({
          inlineData: {
            data: currentFile.base64,
            mimeType: currentFile.mimeType
          }
        });
      }
      
      let finalPrompt = userText;
      if (finalPrompt) {
        currentParts.push({ text: finalPrompt });
      }

      const contents = [...historyContents, { role: 'user', parts: currentParts }];

      const config: any = {};
      if (isDeepSearchMode) {
        config.tools = config.tools || [];
        config.tools.push({ googleSearch: {} });
      }
      if (isMapsMode) {
        config.tools = config.tools || [];
        config.tools.push({ googleMaps: {} });
      }
      if (isThinkMode) {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      }

      const cacheKey = JSON.stringify({ contents, config, isImagineMode, isThinkMode, isMapsMode });
      let response;

      if (aiResponseCache.has(cacheKey)) {
        response = aiResponseCache.get(cacheKey);
        // Add a small delay to simulate network request for better UX
        await new Promise(resolve => setTimeout(resolve, 300));
      } else {
        if (isImagineMode) {
          // Use gemini-2.5-flash-image for image editing or generation
          const imagineParts: any[] = [];
          if (currentFile && currentFile.mimeType.startsWith('image/')) {
            imagineParts.push({
              inlineData: {
                data: currentFile.base64,
                mimeType: currentFile.mimeType
              }
            });
          }
          if (userText) {
            imagineParts.push({ text: userText });
          }

          response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: imagineParts }
          });
        } else {
          let modelName = 'gemini-3-flash-preview';
          if (isThinkMode) {
            modelName = 'gemini-3.1-pro-preview';
          } else if (isMapsMode) {
            modelName = 'gemini-2.5-flash';
          }
          
          response = await ai.models.generateContent({
            model: modelName,
            contents: contents as any,
            config
          });
        }
        aiResponseCache.set(cacheKey, response);
      }

      const candidate = response.candidates?.[0];
      const finishReason = candidate?.finishReason;

      if (finishReason === 'MAX_TOKENS') {
        addToast('Token Limit Reached: Response was truncated due to length restriction.', 'warning');
      } else if (finishReason === 'SAFETY') {
        addToast('Incomplete Generation: Response stopped due to safety constraints.', 'warning');
      }

      let aiMessage: Message;

      if (isImagineMode) {
        let imageUrl = '';
        if (candidate?.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData) {
              const base64EncodeString = part.inlineData.data;
              imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${base64EncodeString}`;
            }
          }
        }
        
        aiMessage = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          text: imageUrl ? 'Here is your image:' : (response.text || 'Failed to generate image.'),
          file: imageUrl ? { base64: imageUrl.split(',')[1], mimeType: 'image/png', name: 'generated.png' } : undefined,
        };
      } else {
        aiMessage = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          text: response.text || '',
          isThinking: isThinkMode,
          groundingChunks: candidate?.groundingMetadata?.groundingChunks
        };
      }

      setMessages((prev) => [...prev, aiMessage]);

      // --- Save to Database if Authenticated ---
      if (status === "authenticated") {
        if (!currentChatId) {
          // Create new chat
          const res = await fetch("/api/chats", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: userText.slice(0, 30) + (userText.length > 30 ? "..." : ""),
              messages: [
                { role: "user", text: userText },
                { role: "ai", text: response.text || "" }
              ]
            })
          });
          if (res.ok) {
            const newChat = await res.json();
            setCurrentChatId(newChat.id);
            fetchChatHistory();
          }
        } else {
          // Add messages to existing chat
          await fetch(`/api/chats/${currentChatId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "user", content: userText })
          });
          await fetch(`/api/chats/${currentChatId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "ai", content: response.text || "" })
          });
        }
      }

    } catch (error) {
      handleError(error);
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'ai', text: 'Failed to generate response.', isError: true }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const suggestionPrompts = [
    "Explain quantum computing to a 5-year-old",
    "Write a Python script to scrape a website",
    "What are the best practices for React performance?",
    "Summarize the plot of Dune in 3 sentences"
  ];

  const renderToasts = () => (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 pointer-events-auto transition-all duration-300 animate-in fade-in slide-in-from-top-4
            ${toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-200' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-200'}`}
        >
          <div className="text-sm font-medium tracking-tight">{toast.message}</div>
        </div>
      ))}
    </div>
  );

  if (messages.length === 0) {
    return (
      <div className="flex flex-col h-[100dvh] w-full bg-[#050505] text-white font-sans overflow-hidden relative selection:bg-white/20">
        {renderToasts()}
        
        {/* Top Nav */}
        <header className="relative z-20 flex items-center justify-between p-4 md:p-6">
          <div className="flex items-center gap-2">
            <PlanetLogo className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <button className="p-2 text-white/70 hover:bg-white/10 rounded-full transition-colors" title="Settings">
              <Settings className="w-5 h-5" strokeWidth={1.5} />
            </button>
            {status === "authenticated" ? (
              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-bold">{session?.user?.user_metadata?.name}</span>
                  <span className="text-[10px] text-white/40">{session?.user?.email}</span>
                </div>
                <button 
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.refresh();
                  }}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                  title="Log Out"
                >
                  <LogOut className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className="hidden md:block px-4 py-2 text-sm font-medium hover:bg-white/10 rounded-full transition-colors">
                  Sign in
                </Link>
                <Link href="/signup" className="px-4 py-2 text-sm font-medium bg-white text-black rounded-full hover:opacity-90 transition-opacity">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </header>

        {/* Main Center Content */}
        <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-4 -mt-20">
          <div className="flex items-center gap-3 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <PlanetLogo className="w-10 h-10 md:w-12 md:h-12 text-white" />
            <span className="text-4xl md:text-5xl font-semibold tracking-tight">ChrisAI</span>
          </div>

          {/* Input Bar */}
          <div className="w-full max-w-3xl relative animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100">
            <div className="w-full relative bg-[#1a1a1a] border border-white/10 rounded-2xl md:rounded-3xl p-3 md:p-4 shadow-sm transition-all focus-within:border-white/20 focus-within:bg-[#222]">
              
              {/* Attached File Preview */}
              {attachedFile && (
                <div className="mb-3 flex items-center gap-3">
                  <div className="relative group">
                    {attachedFile.mimeType.startsWith('image/') ? (
                      <img src={`data:${attachedFile.mimeType};base64,${attachedFile.base64}`} alt="preview" className="w-12 h-12 md:w-14 md:h-14 object-cover rounded-xl border border-white/10" />
                    ) : (
                      <div className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center bg-white/5 rounded-xl border border-white/10">
                        <FileText className="w-5 h-5 md:w-6 md:h-6 text-white/50" strokeWidth={1.5} />
                      </div>
                    )}
                    <button
                      onClick={removeFile}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-[#222] border border-white/20 rounded-full flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" strokeWidth={2} />
                    </button>
                  </div>
                  <div className="text-xs text-white/50 truncate max-w-[150px] md:max-w-[200px]">{attachedFile.name}</div>
                </div>
              )}

              <textarea
                ref={textareaRef as any}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything"
                className="w-full bg-transparent resize-none outline-none text-[15px] md:text-base placeholder:text-white/40 min-h-[44px] max-h-[200px] text-white"
                rows={1}
              />
              
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1 md:gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*,.pdf,.txt"
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                    title="Attach File"
                  >
                    <Paperclip className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                  <button 
                    onClick={() => setIsDeepSearchMode(!isDeepSearchMode)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-colors text-sm font-medium ${isDeepSearchMode ? 'bg-blue-500/10 text-blue-400' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    title="Search Web"
                  >
                    <Globe className="w-4 h-4" strokeWidth={1.5} />
                    <span className="hidden sm:inline">Search</span>
                  </button>
                  <button 
                    onClick={() => setIsImagineMode(!isImagineMode)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-colors text-sm font-medium ${isImagineMode ? 'bg-purple-500/10 text-purple-400' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                  >
                    <ImageIcon className="w-4 h-4" strokeWidth={1.5} />
                    <span className="hidden sm:inline">Imagine</span>
                  </button>
                  <button 
                    onClick={toggleListening}
                    className={`p-2 rounded-xl transition-colors ${isListening ? 'text-red-500 bg-red-500/10 animate-pulse' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    title="Voice Dictation"
                  >
                    <Mic className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                </div>
                
                <button 
                  onClick={handleSubmit}
                  disabled={(!input.trim() && !attachedFile) || isGenerating}
                  className="w-9 h-9 md:w-10 md:h-10 bg-white text-black rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center shrink-0"
                  title="Send Message"
                >
                  <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
            <button 
              onClick={() => setIsDeepSearchMode(!isDeepSearchMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors text-sm font-medium ${isDeepSearchMode ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' : 'border-white/10 hover:bg-white/5 text-white/70'}`}
            >
              <Search className="w-4 h-4" strokeWidth={1.5} />
              DeepSearch
            </button>
            <button 
              onClick={() => setIsImagineMode(!isImagineMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors text-sm font-medium ${isImagineMode ? 'border-purple-500/50 bg-purple-500/10 text-purple-400' : 'border-white/10 hover:bg-white/5 text-white/70'}`}
            >
              <ImageIcon className="w-4 h-4" strokeWidth={1.5} />
              Imagine
            </button>
            <button 
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium text-white/70"
            >
              <FileText className="w-4 h-4" strokeWidth={1.5} />
              Pick Personas
            </button>
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 py-6 text-center animate-in fade-in duration-1000 delay-300">
          <p className="text-xs text-white/40">
            By messaging ChrisAI, you agree to our <a href="#" className="underline hover:text-white/70">Terms</a> and <a href="#" className="underline hover:text-white/70">Privacy Policy</a>.
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full bg-[#050505] text-white font-sans overflow-hidden selection:bg-white/20">
      {renderToasts()}

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed md:relative z-40 h-full flex-shrink-0 transition-all duration-300 ease-in-out border-r border-white/5 bg-[#000000] flex flex-col
          ${isSidebarOpen ? 'translate-x-0 w-[260px]' : '-translate-x-full md:translate-x-0 w-[260px] md:w-[60px]'}
        `}
      >
        <div className="flex flex-col h-full w-full p-2 overflow-hidden">
          {/* Top Section */}
          <div className={`flex items-center mb-4 px-2 h-8 shrink-0 transition-all duration-300 ${isSidebarOpen ? '' : 'pl-[12px]'}`}>
            <PlanetLogo className="w-5 h-5 text-white shrink-0" />
            <div className={`flex-1 flex justify-end transition-all duration-300 overflow-hidden ${isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="md:hidden p-1 hover:bg-white/10 rounded-lg transition-colors shrink-0"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Nav Items */}
          <div className="flex flex-col gap-0.5 mb-2 shrink-0">
            {/* Search */}
            <button className={`flex items-center rounded-full transition-all duration-300 px-2.5 py-1.5 w-full ${isSidebarOpen ? 'bg-[#1a1a1a] hover:bg-[#222] border border-white/5' : 'hover:bg-white/10 border border-transparent pl-[12px]'}`}>
              <Search className="w-4 h-4 text-white/70 shrink-0" strokeWidth={2} />
              <div className={`flex items-center transition-all duration-300 overflow-hidden whitespace-nowrap ${isSidebarOpen ? 'opacity-100 ml-2.5 w-[180px]' : 'opacity-0 ml-0 w-0'}`}>
                <span className="text-[13px] font-bold flex-1 text-left">Search</span>
                <span className="text-[10px] text-white/40 font-semibold">Ctrl+K</span>
              </div>
            </button>
            
            {/* Chat */}
            <button onClick={startNewChat} className={`flex items-center rounded-full transition-all duration-300 px-2.5 py-1.5 w-full mt-0.5 ${isSidebarOpen ? 'bg-[#222] hover:bg-[#2a2a2a]' : 'hover:bg-white/10 pl-[12px]'}`}>
              <Edit className={`w-4 h-4 shrink-0 ${isSidebarOpen ? 'text-white' : 'text-white/70'}`} strokeWidth={2} />
              <div className={`flex items-center transition-all duration-300 overflow-hidden whitespace-nowrap ${isSidebarOpen ? 'opacity-100 ml-2.5 w-[180px]' : 'opacity-0 ml-0 w-0'}`}>
                <span className="text-[13px] font-bold flex-1 text-left text-white">Chat</span>
                <span className="text-[10px] text-white/40 font-semibold">Ctrl+J</span>
              </div>
            </button>

            {/* Voice */}
            <button className={`flex items-center rounded-full transition-all duration-300 px-2.5 py-1.5 w-full hover:bg-white/5 ${isSidebarOpen ? '' : 'pl-[12px]'}`}>
              <AudioLines className="w-4 h-4 text-white/70 shrink-0" strokeWidth={2} />
              <div className={`flex items-center transition-all duration-300 overflow-hidden whitespace-nowrap ${isSidebarOpen ? 'opacity-100 ml-2.5 w-[180px]' : 'opacity-0 ml-0 w-0'}`}>
                <span className="text-[13px] font-bold flex-1 text-left">Voice</span>
              </div>
            </button>

            {/* Imagine */}
            <button onClick={() => setIsImagineMode(!isImagineMode)} className={`flex items-center rounded-full transition-all duration-300 px-2.5 py-1.5 w-full relative ${isImagineMode ? 'bg-purple-500/10 text-purple-400' : 'hover:bg-white/5'} ${isSidebarOpen ? '' : 'pl-[12px]'}`}>
              <ImageIcon className="w-4 h-4 text-white/70 shrink-0" strokeWidth={2} />
              <div className={`flex items-center transition-all duration-300 overflow-hidden whitespace-nowrap ${isSidebarOpen ? 'opacity-100 ml-2.5 w-[180px]' : 'opacity-0 ml-0 w-0'}`}>
                <span className="text-[13px] font-bold flex-1 text-left">Imagine</span>
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
              </div>
              {!isSidebarOpen && <div className="absolute top-2 right-3 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>}
            </button>

            {/* Projects */}
            <button className={`flex items-center rounded-full transition-all duration-300 px-2.5 py-1.5 w-full hover:bg-white/5 ${isSidebarOpen ? '' : 'pl-[12px]'}`}>
              <Folder className="w-4 h-4 text-white/70 shrink-0" strokeWidth={2} />
              <div className={`flex items-center transition-all duration-300 overflow-hidden whitespace-nowrap ${isSidebarOpen ? 'opacity-100 ml-2.5 w-[180px]' : 'opacity-0 ml-0 w-0'}`}>
                <span className="text-[13px] font-bold flex-1 text-left">Projects</span>
              </div>
            </button>

            {/* Sub-items */}
            <div className={`transition-all duration-300 overflow-hidden flex flex-col gap-2 border-l border-white/10 ml-4 ${isSidebarOpen ? 'max-h-40 opacity-100 mt-1.5 pl-3 py-1' : 'max-h-0 opacity-0 mt-0 pl-0 py-0 border-transparent'}`}>
              <button className="flex items-center gap-2.5 w-full py-0.5 text-[13px] text-[#ff6b4a] hover:text-[#ff856b] transition-colors whitespace-nowrap">
                <Bell className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                <span className="font-semibold">New Project</span>
              </button>
              <button className="flex items-center gap-2 w-full py-0.5 text-[12px] text-white/50 hover:text-white/70 transition-colors whitespace-nowrap">
                <span className="font-semibold">See all</span>
              </button>
            </div>
          </div>

          {/* History */}
          <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth flex flex-col">
            <div className={`flex items-center px-2.5 mb-3 shrink-0 transition-all duration-300 ${isSidebarOpen ? '' : 'pl-[12px]'}`}>
              <Clock className="w-4 h-4 text-white/70 shrink-0" strokeWidth={2} />
              <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isSidebarOpen ? 'opacity-100 ml-2.5 w-[180px]' : 'opacity-0 ml-0 w-0'}`}>
                <span className="text-[13px] font-bold tracking-tight">History</span>
              </div>
            </div>
            
            <div className={`transition-all duration-300 overflow-hidden flex-1 ${isSidebarOpen ? 'opacity-100 pl-4 border-l border-white/10 ml-4 pr-1' : 'opacity-0 w-0 h-0 border-transparent'}`}>
              <div className="w-[180px]">
                {status === "unauthenticated" ? (
                  <div className="py-3 px-2 rounded-lg bg-white/5 border border-white/5 text-center">
                    <p className="text-[11px] text-white/50 mb-2">Log in to save your chat history</p>
                    <Link href="/login" className="text-[11px] font-bold text-white hover:underline">Log In</Link>
                  </div>
                ) : isLoadingHistory ? (
                  <div className="flex flex-col gap-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-3 w-full bg-white/5 rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : chatHistory.length === 0 ? (
                  <p className="text-[11px] text-white/40 italic">No history yet</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupHistoryByDate(chatHistory)).map(([label, chats]) => (
                      chats.length > 0 && (
                        <div key={label} className="space-y-1.5">
                          <div className="text-[11px] font-bold text-white/40 pl-2">{label}</div>
                          <div className="space-y-0.5">
                            {chats.map((chat) => (
                              <div key={chat.id} className="relative group/item">
                                <button 
                                  onClick={() => loadChat(chat)}
                                  className={`w-full text-left text-[13px] font-medium truncate transition-all flex items-center gap-2 px-2.5 py-1.5 rounded-lg group ${currentChatId === chat.id ? 'bg-[#1a1a1a] text-white' : 'text-white/60 hover:text-white'}`}
                                >
                                  <span className="truncate flex-1">{chat.title || "Untitled Chat"}</span>
                                </button>
                                <button 
                                  onClick={(e) => deleteChat(e, chat.id)}
                                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-white/0 group-hover/item:text-white/40 hover:!text-red-500 transition-all rounded-md hover:bg-red-500/10"
                                  title="Delete Chat"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className={`relative mt-auto transition-all duration-300 shrink-0 w-full ${isSidebarOpen ? 'h-10' : 'h-[60px]'}`}>
            {status === "authenticated" ? (
              <div 
                className={`absolute transition-all duration-300 w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center font-medium text-[10px] cursor-pointer ${isSidebarOpen ? 'left-[6px] top-1/2 -translate-y-1/2' : 'left-[12px] top-0'}`} 
                title={session.user?.email}
              >
                {session.user?.user_metadata?.name?.[0] || session.user?.email?.[0] || "J"}
              </div>
            ) : (
              <Link 
                href="/login" 
                className={`absolute transition-all duration-300 w-6 h-6 rounded-full bg-white/10 text-white/50 flex items-center justify-center hover:bg-white/20 ${isSidebarOpen ? 'left-[6px] top-1/2 -translate-y-1/2' : 'left-[12px] top-0'}`}
              >
                <UserIcon className="w-3 h-3" />
              </Link>
            )}
            
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className={`absolute transition-all duration-300 w-7 h-7 flex items-center justify-center text-white/40 hover:text-white rounded-full hover:bg-white/5 ${isSidebarOpen ? 'left-[calc(100%-32px)] top-1/2 -translate-y-1/2' : 'left-[10px] bottom-0'}`}
            >
              <ChevronsLeft className={`w-3.5 h-3.5 transition-transform duration-300 ${isSidebarOpen ? '' : 'rotate-180'}`} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative min-w-0 bg-[#000000]">
        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <header className="sticky top-0 left-0 right-0 h-12 md:h-14 bg-[#000000]/80 backdrop-blur-xl z-30 flex items-center justify-between px-3 md:px-5">
            <div className="flex items-center gap-2">
              {!isSidebarOpen && (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors md:hidden"
                >
                  <Menu className="w-4 h-4 md:w-5 md:h-5" strokeWidth={1.5} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button className="p-1.5 text-white/70 hover:bg-white/10 rounded-full transition-colors">
                <MoreHorizontal className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black rounded-full text-[13px] font-medium hover:opacity-90 transition-opacity">
                <Share className="w-3.5 h-3.5" strokeWidth={2} />
                Share
              </button>
              <button onClick={startNewChat} className="p-1.5 text-white/70 hover:bg-white/10 rounded-full transition-colors border border-white/10">
                <Edit className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </header>

          <div className="px-3 md:px-8 pt-6 md:pt-8 pb-16 md:pb-20">
            <div className="max-w-3xl mx-auto w-full flex flex-col gap-6 md:gap-8">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[92%] md:max-w-[85%] rounded-3xl px-4 py-3 md:px-5 md:py-4 ${
                      msg.role === 'user'
                        ? 'bg-[#1a1a1a] border border-white/5 text-white'
                        : 'bg-transparent text-white/90'
                    }`}
                  >
                    {msg.file && (
                      msg.role === 'ai' && msg.file.mimeType.startsWith('image/') ? (
                        <div className="mb-3 relative group w-fit">
                          <img src={`data:${msg.file.mimeType};base64,${msg.file.base64}`} alt="Generated image" className="max-w-full rounded-2xl border border-white/10 shadow-sm" />
                          <a 
                            href={`data:${msg.file.mimeType};base64,${msg.file.base64}`} 
                            download={msg.file.name || 'generated-image.png'}
                            className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md flex items-center justify-center"
                            title="Download Image"
                          >
                            <Download className="w-3.5 h-3.5" strokeWidth={2} />
                          </a>
                        </div>
                      ) : (
                        <div className="mb-2 flex items-center gap-2 p-1.5 rounded-lg bg-white/5 border border-white/5 w-fit">
                          {msg.file.mimeType.startsWith('image/') ? (
                            <img src={`data:${msg.file.mimeType};base64,${msg.file.base64}`} alt="attachment" className="w-10 h-10 object-cover rounded-md" />
                          ) : (
                            <div className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-md">
                              <FileText className="w-5 h-5 text-white/70" strokeWidth={1.5} />
                            </div>
                          )}
                          <div className="text-xs truncate max-w-[150px] opacity-80">{msg.file.name}</div>
                        </div>
                      )
                    )}
                    
                    {msg.role === 'ai' && msg.isThinking && (
                      <div className="flex items-center gap-1.5 mb-2 text-[11px] font-medium text-white/50 bg-white/5 w-fit px-2.5 py-1 rounded-full border border-white/5">
                        <BrainCircuit className="w-3 h-3" strokeWidth={1.5} />
                        Thinking Process
                      </div>
                    )}

                    <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-pre:border-0 text-[14px] sm:text-[15px] tracking-wide">
                      <Markdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code: CodeBlock,
                          p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
                          li: ({ children }) => <li className="pl-1">{children}</li>,
                          h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6 text-white">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-xl font-bold mb-4 mt-6 text-white">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-lg font-bold mb-3 mt-5 text-white">{children}</h3>,
                          blockquote: ({ children }) => <blockquote className="border-l-4 border-white/20 pl-4 italic text-white/70 my-4">{children}</blockquote>,
                          a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2 decoration-blue-400/30 hover:decoration-blue-400 transition-colors">{children}</a>,
                          table: ({ children }) => <div className="overflow-x-auto my-6"><table className="w-full text-left border-collapse">{children}</table></div>,
                          th: ({ children }) => <th className="border-b border-white/10 px-4 py-3 font-medium text-white/90 bg-white/5">{children}</th>,
                          td: ({ children }) => <td className="border-b border-white/5 px-4 py-3 text-white/70">{children}</td>,
                        }}
                      >
                        {msg.text}
                      </Markdown>
                    </div>

                    {msg.role === 'ai' && msg.groundingChunks && msg.groundingChunks.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-center gap-2 text-xs font-medium text-white/50 mb-2">
                          <Globe className="w-3.5 h-3.5" strokeWidth={1.5} />
                          Sources
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {msg.groundingChunks.map((chunk: any, i: number) => {
                            const uri = chunk.web?.uri;
                            const title = chunk.web?.title;
                            if (!uri) return null;
                            return (
                              <a
                                key={i}
                                href={uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-white/70 transition-colors max-w-[200px]"
                              >
                                <span className="truncate">{title || new URL(uri).hostname}</span>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {msg.role === 'ai' && (
                      <div className="flex flex-col gap-3 mt-3 w-full">
                        <div className="flex items-center gap-1 text-white/40">
                          <button className="p-1 hover:text-white hover:bg-white/5 rounded-md transition-colors" title="Regenerate">
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button className="p-1 hover:text-white hover:bg-white/5 rounded-md transition-colors" title="Read Aloud">
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                          <button className="p-1 hover:text-white hover:bg-white/5 rounded-md transition-colors" title="Copy">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button className="p-1 hover:text-white hover:bg-white/5 rounded-md transition-colors" title="Share">
                            <Share className="w-3.5 h-3.5" />
                          </button>
                          <button className="p-1 hover:text-white hover:bg-white/5 rounded-md transition-colors" title="Good Response">
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button className="p-1 hover:text-white hover:bg-white/5 rounded-md transition-colors" title="Bad Response">
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                          <button className="p-1 hover:text-white hover:bg-white/5 rounded-md transition-colors" title="More Options">
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[10px] ml-1.5 opacity-50">1.1s</span>
                          <span className="text-[10px] opacity-50">Fast</span>
                        </div>
                        
                        {/* Suggested Follow-ups */}
                        <div className="flex flex-col gap-1.5 mt-1">
                          <button className="flex items-center gap-2 text-[13px] text-white/70 hover:text-white transition-colors w-fit text-left">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 shrink-0"><polyline points="9 10 4 15 9 20"></polyline><path d="M20 4v7a4 4 0 0 1-4 4H4"></path></svg>
                            Explain PHP match expression
                          </button>
                          <button className="flex items-center gap-2 text-[13px] text-white/70 hover:text-white transition-colors w-fit text-left">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 shrink-0"><polyline points="9 10 4 15 9 20"></polyline><path d="M20 4v7a4 4 0 0 1-4 4H4"></path></svg>
                            PHP with MySQL CRUD
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            {isGenerating && (
              <div className="flex items-start">
                <div className="px-5 py-4 text-white/50 flex items-center gap-2">
                  <PlanetLogo className="w-5 h-5 animate-pulse" />
                  <span className="text-sm animate-pulse">Chris is thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
        </div>

        {/* Input Dock */}
        <div className="shrink-0 relative z-20 bg-gradient-to-t from-[#050505] from-40% to-transparent pt-8 pb-3 md:pb-4 px-3 md:px-6 -mt-8">
          <div className="max-w-3xl mx-auto w-full flex flex-col items-center gap-3">
            <div className="w-full relative bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/10 rounded-[24px] p-2 shadow-lg transition-all focus-within:border-white/20 focus-within:bg-[#1a1a1a] focus-within:shadow-xl focus-within:shadow-black/50 group">
              
              {/* Attached File Preview */}
              {attachedFile && (
                <div className="mb-2 mx-2 flex items-center gap-2">
                  <div className="relative group/file">
                    {attachedFile.mimeType.startsWith('image/') ? (
                      <img src={`data:${attachedFile.mimeType};base64,${attachedFile.base64}`} alt="preview" className="w-10 h-10 md:w-12 md:h-12 object-cover rounded-lg border border-white/10" />
                    ) : (
                      <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white/5 rounded-lg border border-white/10">
                        <FileText className="w-4 h-4 md:w-5 md:h-5 text-white/50" strokeWidth={1.5} />
                      </div>
                    )}
                    <button
                      onClick={removeFile}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#222] border border-white/20 rounded-full flex items-center justify-center md:opacity-0 md:group-hover/file:opacity-100 transition-opacity"
                    >
                      <X className="w-2.5 h-2.5" strokeWidth={2} />
                    </button>
                  </div>
                  <div className="text-[11px] text-white/50 truncate max-w-[150px] md:max-w-[200px]">{attachedFile.name}</div>
                </div>
              )}

              <div className="flex items-end gap-2 pl-3 pr-2">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="pb-3 text-white/40 hover:text-white transition-colors"
                  title="Attach File"
                >
                  <Paperclip className="w-5 h-5" strokeWidth={1.5} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,.pdf,.txt"
                />

                <textarea
                  ref={textareaRef as any}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything..."
                  className="w-full bg-transparent resize-none outline-none text-[15px] placeholder:text-white/30 min-h-[44px] max-h-[150px] text-white py-3"
                  rows={1}
                />

                <div className="pb-2 flex items-center gap-1">
                  <button 
                    onClick={toggleListening}
                    className={`p-2 rounded-full transition-all duration-300 ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
                    title="Voice Dictation"
                  >
                    <Mic className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                  <button 
                    onClick={handleSubmit}
                    disabled={(!input.trim() && !attachedFile) || isGenerating}
                    className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 ${(!input.trim() && !attachedFile) || isGenerating ? 'bg-white/10 text-white/30 cursor-not-allowed' : 'bg-white text-black hover:scale-105 hover:shadow-lg hover:shadow-white/20'}`}
                    title="Send Message"
                  >
                    <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-1 mt-1 px-2 pb-1 overflow-x-auto no-scrollbar">
                <button 
                  onClick={() => setIsDeepSearchMode(!isDeepSearchMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 text-[11px] font-medium border ${isDeepSearchMode ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-white/5 border-transparent text-white/40 hover:text-white hover:bg-white/10'}`}
                >
                  <Globe className="w-3 h-3" strokeWidth={1.5} />
                  <span>Search</span>
                </button>
                <button 
                  onClick={() => setIsThinkMode(!isThinkMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 text-[11px] font-medium border ${isThinkMode ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-transparent text-white/40 hover:text-white hover:bg-white/10'}`}
                >
                  <BrainCircuit className="w-3 h-3" strokeWidth={1.5} />
                  <span>Think</span>
                </button>
                <button 
                  onClick={() => setIsMapsMode(!isMapsMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 text-[11px] font-medium border ${isMapsMode ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-white/5 border-transparent text-white/40 hover:text-white hover:bg-white/10'}`}
                >
                  <MapPin className="w-3 h-3" strokeWidth={1.5} />
                  <span>Maps</span>
                </button>
                <button 
                  onClick={() => setIsImagineMode(!isImagineMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 text-[11px] font-medium border ${isImagineMode ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-white/5 border-transparent text-white/40 hover:text-white hover:bg-white/10'}`}
                >
                  <ImageIcon className="w-3 h-3" strokeWidth={1.5} />
                  <span>Imagine</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
