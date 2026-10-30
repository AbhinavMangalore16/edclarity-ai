"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, ShieldCheck, Search, BookOpen, BrainCircuit, CheckCircle2, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css"; // Styles for math
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Cell } from "recharts";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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

// Authentic Word-by-Word Streaming Effect for LLM Answers
const TypewriterMarkdown = ({ content }: { content: string }) => {
  const [displayed, setDisplayed] = useState("");
  const contentRef = useRef(content);

  useEffect(() => {
    // If content changes (e.g. from empty to full string), start typing
    if (content !== contentRef.current) {
      contentRef.current = content;
      setDisplayed(""); // Reset
    }

    if (!content) return;

    let currentLength = displayed.length;
    if (currentLength >= content.length) {
      setDisplayed(content);
      return;
    }

    const interval = setInterval(() => {
      currentLength += Math.max(1, Math.floor(content.length / 50)); // Adaptive speed based on length
      if (currentLength >= content.length) {
        clearInterval(interval);
        setDisplayed(content);
      } else {
        setDisplayed(content.substring(0, currentLength));
      }
    }, 15);

    return () => clearInterval(interval);
  }, [content, displayed.length]);

  return (
    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
      {displayed}
    </ReactMarkdown>
  );
};

export default function ResearchPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [clarityMode, setClarityMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Track active streaming message
  const [activeMessage, setActiveMessage] = useState<Message | null>(null);
  const activeMessageRef = useRef<Message | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

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
      const response = await fetch("http://localhost:8000/api/v1/agent/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMessage.content, session_id: "dashboard_session" }),
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

                // Prevent duplicate nodes in the visual pipeline
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
        const newState = prev ? { ...prev, content: "Error connecting to the research agent." } : null;
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

  const latestMessageWithMetrics = [...messages, activeMessage]
    .filter(Boolean)
    .reverse()
    .find((m) => m!.metrics && Object.keys(m!.metrics).length > 0);

  // Safely extract chart data, handling potential NaN or missing values
  const chartData = latestMessageWithMetrics?.metrics && !latestMessageWithMetrics.metrics.error
    ? [
        { subject: "Faithfulness", A: (latestMessageWithMetrics.metrics.faithfulness ?? 0) * 100 },
        { subject: "Relevancy", A: (latestMessageWithMetrics.metrics.answer_relevancy ?? 0) * 100 },
        { subject: "Precision", A: (latestMessageWithMetrics.metrics.context_precision ?? 0) * 100 },
        { subject: "Recall", A: (latestMessageWithMetrics.metrics.context_recall ?? 0) * 100 },
      ].filter((d) => !isNaN(d.A))
    : [];

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-2rem)] max-w-7xl mx-auto p-4 md:p-6 my-4 w-full">
      <div className={`flex flex-col h-full bg-slate-50 dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all duration-300 ${clarityMode ? 'w-full lg:w-2/3' : 'w-full max-w-4xl mx-auto'}`}>
        <div className="flex items-center justify-between gap-3 mb-4 p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <BrainCircuit className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Agentic Research</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Deep Retrieval & Evaluated Reasoning</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <Sparkles className={`w-4 h-4 ${clarityMode ? 'text-indigo-500' : 'text-slate-400'}`} />
             <Label htmlFor="clarity-mode" className="text-sm font-medium cursor-pointer">Clarity Mode</Label>
             <Switch id="clarity-mode" checked={clarityMode} onCheckedChange={setClarityMode} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6 px-6">
          {messages.length === 0 && !activeMessage && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h2 className="text-xl font-medium text-slate-700 dark:text-slate-300">How can I assist your research today?</h2>
              <p className="text-slate-500 max-w-md">Our multi-agent system uses RAG to fetch internal knowledge, evaluates answers in real-time, and guarantees safety via NeMo Guardrails.</p>
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
                        <div className="flex items-center gap-2 text-slate-500">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processing workflow...</span>
                        </div>
                      )}

                      {!clarityMode && msg!.metrics && Object.keys(msg!.metrics).length > 0 && !msg!.metrics.error && (
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <div className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Ragas Evaluation</div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {['faithfulness', 'answer_relevancy', 'context_precision', 'context_recall'].map(metric => {
                              if (msg!.metrics![metric] === undefined) return null;
                              const val = msg!.metrics![metric];
                              const displayVal = typeof val === 'number' ? `${(val * 100).toFixed(0)}%` : val;
                              return (
                                <div key={metric} className="bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-100 dark:border-slate-800 text-center">
                                  <div className="text-[10px] text-slate-500 capitalize">{metric.replace('_', ' ')}</div>
                                  <div className={`text-sm font-semibold mt-0.5 ${typeof val === 'number' && val > 0.8 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                    {displayVal}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      
                      {!clarityMode && msg!.metrics?.error && (
                         <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 rounded-lg text-xs text-red-600 dark:text-red-400">
                            <strong>Evaluation Error:</strong> {msg!.metrics.error}
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

        <form onSubmit={handleSubmit} className="m-6 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a research question..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-full py-4 pl-6 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:text-white shadow-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-full transition-colors"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>

      {/* Clarity Mode Side Panel */}
      <AnimatePresence>
        {clarityMode && (
          <motion.div
            initial={{ opacity: 0, width: 0, scale: 0.95 }}
            animate={{ opacity: 1, width: '33.333333%', scale: 1 }}
            exit={{ opacity: 0, width: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="hidden lg:flex flex-col h-full bg-slate-50 dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden shrink-0"
          >
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-indigo-600/5">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                Clarity Metrics
              </h2>
              <p className="text-sm text-slate-500 mt-1">Real-time RAGAS Evaluation for last query</p>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto">
              {chartData.length > 0 ? (
                <div className="space-y-8">
                  {/* Radar Chart */}
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
                        <Radar name="Score" dataKey="A" stroke="#6366f1" fill="#818cf8" fillOpacity={0.5} />
                        <RechartsTooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Score']} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Bar Chart */}
                  <div className="h-[200px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <RechartsTooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Score']} cursor={{fill: '#f1f5f9', opacity: 0.5}}/>
                        <Bar dataKey="A" radius={[6, 6, 0, 0]} maxBarSize={50}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.A > 80 ? '#10b981' : entry.A > 50 ? '#f59e0b' : '#ef4444'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="text-sm text-slate-500 text-center px-4 bg-slate-100 dark:bg-slate-900 py-3 rounded-lg">
                    Metrics automatically computed via RAGAS framework using LLM-as-a-Judge on context retrieval and answer synthesis.
                  </div>
                </div>
              ) : latestMessageWithMetrics?.metrics?.error ? (
                 <div className="flex flex-col items-center justify-center h-full text-red-500">
                    <AlertTriangle className="w-10 h-10 mb-4" />
                    <p className="text-sm text-center font-medium">Evaluation Failed</p>
                    <p className="text-xs text-center mt-2 max-w-[200px] text-red-400">{latestMessageWithMetrics.metrics.error}</p>
                 </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <AlertTriangle className="w-10 h-10 mb-4 text-slate-300" />
                  <p className="text-sm text-center max-w-[200px]">No evaluation metrics available for the latest response yet.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
