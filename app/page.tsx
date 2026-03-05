'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, ThinkingLevel, FunctionDeclaration } from '@google/genai';
import { Mirage } from 'ldrs/react'
import 'ldrs/react/Mirage.css'
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
  MapPin,
  Info,
  TriangleAlert,
  Rocket,
  Zap
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { auth, db } from '@/lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDocs,
  setDoc,
  Timestamp,
  getDocFromServer
} from 'firebase/firestore';

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map((provider: any) => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Types ---
type Role = 'user' | 'ai';

interface FileAttachment {
  base64: string;
  mimeType: string;
  name: string;
}

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

interface Message {
  id: string;
  role: Role;
  text: string;
  isThinking?: boolean;
  groundingChunks?: any[];
  file?: FileAttachment;
  videoUrl?: string;
  isError?: boolean;
}

interface Toast {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'success' | 'info' | 'quota';
}

import { PlanetLogo } from '@/components/PlanetLogo';
import { ThemeToggle } from '@/components/theme-toggle';

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

// --- Simple Memory Cache for AI Responses ---
const aiResponseCache = new Map<string, any>();

// --- Main Component ---
export default function Chris() {
  const router = useRouter();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Test Firestore connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    const checkApiKey = async () => {
      if (typeof window !== 'undefined' && window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } else {
        setHasApiKey(true);
      }
    };
    checkApiKey();

    // Network status listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setIsOnline(navigator.onLine);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setStatus(user ? "authenticated" : "unauthenticated");
    });

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isThinkMode, setIsThinkMode] = useState(false);
  const [isDeepSearchMode, setIsDeepSearchMode] = useState(false);
  const [isImagineMode, setIsImagineMode] = useState(false);
  const [isMapsMode, setIsMapsMode] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  
  // Fetch location when Maps Mode is enabled
  useEffect(() => {
    if (isMapsMode && !userLocation) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            console.error("Error getting location:", error);
            addToast("Could not access location for Maps mode.", "warning");
          }
        );
      } else {
        addToast("Geolocation is not supported by this browser.", "warning");
      }
    }
  }, [isMapsMode, userLocation]);

  const [selectedModel, setSelectedModel] = useState('auto');
  const [attachedFile, setAttachedFile] = useState<FileAttachment | null>(null);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const freeModels = [
    { id: 'auto', name: 'Auto' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro' },
  ];
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // --- Click Outside Handler ---
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [modelDropdownRef]);

  // --- Fetch Chat History ---
  useEffect(() => {
    if (status === "authenticated" && user) {
      const q = query(
        collection(db, "chats"),
        where("userId", "==", user.uid),
        orderBy("updatedAt", "desc")
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const history = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setChatHistory(history);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, "chats");
      });

      return () => unsubscribe();
    }
  }, [status, user]);

  const loadChat = async (chat: any) => {
    setCurrentChatId(chat.id);
    setIsGenerating(true);
    try {
      const messagesRef = collection(db, "chats", chat.id, "messages");
      const q = query(messagesRef, orderBy("createdAt", "asc"));
      const snapshot = await getDocs(q);
      const loadedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        role: doc.data().role,
        text: doc.data().text,
        file: doc.data().file,
        videoUrl: doc.data().videoUrl,
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      setMessages(loadedMessages);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `chats/${chat.id}/messages`);
    } finally {
      setIsGenerating(false);
    }
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
    } else if (status === "authenticated") {
      setMessages([]);
      setCurrentChatId(null);
      localStorage.removeItem('chrisai_messages');
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
      await deleteDoc(doc(db, "chats", chatId));
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        setMessages([]);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `chats/${chatId}`);
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
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
      textareaRef.current.style.overflowY = scrollHeight > 200 ? 'auto' : 'hidden';
    }
  }, [input]);

  // --- Toast System ---
  const addToast = (message: string, type: 'error' | 'warning' | 'success' | 'info' | 'quota') => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // --- Voice Dictation ---
  useEffect(() => {
    let recognition: any = null;

    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US'; // Set language for better accuracy

      recognition.onresult = (event: any) => {
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          const trimmed = finalTranscript.trim();
          if (trimmed) {
            setInput((prev) => {
              const needsSpace = prev.length > 0 && !prev.endsWith(' ');
              return prev + (needsSpace ? ' ' : '') + trimmed;
            });
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
          addToast('Microphone access denied. Please allow permissions.', 'warning');
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (status === "unauthenticated") {
      setShowAuthModal(true);
      return;
    }
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
    const msg = error?.message || error?.toString() || '';
    const lowerMsg = msg.toLowerCase();
    
    if (lowerMsg.includes('veo_api_key_required')) {
      return; // Handled by the modal
    }
    
    if (lowerMsg.includes('413') || lowerMsg.includes('payload too large')) {
      addToast('Payload Too Large: The request exceeds server size limits.', 'error');
    } else if (lowerMsg.includes('quota') || lowerMsg.includes('exhausted') || lowerMsg.includes('429 resource has been exhausted')) {
      addToast('Quota Exceeded: You have reached the API limit for this model. Please try again later or switch to a different model.', 'quota');
    } else if (lowerMsg.includes('429') || lowerMsg.includes('rate limit') || lowerMsg.includes('too many requests')) {
      addToast('Rate Limit Exceeded: Too many requests. Please wait a moment.', 'warning');
    } else if (lowerMsg.includes('400') || lowerMsg.includes('invalid') || lowerMsg.includes('context length')) {
      addToast('Context Length Exceeded: Prompt is too long for model capacity.', 'error');
    } else if (lowerMsg.includes('404') || lowerMsg.includes('not found')) {
      addToast('Model Not Found: The selected AI model is currently unavailable.', 'error');
    } else {
      addToast(`Error: ${msg.slice(0, 100)}${msg.length > 100 ? '...' : ''} Please try again.`, 'error');
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

    if (status === "unauthenticated") {
      if (attachedFile || isImagineMode || isMapsMode || isDeepSearchMode || isThinkMode) {
        setShowAuthModal(true);
        return;
      }
    }

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
      // Build history for context (limit to last 15 messages)
      const historyContents = messages.slice(-15).map(msg => {
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
        if (userLocation) {
          config.toolConfig = {
            retrievalConfig: {
              latLng: {
                latitude: userLocation.latitude,
                longitude: userLocation.longitude
              }
            }
          };
        }
      }
      if (isThinkMode) {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      }

      const cacheKey = JSON.stringify({ contents, config, isImagineMode, isThinkMode, isMapsMode });
      let response;
      let isImageResponse = isImagineMode;
      let isVideoResponse = false;
      let videoUrl = '';

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
          let currentModelName = selectedModel;
          if (currentModelName === 'auto') {
            currentModelName = 'gemini-3-flash-preview';
          }
          
          if (isThinkMode) {
            currentModelName = 'gemini-3.1-pro-preview';
          } else if (isMapsMode) {
            currentModelName = 'gemini-2.5-flash';
          }
          
          if (status === "unauthenticated") {
            currentModelName = 'gemini-3-flash-preview';
          }
          
          const generateImageFunctionDeclaration: FunctionDeclaration = {
            name: "generateImage",
            description: "Generate an image based on a text prompt. Use this tool when the user asks to create, generate, or draw an image or picture.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                prompt: {
                  type: Type.STRING,
                  description: "A detailed description of the image to generate.",
                },
              },
              required: ["prompt"],
            },
          };

          const generateVideoFunctionDeclaration: FunctionDeclaration = {
            name: "generateVideo",
            description: "Generate a video based on a text prompt and an optional uploaded image. Use this tool when the user asks to animate an image, create a video, or generate a video.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                prompt: {
                  type: Type.STRING,
                  description: "A detailed description of the video to generate.",
                },
                aspectRatio: {
                  type: Type.STRING,
                  description: "The aspect ratio of the video. Must be '16:9' or '9:16'. Default to '16:9' if not specified.",
                }
              },
              required: ["prompt"],
            },
          };

          const currentConfig = { ...config };
          // Only add the tool if we are not using maps mode, as maps mode restricts other tools
          if (!isMapsMode && status === "authenticated") {
            currentConfig.tools = currentConfig.tools || [];
            currentConfig.tools.push({ functionDeclarations: [generateImageFunctionDeclaration, generateVideoFunctionDeclaration] });
          }
          
          if (currentConfig.tools && currentConfig.tools.length === 0) {
            delete currentConfig.tools;
          }

          response = await ai.models.generateContent({
            model: currentModelName,
            contents: contents as any,
            config: currentConfig
          });
          
          // Check for native function calls
          const functionCalls = response.functionCalls;
          
          if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            if (call.name === 'generateImage') {
              const prompt = call.args?.prompt as string;
              
              // Now generate the image
              const imageResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: prompt }] }
              });
              
              response = imageResponse;
              isImageResponse = true;
            } else if (call.name === 'generateVideo') {
              const prompt = call.args?.prompt as string;
              const aspectRatio = (call.args?.aspectRatio as string) || '16:9';
              
              // Now generate the video
              const videoConfig: any = {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: aspectRatio === '9:16' ? '9:16' : '16:9'
              };
              
              const videoParams: any = {
                model: 'veo-3.1-fast-generate-preview',
                prompt: prompt,
                config: videoConfig
              };
              
              if (currentFile && currentFile.mimeType.startsWith('image/')) {
                videoParams.image = {
                  imageBytes: currentFile.base64,
                  mimeType: currentFile.mimeType
                };
              }
              
              // Create a new GoogleGenAI instance to ensure it uses the most up-to-date API key from the dialog
              const videoAi = getGenAI();
              if (videoAi) {
                try {
                  let operation = await videoAi.models.generateVideos(videoParams);
                  
                  while (!operation.done) {
                    await new Promise(resolve => setTimeout(resolve, 10000));
                    operation = await videoAi.operations.getVideosOperation({operation: operation});
                  }
                  
                  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
                  
                  if (downloadLink) {
                    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY || '';
                    const videoResponse = await fetch(downloadLink, {
                      method: 'GET',
                      headers: {
                        'x-goog-api-key': apiKey,
                      },
                    });
                    const blob = await videoResponse.blob();
                    videoUrl = URL.createObjectURL(blob);
                    isVideoResponse = true;
                    
                    // Mock a response object for the chat UI
                    response = {
                      text: 'Here is your generated video:',
                      candidates: [{ content: { parts: [{ text: 'Here is your generated video:' }] } }]
                    } as any;
                  }
                } catch (videoError: any) {
                  const msg = videoError?.message || videoError?.toString() || '';
                  if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('403') || msg.toLowerCase().includes('requested entity was not found')) {
                    setShowApiKeyModal(true);
                    throw new Error('VEO_API_KEY_REQUIRED');
                  } else {
                    throw videoError;
                  }
                }
              }
            }
          }

          // Fallback for hallucinated JSON (like dalle.text2im)
          if (!isImageResponse && response.text) {
            try {
              let jsonText = response.text.trim();
              if (jsonText.startsWith('```json')) {
                jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
              } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
              }
              
              const parsed = JSON.parse(jsonText);
              if (parsed.action === 'dalle.text2im' || parsed.action === 'generate_image' || parsed.action === 'generateImage') {
                const prompt = parsed.action_input?.prompt || parsed.prompt || userText;
                if (prompt) {
                  const imageResponse = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: [{ text: prompt }] }
                  });
                  response = imageResponse;
                  isImageResponse = true;
                }
              }
            } catch (e) {
              // Not JSON, ignore
            }
          }
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

      if (isVideoResponse && videoUrl) {
        aiMessage = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          text: 'Here is your generated video:',
          videoUrl: videoUrl,
        };
      } else if (isImageResponse) {
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
      if (status === "authenticated" && user) {
        try {
          let chatId = currentChatId;
          if (!chatId) {
            // Create new chat
            const chatRef = doc(collection(db, "chats"));
            chatId = chatRef.id;
            await setDoc(chatRef, {
              id: chatId,
              userId: user.uid,
              title: userText.slice(0, 30) + (userText.length > 30 ? "..." : ""),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            setCurrentChatId(chatId);
          } else {
            // Update chat timestamp
            await setDoc(doc(db, "chats", chatId), {
              updatedAt: serverTimestamp()
            }, { merge: true });
          }

          // Add user message
          const userMsgRef = doc(collection(db, "chats", chatId, "messages"));
          await setDoc(userMsgRef, {
            id: userMsgRef.id,
            role: "user",
            text: userText,
            file: currentFile ? {
              base64: currentFile.base64,
              mimeType: currentFile.mimeType,
              name: currentFile.name
            } : null,
            createdAt: serverTimestamp()
          });

          // Add AI message
          const aiMsgRef = doc(collection(db, "chats", chatId, "messages"));
          await setDoc(aiMsgRef, {
            id: aiMsgRef.id,
            role: "ai",
            text: response.text || "",
            videoUrl: videoUrl || null,
            createdAt: serverTimestamp()
          });
        } catch (dbError) {
          handleFirestoreError(dbError, OperationType.WRITE, `chats/${currentChatId}/messages`);
        }
      }

    } catch (error: any) {
      const msg = error?.message || error?.toString() || '';
      if (msg.includes('VEO_API_KEY_REQUIRED')) {
        // Do nothing, the modal is shown and we don't want to add an error message to the chat
      } else {
        handleError(error);
        setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'ai', text: 'Failed to generate response.', isError: true }]);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImageWithWatermark = async (base64Data: string, mimeType: string, filename: string) => {
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = `data:${mimeType};base64,${base64Data}`;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Prepare watermark SVG
      const svgString = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 7c-1.5-2-4-3-6.5-3-5.2 0-9.5 4.3-9.5 9.5S6.3 23 11.5 23c2.5 0 5-1 6.5-3" />
          <path d="M14 10.5c-.8-1-2-1.5-3.5-1.5-2.8 0-5 2.2-5 5s2.2 5 5 5c1.5 0 2.7-.5 3.5-1.5" />
        </svg>
      `;
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const DOMURL = window.URL || window.webkitURL || window;
      const url = DOMURL.createObjectURL(svgBlob);

      const watermarkImg = new Image();
      await new Promise((resolve, reject) => {
        watermarkImg.onload = resolve;
        watermarkImg.onerror = reject;
        watermarkImg.src = url;
      });

      // Calculate watermark size and position
      const watermarkSize = Math.max(32, img.width * 0.05);
      const padding = watermarkSize * 0.5;
      
      const x = img.width - watermarkSize - padding;
      const y = img.height - watermarkSize - padding;

      // Draw watermark with opacity
      ctx.globalAlpha = 0.3;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
      
      ctx.drawImage(watermarkImg, x, y, watermarkSize, watermarkSize);
      
      // Reset alpha and shadow
      ctx.globalAlpha = 1.0;
      ctx.shadowColor = 'transparent';

      DOMURL.revokeObjectURL(url);

      // Trigger download
      const dataUrl = canvas.toDataURL(mimeType);
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error adding watermark:', error);
      // Fallback to original image if watermark fails
      const link = document.createElement('a');
      link.download = filename;
      link.href = `data:${mimeType};base64,${base64Data}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Only submit on desktop (md breakpoint is 768px)
      if (window.innerWidth >= 768) {
        e.preventDefault();
        handleSubmit();
      }
      // On mobile/tablet, default behavior (newline) occurs
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
      {!isOnline && (
        <div className="px-4 py-3 rounded-xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 pointer-events-auto transition-all duration-300 animate-in fade-in slide-in-from-top-4 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-200">
          <TriangleAlert className="w-4 h-4" />
          <div className="text-sm font-medium tracking-tight">You are currently offline. Please check your network connection.</div>
        </div>
      )}
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 pointer-events-auto transition-all duration-300 animate-in fade-in slide-in-from-top-4
            ${toast.type === 'error' ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-200' : 
              toast.type === 'quota' ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30 text-orange-700 dark:text-orange-200' :
              toast.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20 text-yellow-700 dark:text-yellow-200' :
              toast.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-200' :
              'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-200'}`}
        >
          {toast.type === 'error' && <X className="w-4 h-4" />}
          {toast.type === 'quota' && <TriangleAlert className="w-4 h-4 text-orange-500 dark:text-orange-400" />}
          {toast.type === 'warning' && <TriangleAlert className="w-4 h-4" />}
          {toast.type === 'success' && <Check className="w-4 h-4" />}
          {toast.type === 'info' && <Info className="w-4 h-4" />}
          <div className="text-sm font-medium tracking-tight">{toast.message}</div>
        </div>
      ))}
    </div>
  );

  if (status === "loading") {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-white dark:bg-[#000000] text-black dark:text-white">
        <Mirage size="60" speed="2.5" color="currentColor" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col h-[100dvh] w-full bg-white dark:bg-[#000000] text-black dark:text-white font-sans overflow-hidden relative selection:bg-black/20 dark:selection:bg-white/20">
        {renderToasts()}
        
        {/* Top Nav */}
        <header className="relative z-20 flex items-center justify-between p-4 md:p-6">
          <div className="flex items-center gap-2">
            <PlanetLogo className="w-8 h-8 text-black dark:text-white" />
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <ThemeToggle />
            {status === "authenticated" && (
              <button className="p-2 text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors" title="Settings">
                <Settings className="w-5 h-5" strokeWidth={1.5} />
              </button>
            )}
            {status === "authenticated" ? (
              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-bold">{user?.displayName}</span>
                  <span className="text-[10px] text-black/40 dark:text-white/40">{user?.email}</span>
                </div>
                <button 
                  onClick={async () => {
                    await signOut(auth);
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
                <Link href="/login" className="hidden md:block px-5 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors border border-transparent hover:border-black/10 dark:hover:border-white/10">
                  Sign in
                </Link>
                <Link href="/signup" className="px-5 py-2 text-sm font-medium bg-black text-white dark:bg-white dark:text-black rounded-full hover:opacity-90 transition-opacity">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </header>

        {/* Main Center Content */}
        <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-4 -mt-20 w-full max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <PlanetLogo className="w-12 h-12 md:w-16 md:h-16 text-black dark:text-white" />
            <span className="text-5xl md:text-6xl font-semibold tracking-tight">Chris</span>
          </div>

          {/* Input Bar */}
          <div className="w-full max-w-[680px] relative animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100 z-30">
            <div className={`w-full relative bg-gray-50 dark:bg-[#121212] border border-black/10 dark:border-white/10 rounded-[32px] px-4 py-3 shadow-lg transition-all focus-within:border-black/20 dark:focus-within:border-white/20 focus-within:bg-white dark:focus-within:bg-[#121212] flex flex-col gap-2 group ${attachedFile ? 'rounded-[24px]' : ''}`}>
              
              {/* Attached File Preview */}
              {attachedFile && (
                <div className="mb-1 flex items-center gap-3 px-1">
                  <div className="relative group/file">
                    {attachedFile.mimeType.startsWith('image/') ? (
                      <img src={`data:${attachedFile.mimeType};base64,${attachedFile.base64}`} alt="preview" className="w-12 h-12 md:w-14 md:h-14 object-cover rounded-xl border border-black/10 dark:border-white/10" />
                    ) : (
                      <div className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-xl border border-black/10 dark:border-white/10">
                        <FileText className="w-5 h-5 md:w-6 md:h-6 text-black/50 dark:text-white/50" strokeWidth={1.5} />
                      </div>
                    )}
                    <button
                      onClick={removeFile}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-white dark:bg-[#222] border border-black/20 dark:border-white/20 rounded-full flex items-center justify-center md:opacity-0 md:group-hover/file:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X className="w-3 h-3" strokeWidth={2} />
                    </button>
                  </div>
                  <div className="text-xs text-black/50 dark:text-white/50 truncate max-w-[150px] md:max-w-[200px]">{attachedFile.name}</div>
                </div>
              )}

              <div className="flex items-center gap-3 w-full">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,.pdf,.txt"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors shrink-0"
                  title="Attach File"
                >
                  <Paperclip className="w-5 h-5" strokeWidth={1.5} />
                </button>

                <textarea
                  ref={textareaRef as any}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="What's on your mind?"
                  className="flex-1 bg-transparent resize-none outline-none text-[16px] placeholder:text-black/30 dark:placeholder:text-white/30 min-h-[24px] max-h-[200px] text-black dark:text-white no-scrollbar py-1"
                  rows={1}
                />
                
                <div className="flex items-center gap-2 shrink-0">
                  {/* Model Selector */}
                  {status === "authenticated" && (
                    <div className="relative hidden sm:block" ref={modelDropdownRef}>
                      <button
                        onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#1a1a1a] hover:bg-gray-100 dark:hover:bg-[#222] border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 transition-all cursor-pointer text-xs font-medium text-black/80 dark:text-white/80 hover:text-black dark:hover:text-white group"
                      >
                        <span className="text-blue-500 dark:text-blue-400 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
                          <Rocket className="w-3.5 h-3.5" strokeWidth={2} />
                        </span>
                        <span>
                          {freeModels.find(m => m.id === selectedModel)?.name || 'Auto'}
                        </span>
                        <ChevronDown className={`w-3 h-3 text-black/40 dark:text-white/40 transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Dropdown Menu */}
                      {isModelDropdownOpen && (
                        <div className="absolute bottom-full right-0 mb-2 w-48 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                          <div className="p-1">
                            <div className="px-3 py-2 text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-wider">
                              Model Selection
                            </div>
                            {freeModels.map((model) => (
                              <button
                                key={model.id}
                                onClick={() => {
                                  setSelectedModel(model.id);
                                  setIsModelDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                                  selectedModel === model.id
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                                    : 'text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white'
                                }`}
                              >
                                <span>{model.name}</span>
                                {selectedModel === model.id && (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {status === "authenticated" && <div className="w-px h-5 bg-black/10 dark:bg-white/10 mx-1 hidden sm:block"></div>}

                  {status === "authenticated" && (
                    <button 
                      onClick={toggleListening}
                      className={`p-2 rounded-full transition-colors ${isListening ? 'text-red-500 bg-red-500/10 animate-pulse' : 'text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}
                      title="Voice Dictation"
                    >
                      <Mic className="w-5 h-5" strokeWidth={1.5} />
                    </button>
                  )}

                  <button 
                    onClick={handleSubmit}
                    disabled={(!input?.trim() && !attachedFile) || isGenerating}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
                      (!input?.trim() && !attachedFile) || isGenerating
                        ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed' 
                        : 'bg-black text-white dark:bg-white dark:text-black hover:scale-105 shadow-sm'
                    }`}
                    title={(!input?.trim() && !attachedFile) ? (status === "authenticated" ? "Voice Mode" : "Send Message") : "Send Message"}
                  >
                    {(!input?.trim() && !attachedFile && status === "authenticated") ? (
                      <AudioLines className="w-5 h-5" strokeWidth={2} />
                    ) : (
                      <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200 relative z-20">
            {status === "authenticated" && (
              <>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDeepSearchMode(!isDeepSearchMode);
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all text-sm font-medium cursor-pointer ${isDeepSearchMode ? 'border-blue-500/50 bg-blue-500/10 text-blue-500 dark:text-blue-400' : 'border-black/10 dark:border-white/10 bg-white dark:bg-[#121212] hover:bg-black/5 dark:hover:bg-white/5 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white'}`}
                >
                  <Globe className="w-4 h-4" strokeWidth={1.5} />
                  DeepSearch
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsImagineMode(!isImagineMode);
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all text-sm font-medium cursor-pointer ${isImagineMode ? 'border-purple-500/50 bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'border-black/10 dark:border-white/10 bg-white dark:bg-[#121212] hover:bg-black/5 dark:hover:bg-white/5 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white'}`}
                >
                  <ImageIcon className="w-4 h-4" strokeWidth={1.5} />
                  Imagine
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    addToast('Personas feature coming soon', 'info');
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-[#121212] hover:bg-black/5 dark:hover:bg-white/5 transition-all text-sm font-medium text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  <Folder className="w-4 h-4" strokeWidth={1.5} />
                  Pick Personas
                  <ChevronDown className="w-3 h-3 opacity-50 ml-1" />
                </button>
              </>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 py-8 text-center animate-in fade-in duration-1000 delay-300">
          <p className="text-xs text-black/30 dark:text-white/30 font-medium">
            By messaging Chris, you agree to our <a href="#" className="underline hover:text-black/50 dark:hover:text-white/50 transition-colors">Terms</a> and <a href="#" className="underline hover:text-black/50 dark:hover:text-white/50 transition-colors">Privacy Policy</a>.
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full bg-white dark:bg-[#050505] text-black dark:text-white font-sans overflow-hidden selection:bg-black/20 dark:selection:bg-white/20">
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
        className={`fixed md:relative z-40 h-full flex-shrink-0 transition-all duration-300 ease-in-out border-r border-black/5 dark:border-white/5 bg-neutral-50 dark:bg-[#000000] flex flex-col py-2
          ${isSidebarOpen ? 'translate-x-0 w-[240px]' : '-translate-x-full md:translate-x-0 w-[240px] md:w-[56px]'}
          ${status === "unauthenticated" ? 'md:hidden' : ''}
        `}
      >
        <div className="flex flex-col h-full w-full overflow-hidden">
          {/* Top Section */}
          <div className="flex items-center mb-2 h-9 shrink-0 pl-2">
            <div className={`w-[40px] h-full flex items-center justify-center shrink-0`}>
              <PlanetLogo className="w-5 h-5 text-black dark:text-white" />
            </div>
            <div className={`flex-1 flex justify-end transition-all duration-300 overflow-hidden ${isSidebarOpen ? 'opacity-100 w-auto pr-2' : 'opacity-0 w-0'}`}>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="md:hidden p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors shrink-0"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Nav Items */}
          <div className="flex flex-col gap-1 mb-2 shrink-0">
            {/* Search */}
            {status === "authenticated" && (
              <button className={`group flex items-center rounded-xl transition-all duration-300 h-9 ${isSidebarOpen ? 'bg-black/5 dark:bg-[#1a1a1a] hover:bg-black/10 dark:hover:bg-[#222] w-[calc(100%-16px)]' : 'hover:bg-black/5 dark:hover:bg-white/10 w-[40px]'} mx-2`}>
                <div className="w-[40px] h-full flex items-center justify-center shrink-0">
                  <Search className={`w-[18px] h-[18px] shrink-0 ${isSidebarOpen ? 'text-black/70 dark:text-white/70 group-hover:text-black dark:group-hover:text-white' : 'text-black/70 dark:text-white/70'} transition-colors`} strokeWidth={2} />
                </div>
                <div className={`flex items-center transition-all duration-300 overflow-hidden whitespace-nowrap ${isSidebarOpen ? 'opacity-100 w-[160px]' : 'opacity-0 w-0'}`}>
                  <span className="text-[13px] font-bold flex-1 text-left text-black dark:text-white">Search</span>
                  <span className="text-[10px] text-black/40 dark:text-white/40 font-semibold pr-3">Ctrl+K</span>
                </div>
              </button>
            )}
            
            {/* Chat */}
            <button onClick={startNewChat} className={`group flex items-center rounded-xl transition-all duration-300 h-9 ${isSidebarOpen ? 'bg-black/10 dark:bg-[#222] hover:bg-black/15 dark:hover:bg-[#2a2a2a] w-[calc(100%-16px)]' : 'hover:bg-black/5 dark:hover:bg-white/10 w-[40px]'} mx-2`}>
              <div className="w-[40px] h-full flex items-center justify-center shrink-0">
                <Edit className={`w-[18px] h-[18px] shrink-0 ${isSidebarOpen ? 'text-black dark:text-white' : 'text-black/70 dark:text-white/70'} group-hover:text-black dark:group-hover:text-white transition-colors`} strokeWidth={2} />
              </div>
              <div className={`flex items-center transition-all duration-300 overflow-hidden whitespace-nowrap ${isSidebarOpen ? 'opacity-100 w-[160px]' : 'opacity-0 w-0'}`}>
                <span className="text-[13px] font-bold flex-1 text-left text-black dark:text-white">Chat</span>
                <span className="text-[10px] text-black/40 dark:text-white/40 font-semibold pr-3">Ctrl+J</span>
              </div>
            </button>

            {/* Voice */}
            {status === "authenticated" && (
              <button className={`group flex items-center rounded-xl transition-all duration-300 h-9 ${isSidebarOpen ? 'hover:bg-black/5 dark:hover:bg-white/5 w-[calc(100%-16px)]' : 'hover:bg-black/5 dark:hover:bg-white/10 w-[40px]'} mx-2`}>
                <div className="w-[40px] h-full flex items-center justify-center shrink-0">
                  <AudioLines className="w-[18px] h-[18px] text-black/70 dark:text-white/70 group-hover:text-black dark:group-hover:text-white shrink-0 transition-colors" strokeWidth={2} />
                </div>
                <div className={`flex items-center transition-all duration-300 overflow-hidden whitespace-nowrap ${isSidebarOpen ? 'opacity-100 w-[160px]' : 'opacity-0 w-0'}`}>
                  <span className="text-[13px] font-bold flex-1 text-left text-black dark:text-white">Voice</span>
                </div>
              </button>
            )}

            {/* Imagine */}
            {status === "authenticated" && (
              <button onClick={() => setIsImagineMode(!isImagineMode)} className={`group flex items-center rounded-xl transition-all duration-300 h-9 relative ${isImagineMode ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'hover:bg-black/5 dark:hover:bg-white/10'} ${isSidebarOpen ? 'w-[calc(100%-16px)]' : 'w-[40px]'} mx-2`}>
                <div className="w-[40px] h-full flex items-center justify-center shrink-0">
                  <ImageIcon className="w-[18px] h-[18px] shrink-0 transition-colors" strokeWidth={2} />
                </div>
                <div className={`flex items-center transition-all duration-300 overflow-hidden whitespace-nowrap ${isSidebarOpen ? 'opacity-100 w-[160px]' : 'opacity-0 w-0'}`}>
                  <span className="text-[13px] font-bold flex-1 text-left text-black dark:text-white">Imagine</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mr-3"></div>
                </div>
                {!isSidebarOpen && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>}
              </button>
            )}

            {/* Projects */}
            {status === "authenticated" && (
              <>
                <button className={`group flex items-center rounded-xl transition-all duration-300 h-9 ${isSidebarOpen ? 'hover:bg-black/5 dark:hover:bg-white/5 w-[calc(100%-16px)]' : 'hover:bg-black/5 dark:hover:bg-white/10 w-[40px]'} mx-2`}>
                  <div className="w-[40px] h-full flex items-center justify-center shrink-0">
                    <Folder className="w-[18px] h-[18px] text-black/70 dark:text-white/70 group-hover:text-black dark:group-hover:text-white shrink-0 transition-colors" strokeWidth={2} />
                  </div>
                  <div className={`flex items-center transition-all duration-300 overflow-hidden whitespace-nowrap ${isSidebarOpen ? 'opacity-100 w-[160px]' : 'opacity-0 w-0'}`}>
                    <span className="text-[13px] font-bold flex-1 text-left text-black dark:text-white">Projects</span>
                  </div>
                </button>

                {/* Sub-items */}
                <div className={`transition-all duration-300 ease-in-out overflow-hidden flex flex-col gap-2 border-l border-white/10 ml-4 ${isSidebarOpen ? 'max-h-[80px] opacity-100 mt-1.5 pl-3 py-1' : 'max-h-0 opacity-0 mt-0 pl-0 py-0 border-transparent'}`}>
                  <button className="flex items-center gap-2.5 w-full py-0.5 text-[13px] text-[#ff6b4a] hover:text-[#ff856b] transition-colors whitespace-nowrap">
                    <Bell className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                    <span className="font-semibold">New Project</span>
                  </button>
                  <button className="flex items-center gap-2 w-full py-0.5 text-[12px] text-white/50 hover:text-white/70 transition-colors whitespace-nowrap">
                    <span className="font-semibold">See all</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* History */}
          <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth flex flex-col">
            <div className="flex items-center h-9 shrink-0 pl-2">
              <div className="w-[40px] h-full flex items-center justify-center shrink-0">
                <Clock className="w-[18px] h-[18px] text-black/70 dark:text-white/70" strokeWidth={2} />
              </div>
              <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isSidebarOpen ? 'opacity-100 w-[160px]' : 'opacity-0 w-0'}`}>
                <span className="text-[13px] font-bold tracking-tight text-black dark:text-white">History</span>
              </div>
            </div>
            
            <div className={`transition-all duration-300 ease-in-out overflow-hidden flex-1 ${isSidebarOpen ? 'opacity-100 pl-4 border-l border-black/10 dark:border-white/10 ml-4 pr-1' : 'opacity-0 pl-0 border-transparent ml-0 pr-0'}`}>
              <div className="w-[180px]">
                {status === "unauthenticated" ? (
                  <div className="py-3 px-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-center">
                    <p className="text-[11px] text-black/50 dark:text-white/50 mb-2">Log in to save your chat history</p>
                    <Link href="/login" className="text-[11px] font-bold text-black dark:text-white hover:underline">Log In</Link>
                  </div>
                ) : isLoadingHistory ? (
                  <div className="flex justify-center py-4 text-black dark:text-white">
                    <Mirage size="30" speed="2.5" color="currentColor" />
                  </div>
                ) : chatHistory.length === 0 ? (
                  <p className="text-[11px] text-black/40 dark:text-white/40 italic">No history yet</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupHistoryByDate(chatHistory)).map(([label, chats]) => (
                      chats.length > 0 && (
                        <div key={label} className="space-y-1.5">
                          <div className="text-[11px] font-bold text-black/40 dark:text-white/40 pl-2">{label}</div>
                          <div className="space-y-0.5">
                            {chats.map((chat) => (
                              <div key={chat.id} className="relative group/item">
                                <button 
                                  onClick={() => loadChat(chat)}
                                  className={`w-full text-left text-[13px] font-medium truncate transition-all flex items-center gap-2 px-2.5 py-1.5 rounded-lg group ${currentChatId === chat.id ? 'bg-black/10 dark:bg-[#1a1a1a] text-black dark:text-white' : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'}`}
                                >
                                  <span className="truncate flex-1">{chat.title || "Untitled Chat"}</span>
                                </button>
                                <button 
                                  onClick={(e) => deleteChat(e, chat.id)}
                                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-black/0 dark:text-white/0 group-hover/item:text-black/40 dark:group-hover/item:text-white/40 hover:!text-red-500 transition-all rounded-md hover:bg-red-500/10"
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
          <div className={`relative mt-auto shrink-0 w-full transition-all duration-300 ease-in-out ${isSidebarOpen ? 'h-[56px]' : 'h-[88px]'}`}>
            {status === "authenticated" ? (
              <div 
                className={`absolute w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center font-medium text-sm cursor-pointer transition-all duration-300 ease-in-out ${
                  isSidebarOpen 
                    ? 'left-[12px] bottom-[12px] translate-x-0' 
                    : 'left-[12px] bottom-[48px] translate-x-0'
                }`}
                title={user?.email || ''}
              >
                {user?.displayName?.[0] || user?.email?.[0] || "J"}
              </div>
            ) : (
              <Link 
                href="/login" 
                className={`absolute w-8 h-8 rounded-full bg-white/10 text-white/50 flex items-center justify-center hover:bg-white/20 transition-all duration-300 ease-in-out ${
                  isSidebarOpen 
                    ? 'left-[12px] bottom-[12px] translate-x-0' 
                    : 'left-[12px] bottom-[48px] translate-x-0'
                }`}
              >
                <UserIcon className="w-4 h-4" />
              </Link>
            )}
            
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className={`absolute w-8 h-8 flex items-center justify-center text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-300 ease-in-out ${
                isSidebarOpen 
                  ? 'left-[calc(100%-40px)] bottom-[12px] translate-x-0' 
                  : 'left-[12px] bottom-[10px] translate-x-0'
              }`}
            >
              <ChevronsLeft className={`w-4 h-4 transition-transform duration-300 ${isSidebarOpen ? '' : 'rotate-180'}`} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 md:p-8"
          onClick={() => setPreviewImage(null)}
        >
          <button 
            className="absolute top-4 right-4 md:top-6 md:right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-50"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewImage(null);
            }}
          >
            <X className="w-6 h-6" strokeWidth={2} />
          </button>
          <div 
            className="relative max-w-full max-h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={previewImage} 
              alt="Preview" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border border-white/10"
            />
            
            {/* Watermark */}
            <div className="absolute bottom-4 right-4 opacity-30 pointer-events-none">
              <PlanetLogo className="w-8 h-8 text-white drop-shadow-lg" />
            </div>
          </div>
        </div>
      )}

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setShowApiKeyModal(false)}
        >
          <div 
            className="bg-white dark:bg-[#111111] border border-black/10 dark:border-white/10 rounded-2xl p-6 md:p-8 max-w-md w-full flex flex-col items-center text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <PlanetLogo className="w-12 h-12 mb-6 text-black dark:text-white" />
            <h2 className="text-2xl font-bold mb-3 text-black dark:text-white">API Key Required</h2>
            <p className="text-black/70 dark:text-white/70 mb-6 leading-relaxed">
              To use Veo video generation features, you need to select a paid Google Cloud API key. The current key does not have access to this model.
              <br /><br />
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 underline underline-offset-2 transition-colors">
                Learn more about billing
              </a>
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="flex-1 px-4 py-2.5 bg-black/5 dark:bg-white/10 text-black dark:text-white font-medium rounded-xl hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (window.aistudio) {
                    await window.aistudio.openSelectKey();
                    setHasApiKey(true);
                    setShowApiKeyModal(false);
                  }
                }}
                className="flex-1 px-4 py-2.5 bg-black text-white dark:bg-white dark:text-black font-semibold rounded-xl hover:opacity-90 transition-colors"
              >
                Select Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative min-w-0 bg-white dark:bg-[#000000]">
        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto premium-scrollbar">
          {/* Header */}
          <header className="sticky top-0 left-0 right-0 h-12 md:h-14 bg-white/80 dark:bg-[#000000]/80 backdrop-blur-xl z-30 flex items-center justify-between px-3 md:px-5">
            <div className="flex items-center gap-2">
              {status === "authenticated" && !isSidebarOpen && (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors md:hidden"
                >
                  <Menu className="w-4 h-4 md:w-5 md:h-5" strokeWidth={1.5} />
                </button>
              )}
              {status === "unauthenticated" && (
                <div className="flex items-center gap-2">
                  <PlanetLogo className="w-6 h-6 text-black dark:text-white" />
                  <span className="font-semibold tracking-tight text-[15px] text-black dark:text-white">Chris</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {status === "authenticated" ? (
                <>
                  <button className="p-1.5 text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
                    <MoreHorizontal className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-full text-[13px] font-medium hover:opacity-90 transition-opacity">
                    <Share className="w-3.5 h-3.5" strokeWidth={2} />
                    Share
                  </button>
                  <button onClick={startNewChat} className="p-1.5 text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors border border-black/10 dark:border-white/10">
                    <Edit className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </>
              ) : (
                <Link
                  href="/signup"
                  className="px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-full text-[13px] font-medium hover:opacity-90 transition-opacity"
                >
                  Sign Up
                </Link>
              )}
            </div>
          </header>

          <div className="px-3 md:px-8 pt-6 md:pt-8 pb-16 md:pb-20">
            <div className="max-w-3xl mx-auto w-full flex flex-col gap-6 md:gap-8">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[92%] md:max-w-[85%] px-4 py-3 md:px-5 md:py-3.5 ${
                      msg.role === 'user'
                        ? 'bg-transparent text-black dark:text-white'
                        : 'bg-transparent text-black/90 dark:text-white/90'
                    }`}
                  >
                    {msg.file && (
                      msg.role === 'ai' && msg.file.mimeType.startsWith('image/') ? (
                        <div className="mb-3 relative group w-fit cursor-pointer" onClick={() => setPreviewImage(`data:${msg.file!.mimeType};base64,${msg.file!.base64}`)}>
                          <img src={`data:${msg.file.mimeType};base64,${msg.file.base64}`} alt="Generated image" className="max-w-full rounded-2xl border border-black/10 dark:border-white/10 shadow-sm transition-transform duration-300 group-hover:scale-[1.02]" />
                          
                          {/* Watermark */}
                          <div className="absolute bottom-3 right-3 opacity-30 pointer-events-none">
                            <PlanetLogo className="w-5 h-5 text-white drop-shadow-md" />
                          </div>

                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadImageWithWatermark(msg.file!.base64, msg.file!.mimeType, msg.file!.name || 'generated-image.png');
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity backdrop-blur-md flex items-center justify-center"
                            title="Download Image"
                          >
                            <Download className="w-3.5 h-3.5" strokeWidth={2} />
                          </button>
                        </div>
                      ) : (
                        <div className="mb-2 flex items-center gap-2 p-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 w-fit">
                          {msg.file.mimeType.startsWith('image/') ? (
                            <img src={`data:${msg.file.mimeType};base64,${msg.file.base64}`} alt="attachment" className="w-10 h-10 object-cover rounded-md" />
                          ) : (
                            <div className="w-10 h-10 flex items-center justify-center bg-black/10 dark:bg-white/10 rounded-md">
                              <FileText className="w-5 h-5 text-black/70 dark:text-white/70" strokeWidth={1.5} />
                            </div>
                          )}
                          <div className="text-xs truncate max-w-[150px] opacity-80">{msg.file.name}</div>
                        </div>
                      )
                    )}
                    
                    {msg.videoUrl && (
                      <div className="mb-3 relative group w-fit">
                        <video 
                          src={msg.videoUrl} 
                          controls 
                          className="max-w-full rounded-2xl border border-black/10 dark:border-white/10 shadow-sm"
                          style={{ maxHeight: '60vh' }}
                        />
                        <a 
                          href={msg.videoUrl} 
                          download="generated-video.mp4"
                          className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity backdrop-blur-md flex items-center justify-center"
                          title="Download Video"
                        >
                          <Download className="w-3.5 h-3.5" strokeWidth={2} />
                        </a>
                      </div>
                    )}
                    
                    {msg.role === 'ai' && msg.isThinking && (
                      <div className="flex items-center gap-1.5 mb-2 text-[11px] font-medium text-black/50 dark:text-white/50 bg-black/5 dark:bg-white/5 w-fit px-2.5 py-1 rounded-full border border-black/5 dark:border-white/5">
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
                        {msg.text}
                      </Markdown>
                    </div>

                    {msg.role === 'ai' && msg.groundingChunks && msg.groundingChunks.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-black/10 dark:border-white/10">
                        <div className="flex items-center gap-2 text-xs font-medium text-black/50 dark:text-white/50 mb-3">
                          <Globe className="w-3.5 h-3.5" strokeWidth={1.5} />
                          Sources & Locations
                        </div>
                        
                        {/* Map Embeds */}
                        {msg.groundingChunks.some((c: any) => c.maps) && (
                          <div className="flex overflow-x-auto gap-3 pb-3 mb-2 snap-x scrollbar-thin scrollbar-thumb-black/10 dark:scrollbar-thumb-white/10 scrollbar-track-transparent">
                            {msg.groundingChunks.filter((c: any) => c.maps).map((chunk: any, i: number) => {
                              const title = chunk.maps.title;
                              const uri = chunk.maps.uri;
                              if (!title) return null;
                              return (
                                <div key={`map-${i}`} className="shrink-0 w-[280px] sm:w-[320px] rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 snap-center flex flex-col">
                                  <iframe
                                    width="100%"
                                    height="180"
                                    style={{ border: 0 }}
                                    loading="lazy"
                                    allowFullScreen
                                    referrerPolicy="no-referrer-when-downgrade"
                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(title)}&output=embed`}
                                  ></iframe>
                                  <div className="p-3 flex flex-col gap-1">
                                    <div className="font-medium text-sm text-black dark:text-white truncate">{title}</div>
                                    <div className="flex items-center justify-between mt-1">
                                      <a href={uri} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 hover:underline flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        View on Google Maps
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Web Sources */}
                        {msg.groundingChunks.some((c: any) => c.web) && (
                          <div className="flex flex-wrap gap-2">
                            {msg.groundingChunks.filter((c: any) => c.web).map((chunk: any, i: number) => {
                              const uri = chunk.web?.uri;
                              const title = chunk.web?.title;
                              if (!uri) return null;
                              return (
                                <a
                                  key={`web-${i}`}
                                  href={uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/5 dark:border-white/5 text-xs text-black/70 dark:text-white/70 transition-colors max-w-[200px]"
                                >
                                  <span className="truncate">{title || new URL(uri).hostname}</span>
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                    {msg.role === 'ai' && (
                      <div className="flex flex-col gap-3 mt-3 w-full">
                        <div className="flex items-center gap-1 text-black/40 dark:text-white/40">
                          <button 
                            onClick={() => {
                              // Placeholder for regenerate logic
                              addToast('Regeneration not implemented yet', 'info');
                            }}
                            className="p-1 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors" 
                            title="Regenerate"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => addToast('Reading aloud...', 'info')}
                            className="p-1 hover:text-white hover:bg-white/5 rounded-md transition-colors" 
                            title="Read Aloud"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(msg.text);
                              addToast('Message copied to clipboard', 'success');
                            }}
                            className="p-1 hover:text-white hover:bg-white/5 rounded-md transition-colors" 
                            title="Copy"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => {
                              addToast('Share link copied', 'success');
                            }}
                            className="p-1 hover:text-white hover:bg-white/5 rounded-md transition-colors" 
                            title="Share"
                          >
                            <Share className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => addToast('Thanks for the feedback!', 'success')}
                            className="p-1 hover:text-white hover:bg-white/5 rounded-md transition-colors" 
                            title="Good Response"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => addToast('Thanks for the feedback!', 'success')}
                            className="p-1 hover:text-white hover:bg-white/5 rounded-md transition-colors" 
                            title="Bad Response"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                          <button className="p-1 hover:text-white hover:bg-white/5 rounded-md transition-colors" title="More Options">
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[10px] ml-1.5 opacity-50">1.1s</span>
                          <span className="text-[10px] opacity-50">Fast</span>
                        </div>
                        

                      </div>
                    )}
                  </div>
                </div>
              ))}
            {isGenerating && (
              <div className="flex items-start justify-start w-full py-8 px-4 md:px-5 text-black dark:text-white">
                <Mirage
                  size="60"
                  speed="2.5"
                  color="currentColor" 
                />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
        </div>

        {/* Input Dock */}
        <div className="shrink-0 relative z-20 bg-gradient-to-t from-white dark:from-[#000000] from-40% to-transparent pt-8 pb-4 md:pb-6 px-4 md:px-6 -mt-8">
          <div className="max-w-4xl mx-auto w-full flex flex-col items-center gap-3">
            <div className={`w-full max-w-[760px] relative bg-neutral-100 dark:bg-[#121212] border border-black/10 dark:border-white/10 rounded-[28px] px-3 py-2 shadow-lg transition-colors focus-within:border-black/20 dark:focus-within:border-white/20 focus-within:bg-white dark:focus-within:bg-[#121212] flex flex-col gap-1.5 group ${attachedFile ? 'rounded-[20px]' : ''}`}>
              
              {/* Attached File Preview */}
              {attachedFile && (
                <div className="mb-1 flex items-center gap-3 px-2">
                  <div className="relative group/file">
                    {attachedFile.mimeType.startsWith('image/') ? (
                      <img src={`data:${attachedFile.mimeType};base64,${attachedFile.base64}`} alt="preview" className="w-10 h-10 md:w-12 md:h-12 object-cover rounded-xl border border-black/10 dark:border-white/10" />
                    ) : (
                      <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-xl border border-black/10 dark:border-white/10">
                        <FileText className="w-4 h-4 md:w-5 md:h-5 text-black/50 dark:text-white/50" strokeWidth={1.5} />
                      </div>
                    )}
                    <button
                      onClick={removeFile}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-white dark:bg-[#222] border border-black/20 dark:border-white/20 rounded-full flex items-center justify-center md:opacity-0 md:group-hover/file:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5 text-black dark:text-white" strokeWidth={2} />
                    </button>
                  </div>
                  <div className="text-xs text-black/50 dark:text-white/50 truncate max-w-[150px] md:max-w-[200px]">{attachedFile.name}</div>
                </div>
              )}

              <div className="flex items-end gap-2 w-full pl-1 pr-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,.pdf,.txt"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 mb-0.5 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors shrink-0"
                  title="Attach File"
                >
                  <Paperclip className="w-4 h-4" strokeWidth={1.5} />
                </button>

                <textarea
                  ref={textareaRef as any}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Reply to Chris..."
                  className="flex-1 bg-transparent resize-none outline-none text-[15px] placeholder:text-black/30 dark:placeholder:text-white/30 min-h-[20px] max-h-[200px] text-black dark:text-white no-scrollbar py-1.5"
                  rows={1}
                />

                <div className="flex items-center gap-1.5 shrink-0 mb-0.5">
                  {/* Model Selector */}
                  {status === "authenticated" && (
                    <div className="relative hidden sm:block" ref={modelDropdownRef}>
                      <button
                        onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-[#1a1a1a] hover:bg-neutral-100 dark:hover:bg-[#222] border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 transition-all cursor-pointer text-[11px] font-medium text-black/80 dark:text-white/80 hover:text-black dark:hover:text-white group"
                      >
                        <span className="text-blue-600 dark:text-blue-400 group-hover:text-blue-500 dark:group-hover:text-blue-300 transition-colors">
                          <Rocket className="w-3 h-3" strokeWidth={2} />
                        </span>
                        <span>
                          {freeModels.find(m => m.id === selectedModel)?.name || 'Auto'}
                        </span>
                        <ChevronDown className={`w-2.5 h-2.5 text-black/40 dark:text-white/40 transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Dropdown Menu */}
                      {isModelDropdownOpen && (
                        <div className="absolute bottom-full right-0 mb-2 w-48 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                          <div className="p-1">
                            <div className="px-3 py-2 text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-wider">
                              Model Selection
                            </div>
                            {freeModels.map((model) => (
                              <button
                                key={model.id}
                                onClick={() => {
                                  setSelectedModel(model.id);
                                  setIsModelDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                                  selectedModel === model.id
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                                    : 'text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white'
                                }`}
                              >
                                <span>{model.name}</span>
                                {selectedModel === model.id && (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {status === "authenticated" && <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-0.5 hidden sm:block"></div>}

                  {status === "authenticated" && (
                    <button 
                      onClick={toggleListening}
                      className={`p-1.5 rounded-full transition-colors ${isListening ? 'text-red-500 bg-red-500/10 animate-pulse' : 'text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}
                      title="Voice Dictation"
                    >
                      <Mic className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  )}

                  <button 
                    onClick={handleSubmit}
                    disabled={(!input?.trim() && !attachedFile) || isGenerating}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                      (!input?.trim() && !attachedFile) || isGenerating
                        ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed' 
                        : 'bg-black dark:bg-white text-white dark:text-black hover:scale-105 shadow-sm'
                    }`}
                    title={(!input?.trim() && !attachedFile) ? (status === "authenticated" ? "Voice Mode" : "Send Message") : "Send Message"}
                  >
                    {(!input?.trim() && !attachedFile && status === "authenticated") ? (
                      <AudioLines className="w-4 h-4" strokeWidth={2} />
                    ) : (
                      <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Mode Toggles */}
            {status === "authenticated" && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-1 px-2 pb-1 overflow-x-auto no-scrollbar w-full max-w-[760px]">
                <button 
                  onClick={() => setIsDeepSearchMode(!isDeepSearchMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 text-[12px] font-medium border cursor-pointer ${isDeepSearchMode ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400' : 'bg-transparent border-black/10 dark:border-white/10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}
                >
                  <Globe className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Search</span>
                </button>
                <button 
                  onClick={() => setIsThinkMode(!isThinkMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 text-[12px] font-medium border cursor-pointer ${isThinkMode ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-transparent border-black/10 dark:border-white/10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}
                >
                  <BrainCircuit className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Think</span>
                </button>
                <button 
                  onClick={() => setIsMapsMode(!isMapsMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 text-[12px] font-medium border cursor-pointer ${isMapsMode ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400' : 'bg-transparent border-black/10 dark:border-white/10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}
                >
                  <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Maps</span>
                </button>
                <button 
                  onClick={() => setIsImagineMode(!isImagineMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 text-[12px] font-medium border cursor-pointer ${isImagineMode ? 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400' : 'bg-transparent border-black/10 dark:border-white/10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}
                >
                  <ImageIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Imagine</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setShowAuthModal(false)}
        >
          <div 
            className="bg-white dark:bg-[#111111] border border-black/10 dark:border-white/10 rounded-2xl p-6 md:p-8 max-w-md w-full flex flex-col items-center text-center shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <PlanetLogo className="w-12 h-12 mb-6 text-black dark:text-white" />
            <h2 className="text-2xl font-bold mb-3 text-black dark:text-white">Sign in to unlock</h2>
            <p className="text-black/70 dark:text-white/70 mb-6 leading-relaxed">
              To use advanced features like image generation, deep search, voice input, and maps, please sign in or create an account.
            </p>
            <div className="flex flex-col gap-3 w-full">
              <Link
                href="/login"
                onClick={() => setShowAuthModal(false)}
                className="w-full px-4 py-3 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-xl hover:bg-black/90 dark:hover:bg-white/90 transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                onClick={() => setShowAuthModal(false)}
                className="w-full px-4 py-3 bg-black/10 dark:bg-white/10 text-black dark:text-white font-medium rounded-xl hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
              >
                Sign Up
              </Link>
              <button
                onClick={() => setShowAuthModal(false)}
                className="mt-2 text-sm text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
