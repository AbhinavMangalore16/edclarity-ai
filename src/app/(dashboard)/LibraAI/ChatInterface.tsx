"use client";

import React, { useState, useEffect, useRef } from "react";
import { chatWithAgent, checkHealth, triggerIngestion } from "./apiService";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, RefreshCw, FileText, Activity, AlertCircle, Database, ServerCog, BugPlay } from "lucide-react";
import RuixenQueryBox from "@/components/ui/ruixen-query-box";
import { MetricsBoard } from "@/components/ui/metrics-board";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

interface Metrics {
  faithfulness: number;
  hallucination: number;
}

interface PerformanceMetrics {
  total_time: number;
  [key: string]: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  metrics?: Metrics;
  performance_metrics?: PerformanceMetrics;
}

export const ChatInterface = () => {
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [systemReady, setSystemReady] = useState(false);
  const [healthChecking, setHealthChecking] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate a random session ID on mount
    setSessionId(crypto.randomUUID());

    // Check health
    const verifyHealth = async () => {
      setHealthChecking(true);
      const res = await checkHealth();
      setSystemReady(res.pipeline_ready);
      setHealthChecking(false);
    };
    verifyHealth();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const handleSend = async (query: string) => {
    if (!query.trim() || !systemReady || loading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: query,
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const data = await chatWithAgent(query, sessionId);
      const agentMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "agent",
        content: data.answer,
        metrics: data.metrics,
        performance_metrics: data.performance_metrics,
      };
      setMessages((prev) => [...prev, agentMessage]);
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "agent",
          content: "Sorry, I encountered an error while processing your request. Please ensure the backend is running.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleIngest = async () => {
    setIngesting(true);
    try {
      await triggerIngestion();
      alert("Document ingestion started in the background!");
    } catch (error) {
      console.error("Ingestion Error:", error);
      alert("Failed to trigger ingestion.");
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div className={`flex flex-col flex-1 h-full w-full mx-auto space-y-4 p-4 md:p-8 min-h-0 ${testMode ? 'max-w-[1600px]' : 'max-w-5xl'}`}>
      {/* Header section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm p-6 rounded-xl border border-purple-100 dark:border-purple-900/30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              EdClarity.ai <span className="text-sm font-normal text-gray-400">× <a
                href="https://libra-tau.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-700 underline decoration-dotted transition-colors"
              >LibraAI</a></span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Evolving the search and investigation capabilities built a triennium ago.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-sm font-medium">
            {healthChecking ? (
              <><RefreshCw className="w-4 h-4 animate-spin text-gray-500" /> Checking Status...</>
            ) : systemReady ? (
              <><div className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Pipeline Ready</>
            ) : (
              <><AlertCircle className="w-4 h-4 text-red-500" /> System Offline</>
            )}
          </div>
          <Button
            variant={testMode ? "default" : "outline"}
            size="sm"
            onClick={() => setTestMode(!testMode)}
            className={`flex items-center gap-2 ${testMode ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-700 dark:text-purple-300'}`}
          >
            <BugPlay className="w-4 h-4" />
            Clarity Mode
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleIngest}
            disabled={ingesting || !systemReady}
            className="flex items-center gap-2 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-700 dark:text-purple-300"
          >
            <Database className="w-4 h-4" />
            Sync
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 w-full gap-4">
        {/* Chat Area */}
        <Card className="flex-1 min-h-0 flex flex-col overflow-hidden border-purple-100 dark:border-purple-900/30 shadow-md bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm">
          <ScrollArea className="flex-1 h-full min-h-0">
            <div className="space-y-6 pb-2 p-4 md:p-6">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20 opacity-60">
                  <FileText className="w-12 h-12 text-purple-300 dark:text-purple-900/50" />
                  <div className="max-w-md">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Welcome to LibraRAG</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      Ask questions about study material. The system uses advanced retrieval-augmented generation to find answers with citations.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "agent" && (
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="w-5 h-5 text-purple-600" />
                      </div>
                    )}

                    <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                      <div
                        className={`px-5 py-3.5 rounded-2xl ${msg.role === "user"
                          ? "bg-purple-600 text-white rounded-tr-sm shadow-sm"
                          : "bg-purple-50/50 dark:bg-zinc-900 text-gray-800 dark:text-gray-200 rounded-tl-sm border border-purple-100 dark:border-zinc-800 shadow-sm"
                          }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>

                      {/* Metrics Display */}
                      {msg.role === "agent" && msg.metrics && msg.performance_metrics && (
                        <div className="flex flex-wrap items-center gap-3 mt-1 px-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-zinc-800/50 px-2.5 py-1 rounded-md border border-gray-200 dark:border-zinc-700/50">
                            <Activity className="w-3.5 h-3.5 text-green-500" />
                            <span>Faithfulness: {(msg.metrics.faithfulness || 0).toFixed(1)}%</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-zinc-800/50 px-2.5 py-1 rounded-md border border-gray-200 dark:border-zinc-700/50">
                            <ServerCog className="w-3.5 h-3.5 text-purple-500" />
                            <span>Time: {msg.performance_metrics.total_time}s</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {msg.role === "user" && (
                      <div className="w-8 h-8 rounded-full bg-purple-200 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-5 h-5 text-purple-700 dark:text-purple-300" />
                      </div>
                    )}
                  </div>
                ))
              )}

              {loading && (
                <div className="flex gap-4 justify-start">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-5 h-5 text-purple-600 animate-pulse" />
                  </div>
                  <div className="px-5 py-4 rounded-2xl rounded-tl-sm bg-purple-50/50 dark:bg-zinc-900 border border-purple-100 dark:border-zinc-800 flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium ml-2">Agent is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 md:p-6 bg-gray-50/50 dark:bg-zinc-900/30 border-t border-purple-100 dark:border-purple-900/30">
            <div className="max-w-4xl mx-auto">
              <RuixenQueryBox
                onSubmit={handleSend}
                disabled={loading || !systemReady}
                placeholder={systemReady ? "Ask your agent something..." : "Waiting for system to be ready..."}
              />
            </div>
          </div>
        </Card>

        {/* Desktop Metrics Board (Clarity Mode) */}
        <div className="hidden lg:block">
          {testMode && (
            <div className="ml-4 h-full">
              <MetricsBoard messages={messages} />
            </div>
          )}
        </div>

        {/* Mobile/Tablet Metrics Board (Clarity Mode) via Sheet */}
        <Sheet open={testMode} onOpenChange={setTestMode}>
          <SheetContent side="bottom" className="h-[80vh] sm:h-auto sm:side-right sm:w-[400px] p-0 bg-transparent border-none shadow-none lg:hidden flex flex-col justify-end sm:justify-start">
            <SheetTitle className="sr-only">Clarity Mode Metrics</SheetTitle>
            <div className="h-full max-h-full py-4 px-2 sm:py-6 sm:pr-6 sm:pl-0 flex overflow-hidden">
              <MetricsBoard messages={messages} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
