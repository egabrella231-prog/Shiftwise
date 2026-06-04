import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/generative-ai';

// -------------------------------------------------------------------------
// Types & Interfaces
// -------------------------------------------------------------------------
interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export default function AIAssistant() {
  // -------------------------------------------------------------------------
  // State Initialization
  // -------------------------------------------------------------------------
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: "Awe my friend! 🇳🇦 I'm your ShiftWise Roster AI Assistant. Tell me how many people you want to schedule or what roster adjustments you need, and I will handle the layout options for you! Sharp sharp!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatError, setChatError] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------------------
  // Automatic Scroll-to-Bottom Effect
  // -------------------------------------------------------------------------
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // -------------------------------------------------------------------------
  // Core AI Prompt Handler (Direct Google AI Studio SDK Integration)
  // -------------------------------------------------------------------------
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setChatError(false);
    const userPrompt = input.trim();
    setInput('');

    // Append User Prompt to Chat Interface instantly
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userPrompt,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Secure extraction of Google AI Studio credentials from env build scope
    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

    if (!GEMINI_API_KEY) {
      console.error("ShiftWise Core Guard Flag: VITE_GEMINI_API_KEY environment token missing from client workspace build variables context.");
      setTimeout(() => {
        setIsLoading(false);
        setChatError(true);
      }, 800);
      return;
    }

    try {
      // Direct client-side invocation eliminating proxy routing bottlenecks (404/502/CORS bugs)
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: userPrompt,
        config: {
          systemInstruction: 
            "You are an expert Namibian security guard roster scheduling assistant for the platform 'ShiftWise Namibia'. " +
            "Your job is to assist managers with building monthly security rosters, calculations, shift balancing, and distribution planning. " +
            "Be extremely polite, clear, professional, and weave in local Namibian friendly jargon naturally (e.g., 'Sharp sharp!', 'Awe my friend!', 'Lekker!', 'Chommie'). " +
            "Keep safety rules intact: maintain absolute data privacy compliance at all stages, as our architecture is completely browser-memory execution only with no database logging of guard records.",
        },
      });

      const replyText = response.text || "I processed your request but returned an empty response. Let's try restructuring the prompt context.";

      // Append verified AI model feedback message straight to local display stream state
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Google AI Studio connection fallback loop triggered:", error);
      setChatError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render Workspace View Interface
  // -------------------------------------------------------------------------
  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-5xl mx-auto bg-slate-50 rounded-xl shadow-inner border border-slate-200 overflow-hidden my-4">
      {/* Dynamic Diagnostic Failure Alert Canvas Section */}
      {chatError && (
        <div className="bg-amber-50 border-b border-amber-200 p-4 animate-fadeIn transition-all duration-300">
          <div className="flex items-start space-x-3">
            <span className="text-xl">🇳🇦</span>
            <div>
              <h4 className="text-sm font-semibold text-amber-900">Connection Interruption Encountered</h4>
              <p className="text-xs text-amber-700 mt-1">
                Awe my friend! I had a problem connecting to my server. Please make sure the backend dev server is running, your environment variables (<code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono text-[11px]">VITE_GEMINI_API_KEY</code>) are updated on Vercel, and your connection is online, then try again! Sharp sharp!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Primary Message Log Workspace Window */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl p-4 shadow-sm text-sm whitespace-pre-wrap leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-slate-900 text-white rounded-br-none'
                  : 'bg-slate-100 text-slate-900 rounded-bl-none border border-slate-200/60'
              }`}
            >
              <div className="font-semibold text-[11px] uppercase tracking-wider mb-1 opacity-60">
                {msg.sender === 'user' ? 'Roster Manager' : 'ShiftWise AI Engine'}
              </div>
              <p>{msg.text}</p>
              <span className="block text-[10px] text-right mt-2 opacity-40">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {/* Streaming Animation Indicators */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 text-slate-500 rounded-2xl rounded-bl-none p-4 border border-slate-200/60 shadow-sm text-sm flex items-center space-x-2">
              <span className="text-xs font-medium italic animate-pulse">AI is organizing your shift matrices...</span>
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Prompt Submission Form Field Module */}
      <form
        onSubmit={handleSendMessage}
        className="p-4 bg-slate-50 border-t border-slate-200 flex items-center space-x-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g., Generate a 3-guard shift layout for ten days..."
          disabled={isLoading}
          className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-400 transition-all shadow-sm"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm px-5 py-3 rounded-xl shadow transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center space-x-1 whitespace-nowrap"
        >
          <span>Ask AI</span>
        </button>
      </form>
    </div>
  );
}