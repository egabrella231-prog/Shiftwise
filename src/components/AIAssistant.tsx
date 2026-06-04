import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Bot, Send, Mic, MicOff, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export default function AIAssistant() {
  const { 
    rosters, 
    employees, 
    currentMonth, 
    executeAutoFill, 
    executeClearAll, 
    executeClearEmployee, 
    executeSetDayOfWeek, 
    saveRosterDoc 
  } = useApp();

  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Awe my friend! 🇳🇦 I am your ShiftWise Namibia AI Assistant. You can speak to me or type your request. Ask me to auto-fill, clear, set shifts for anyone, or ask who has the most hours! How is it today? Let's make scheduling lekkerrr!",
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const shouldBeListeningRef = useRef<boolean>(false);
  const listenStartRef = useRef<number | null>(null);
  const restartTimerRef = useRef<any>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Setup Web Speech API for Voice Input
  useEffect(() => {
    const SpeechRecognition = 
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-ZA'; // Closest English accent supported for southern Africa

      rec.onstart = () => {
        setIsListening(true);
        setRecognitionError(null);
      };

      rec.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setPrompt(prev => {
            const trimmed = prev.trim();
            const trimmedFinal = finalTranscript.trim();
            return trimmed ? `${trimmed} ${trimmedFinal}` : trimmedFinal;
          });
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === 'no-speech') {
          // Ignore no-speech error during active continuous sessions
          console.log("No speech detected, continuing listening session...");
        } else {
          setRecognitionError("Microphone error. Try typing instead.");
          shouldBeListeningRef.current = false;
          setIsListening(false);
        }
      };

      rec.onend = () => {
        if (shouldBeListeningRef.current) {
          const elapsed = Date.now() - (listenStartRef.current || 0);
          if (elapsed < 30000) {
            try {
              rec.start();
              return;
            } catch (err) {
              console.error("Auto-restart failed:", err);
            }
          }
        }
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice recognition is not supported in this browser. Please use Chrome or Safari.");
      return;
    }

    if (isListening) {
      shouldBeListeningRef.current = false;
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
      }
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error("Stop speech failed:", err);
      }
      setIsListening(false);
    } else {
      setRecognitionError(null);
      shouldBeListeningRef.current = true;
      listenStartRef.current = Date.now();

      // Ensure the mic turns off after 30 seconds
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
      }
      restartTimerRef.current = setTimeout(() => {
        if (shouldBeListeningRef.current) {
          shouldBeListeningRef.current = false;
          try {
            recognitionRef.current.stop();
          } catch (err) {
            console.error("Final timeout stop speech failed:", err);
          }
          setIsListening(false);
        }
      }, 30000);

      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Start speech failed:", err);
      }
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isTyping) return;

    const userMsgText = prompt;
    setPrompt('');
    
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: userMsgText,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMsg]);
    setIsTyping(true);

    try {
      // Determine the API Gateway base URL dynamically based on current deployment landscape page
      const getApiBaseUrl = (): string => {
        const meta = import.meta as any;
        if (meta.env?.VITE_API_BASE_URL) {
          return meta.env.VITE_API_BASE_URL;
        }
        if (meta.env?.VITE_API_URL) {
          return meta.env.VITE_API_URL;
        }

        const hostname = window.location.hostname;
        // If checking from static deployment like Vercel, route back gracefully to Cloud Run backend Preview gateway
        if (hostname.includes("vercel.app") || hostname.includes("github.io")) {
          return "https://ais-pre-wiep5afrjglchrlc3vop3z-675377096788.europe-west2.run.app";
        }
        return "";
      };

      const apiBase = getApiBaseUrl();

      // Direct call to our backend API route
      const response = await fetch(`${apiBase}/api/gemini/roster-assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsgText,
          currentMonth,
          employees,
          rosterState: rosters
        })
      });

      let data: any;
      try {
        data = await response.json();
      } catch (err) {
        // Body was not JSON
      }

      if (!response.ok) {
        const errorText = data?.reply || `Server returned status ${response.status}. Please check your connection.`;
        throw new Error(errorText);
      }

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: data.reply,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMsg]);

      // Execute returned roster commands
      if (data.actions && data.actions.length > 0) {
        for (const action of data.actions) {
          switch (action.type) {
            case 'auto_fill':
              await executeAutoFill();
              break;
            case 'clear_all':
              await executeClearAll();
              break;
            case 'clear_employee':
              if (action.employeeId) {
                await executeClearEmployee(action.employeeId);
              }
              break;
            case 'set_day_of_week':
              if (action.dayOfWeek && action.shiftType) {
                await executeSetDayOfWeek(action.dayOfWeek, action.shiftType as any);
              }
              break;
            case 'set_shift':
              if (action.employeeId && action.days && action.shiftType) {
                const currentRoster = rosters[action.employeeId] || {
                  id: `${action.employeeId}_${currentMonth}`,
                  employee_id: action.employeeId,
                  company_id: employees.find(emp => emp.id === action.employeeId)?.company_id || "",
                  month: currentMonth,
                  shifts: {},
                  updated_at: new Date().toISOString()
                };
                
                const updatedShifts = { ...currentRoster.shifts };
                action.days.forEach((day: number) => {
                  updatedShifts[String(day)] = action.shiftType as any;
                });
                
                await saveRosterDoc(action.employeeId, updatedShifts);
              }
              break;
            default:
              console.warn("Unknown AI actions:", action);
          }
        }
      }

    } catch (error) {
      console.error("AI Assistant error:", error);
      const isFetchError = error instanceof Error && error.message.toLowerCase().includes("fetch");
      const textMessage = isFetchError
        ? "Awe my friend! 🇳🇦 I had a problem connecting to my server. Please make sure the backend dev server is running and your connection is online, then try again! Sharp sharp!"
        : (error instanceof Error ? error.message : "Sorry my friend, I had a small service error. Please try again! Sharp sharp!");
      
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: textMessage,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[550px] bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {/* Bot Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600/50 p-2 rounded-xl border border-blue-400/20">
            <Bot className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold tracking-tight text-white flex items-center gap-1.5 text-base">
              Roster AI Assistant <Sparkles className="h-4 w-4 text-amber-400" />
            </h3>
            <p className="text-xs text-blue-200">Friendly Namibian English specialist</p>
          </div>
        </div>
        <div className="text-xs bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 font-semibold px-2 py-1 rounded-full flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Gemini 3.5 Flash
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start gap-2.5 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.sender === 'assistant' && (
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200 shrink-0">
                  <Bot className="h-4 w-4 text-blue-700" />
                </div>
              )}
              
              <div
                className={`p-3.5 rounded-2xl shadow-xs text-sm ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none font-medium'
                    : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                }`}
              >
                <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>
                <span
                  className={`block text-[10px] mt-1 text-right ${
                    msg.sender === 'user' ? 'text-blue-200' : 'text-gray-400'
                  }`}
                >
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-start gap-2.5">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200 shrink-0">
                <RefreshCw className="h-4 w-4 text-blue-700 animate-spin" />
              </div>
              <div className="p-4 bg-white text-gray-500 rounded-2xl rounded-tl-none border border-gray-100 text-xs">
                <div className="flex space-x-1.5 items-center">
                  <div className="h-2 w-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="h-2 w-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="h-2 w-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  <span className="ml-1 select-none">Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice Warning feedback */}
      {recognitionError && (
        <div className="bg-amber-50 border-t border-amber-100 text-amber-800 px-4 py-2 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 grow-0 shrink-0" />
          <span>{recognitionError}</span>
        </div>
      )}

      {/* Quick Action Suggestions helper */}
      <div className="p-2 bg-white border-t border-gray-100 overflow-x-auto flex space-x-2 scrollbar-none">
        <button
          onClick={() => setPrompt("Auto-fill the roster")}
          className="text-xs bg-gray-50 border border-gray-200 hover:border-blue-500 hover:text-blue-600 text-gray-600 px-3 py-1.5 rounded-full whitespace-nowrap transition cursor-pointer"
        >
          ✨ Auto-fill
        </button>
        <button
          onClick={() => setPrompt("Give everyone Sunday off this month")}
          className="text-xs bg-gray-50 border border-gray-200 hover:border-blue-500 hover:text-blue-600 text-gray-600 px-3 py-1.5 rounded-full whitespace-nowrap transition cursor-pointer"
        >
          🌅 Sunday Off
        </button>
        <button
          onClick={() => setPrompt("Who has the most hours this month?")}
          className="text-xs bg-gray-50 border border-gray-200 hover:border-blue-500 hover:text-blue-600 text-gray-600 px-3 py-1.5 rounded-full whitespace-nowrap transition cursor-pointer"
        >
          ⏱️ Most Hours?
        </button>
        <button
          onClick={() => setPrompt("Clear all shifts")}
          className="text-xs bg-gray-50 border border-gray-200 hover:border-blue-500 hover:text-blue-600 text-gray-600 px-3 py-1.5 rounded-full whitespace-nowrap transition cursor-pointer text-rose-600"
        >
          🗑️ Clear All
        </button>
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleListening}
          className={`p-3 rounded-full transition relative grow-0 shrink-0 cursor-pointer ${
            isListening 
              ? 'bg-rose-100 text-rose-600 hover:bg-rose-200 animate-pulse' 
              : 'bg-gray-100 text-gray-500 hover:bg-gray-250 hover:text-gray-700'
          }`}
          title="Voice input (Namibian accent ready)"
        >
          {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          {isListening && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
          )}
        </button>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={isListening ? "Listening... speak now" : "Ask me anything (e.g. 'Give Maria night shifts first week')"}
          rows={2}
          className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-600 bg-gray-50 focus:bg-white transition resize-none leading-relaxed"
        />

        <button
          type="submit"
          disabled={!prompt.trim() || isTyping}
          className="p-3 rounded-full bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white transition grow-0 shrink-0 cursor-pointer shadow-xs"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
