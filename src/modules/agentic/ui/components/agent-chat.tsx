"use client";
import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, ShieldCheck, Search, BookOpen, BrainCircuit, CheckCircle2, Loader2, Paperclip } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css"; // Styles for math
import { useProModal } from "@/hooks/use-pro-modal";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  metrics?: Record<string, any>;
  nodeStates?: { node: string; state: any }[];
};

const NODE_ICONS: Record<string, React.ReactNode> = {
  guardrails: <ShieldCheck className="w-4 h-4 text-emerald-500" />,
  rewrite: <BrainCircuit className="w-4 h-4 text-blue-500" />,
  route: <Search className="w-4 h-4 text-purple-500" />,
  fetch_context: <BookOpen className="w-4 h-4 text-orange-500" />,
  rag_answer: <Bot className="w-4 h-4 text-indigo-500" />,
  evaluate_ragas: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  summarize_memory: <BookOpen className="w-4 h-4 text-yellow-500" />,
};

const NODE_LABELS: Record<string, string> = {
  guardrails: "Safety Check",
  rewrite: "Query Optimization",
  route: "Routing Query",
  fetch_context: "Retrieving Knowledge",
  rag_answer: "Synthesizing Answer",
  evaluate_ragas: "Evaluating Quality",
  summarize_memory: "Compressing Memory",
};

// Instant Text Display Component (No streaming sensation, no hyperlinks, no raw file URLs)
const TypewriterMarkdown = ({ content }: { content: string }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        a: ({ node, ...props }) => (
          <span className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-lg my-0.5 border border-indigo-200 dark:border-indigo-800/40 text-xs">
            📌 {props.children || "Source Reference"}
          </span>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

interface AgentChatProps {
  agentMetadata: string;
  agentId: string;
}

export function AgentChat({ agentMetadata, agentId }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0); // Track free tier messages
  const [isUploading, setIsUploading] = useState(false);
  const proModal = useProModal();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeMessage, setActiveMessage] = useState<Message | null>(null);
  const activeMessageRef = useRef<Message | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeMessage]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // 1. Get Presigned URL
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });

      if (res.status === 403) {
        proModal.onOpen("uploads" as any);
        return;
      }

      if (!res.ok) throw new Error("Failed to get upload URL");
      
      const { presignedUrl, document } = await res.json();

      // 2. Upload directly to R2
      const uploadRes = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) throw new Error("Failed to upload to Cloudflare R2");

      // Successfully uploaded! Tell the user
      const userMessage: Message = { 
        id: Date.now().toString(), 
        role: "user", 
        content: `I have uploaded a file: ${file.name}.` 
      };
      setMessages((prev) => [...prev, userMessage]);
      scrollToBottom();
      
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (messageCount >= 20) {
      proModal.onOpen("messages" as any);
      return;
    }

    setMessageCount((prev) => prev + 1);

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const activeId = (Date.now() + 1).toString();
    const initialActive = {
      id: activeId,
      role: "assistant" as const,
      content: "",
      nodeStates: [],
    };
    setActiveMessage(initialActive);
    activeMessageRef.current = initialActive;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_AGENTIC_API_URL || "http://localhost:8001";
      const response = await fetch(`${apiUrl}/api/v1/agent/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: userMessage.content, 
          session_id: `agent_${agentId}`,
          agent_metadata: agentMetadata
        }),
      });

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "");
            if (!dataStr.trim()) continue;
            
            try {
              const data = JSON.parse(dataStr);
              if (data.done) {
                break;
              }

              setActiveMessage((prev) => {
                if (!prev) return prev;
                
                let newContent = prev.content;
                if (data.state?.answer) {
                  newContent = data.state.answer;
                }

                let newMetrics = prev.metrics;
                if (data.node === "evaluate_ragas" && data.state?.eval_metrics) {
                  newMetrics = data.state.eval_metrics;
                }

                const newNodes = (prev.nodeStates || []).filter(ns => ns.node !== data.node);
                newNodes.push({ node: data.node, state: data.state });

                const newState = {
                  ...prev,
                  content: newContent,
                  metrics: newMetrics,
                  nodeStates: newNodes
                };
                
                activeMessageRef.current = newState;
                return newState;
              });
            } catch (e) {
              console.error("Error parsing chunk", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setActiveMessage((prev) => {
        const newState = prev ? { ...prev, content: "Error connecting to the agent." } : null;
        activeMessageRef.current = newState;
        return newState;
      });
    } finally {
      setIsLoading(false);
      
      const finalMessage = activeMessageRef.current;
      if (finalMessage) {
        setMessages((msgs) => {
          if (msgs.some(m => m.id === finalMessage.id)) return msgs;
          return [...msgs, finalMessage];
        });
      }
      
      setActiveMessage(null);
      activeMessageRef.current = null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full w-full">
      <div className={`flex flex-col h-full bg-slate-50 dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all duration-300 w-full`}>
        <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <BrainCircuit className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Agentic Research</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Deep Retrieval & Evaluated Reasoning</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6 p-4">
          {messages.length === 0 && !activeMessage && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h2 className="text-xl font-medium text-slate-700 dark:text-slate-300">How can I assist your research today?</h2>
              <p className="text-slate-500 max-w-md text-sm">Our multi-agent system uses RAG to fetch internal knowledge, evaluates answers in real-time, and guarantees safety via NeMo Guardrails.</p>
            </div>
          )}

          <AnimatePresence>
            {[...messages, activeMessage].filter(Boolean).map((msg) => (
              <motion.div
                key={msg!.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 ${msg!.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg!.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
                
                <div className={`max-w-[85%] ${msg!.role === "user" ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl rounded-tr-sm px-5 py-3" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-sm p-5 shadow-sm"}`}>
                  
                  {msg!.role === "user" && <p className="text-[15px] leading-relaxed">{msg!.content}</p>}

                  {msg!.role === "assistant" && (
                    <div className="space-y-4 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
                      
                      {msg!.nodeStates && msg!.nodeStates.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800/50">
                          {msg!.nodeStates.map((ns, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                              {NODE_ICONS[ns.node] || <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                              <span>{NODE_LABELS[ns.node] || ns.node}</span>
                              {idx < msg!.nodeStates!.length - 1 && <span className="text-slate-300 dark:text-slate-700 mx-1">→</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      {msg!.content ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <TypewriterMarkdown content={msg!.content} />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processing workflow...</span>
                        </div>
                      )}

                    </div>
                  )}
                </div>

                {msg!.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        <div className="relative m-4">
          {/* Premium Gradient Aura Behind Input */}
          <div 
            className="absolute -inset-1.5 bg-cover bg-center rounded-full opacity-60 dark:opacity-40 blur-md pointer-events-none transition-opacity duration-300"
            style={{ backgroundImage: "url('/grads/EdClarity-chat-gradient.png')" }}
          />
          
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploading}
              className="absolute left-1.5 top-1.5 bottom-1.5 aspect-square flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message agent..."
              className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-300/50 dark:border-slate-700/50 rounded-full py-3 pl-12 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent dark:text-white shadow-sm transition-all"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300/80 dark:disabled:bg-slate-800/80 text-white rounded-full transition-colors shadow-sm"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}
