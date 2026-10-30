"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import { chatWithAgent, checkHealth, triggerIngestion, uploadDocument, ingestFromR2, BASE_URL } from "./apiService";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, RefreshCw, FileText, Activity, AlertCircle, Database, ServerCog, BugPlay, Upload, Eye, ExternalLink } from "lucide-react";
import RuixenQueryBox from "@/components/ui/ruixen-query-box";
import { MetricsBoard } from "@/components/ui/metrics-board";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { authClient } from "@/lib/auth-client";
import { useProModal } from "@/hooks/use-pro-modal";

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
const TypewriterMessage = ({
  content = "",
  isLatest,
  uploadedFiles,
}: {
  content?: string;
  isLatest: boolean;
  uploadedFiles: { id: string; name: string }[];
}) => {
  const safeContent = content ?? "";
  const [displayedText, setDisplayedText] = useState(isLatest ? "" : safeContent);
  const [isTyping, setIsTyping] = useState(isLatest);

  useEffect(() => {
    if (!isLatest || !safeContent) {
      setDisplayedText(safeContent);
      setIsTyping(false);
      return;
    }

    let index = 0;
    const chunkSize = 4;
    const intervalTime = 12;

    const timer = setInterval(() => {
      index += chunkSize;
      if (index >= safeContent.length) {
        setDisplayedText(safeContent);
        setIsTyping(false);
        clearInterval(timer);
      } else {
        setDisplayedText(safeContent.slice(0, index));
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [safeContent, isLatest]);

  // Strip raw backend localhost URLs (http://localhost:8001/files/ -> paper.pdf)
  let cleanedContent = (displayedText || "")
    .replace(/http:\/\/localhost:8001\/files\//gi, "")
    .replace(/http:\/\/localhost:8000\/files\//gi, "");

  // Process line-by-line to convert plain text citations into Markdown links
  const lines = cleanedContent.split("\n");
  const processedLines = lines.map((line) => {
    return line.replace(
      /(?:📌\s*)?\[?(Source\s*\d*)\]?\s*([a-zA-Z0-9_\-\.]+\.pdf)\s*(?:\(Page\s*(\d+)\))?/gi,
      (match, srcTag, pdfName, pageNum) => {
        const trimmedPdf = pdfName.trim();
        const tagText = srcTag ? srcTag.trim() : "";
        const badgeLabel = `${tagText ? tagText + " • " : ""}${trimmedPdf}${pageNum ? ` (Page ${pageNum})` : ""}`;
        
        return `📌 ${badgeLabel}`;
      }
    );
  });

  const processedContent = processedLines.join("\n");

  return (
    <div className="whitespace-pre-wrap leading-relaxed relative">
      <ReactMarkdown
        components={{
          a: ({ node, href, children, ...props }) => {
            let rawHref = href || "#";
            let finalUrl = "#";

            const isBackendFilesUrl =
              rawHref.includes(":8001/files/") ||
              rawHref.includes(":8000/files/") ||
              rawHref.includes("/files/");

            if (isBackendFilesUrl || !rawHref.startsWith("http")) {
              const [basePath, pageHash] = rawHref.split("#");
              const cleanName = basePath.split("/").pop() || basePath;

              let pageNumHash = pageHash ? `#${pageHash}` : "";
              const childrenStr = Array.isArray(children)
                ? children.join(" ")
                : String(children || "");
              const pageMatch = childrenStr.match(/Page\s*(\d+)/i);
              if (!pageNumHash && pageMatch) {
                pageNumHash = `#page=${pageMatch[1]}`;
              }

              if (uploadedFiles.length > 0) {
                const latestDoc = uploadedFiles[uploadedFiles.length - 1];
                finalUrl = `/api/docs/view/${latestDoc.id}${pageNumHash}`;
              } else {
                finalUrl = `/api/documents/proxy?name=${encodeURIComponent(cleanName)}${pageNumHash}`;
              }
            } else {
              finalUrl = rawHref;
            }

            const childrenText = Array.isArray(children)
              ? children.join(" ")
              : String(children || "");
            const displayBadge = childrenText.startsWith("📌") ? childrenText : `📌 ${childrenText}`;

            return (
              <a
                href={finalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/60 font-semibold border border-purple-200 dark:border-purple-800/50 text-xs transition-all cursor-pointer group shadow-sm my-1 hover:scale-105"
                title="Click to view cited document page in new tab"
              >
                <span>{displayBadge}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
              </a>
            );
          }
        }}
      >
        {processedContent}
      </ReactMarkdown>
      {isTyping && (
        <span className="inline-block w-2 h-4 bg-purple-500 dark:bg-purple-400 animate-pulse ml-1 align-middle rounded-sm" />
      )}
    </div>
  );
};

export const ChatInterface = () => {
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [systemReady, setSystemReady] = useState(false);
  const [healthChecking, setHealthChecking] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string, id: string }[]>([]);
  const [isPersonalized, setIsPersonalized] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const proModal = useProModal();

  const { data: session } = authClient.useSession();

  useEffect(() => {
    // Generate a random session ID for the current chat session
    setSessionId(crypto.randomUUID());

    // Resolve user ID: prefer authenticated user, fallback to persistent guest ID
    if (session?.user?.id) {
      setUserId(session.user.id);
    } else {
      const storedUserId = localStorage.getItem("libra_guest_user_id");
      if (storedUserId) {
        setUserId(storedUserId);
      } else {
        const newId = "guest_" + crypto.randomUUID().split("-")[0];
        localStorage.setItem("libra_guest_user_id", newId);
        setUserId(newId);
      }
    }

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
      const data = await chatWithAgent(query, sessionId, userId, isPersonalized, testMode);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    setUploading(true);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: `📎 Uploading document: ${file.name} to R2 Data Lake...`,
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      // 1. Get Presigned URL from our Next.js backend
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });

      if (res.status === 403) {
        proModal.onOpen("uploads" as any);
        throw new Error("Free tier limit reached.");
      }

      if (!res.ok) throw new Error("Failed to get upload URL");
      
      const { presignedUrl, document } = await res.json();

      // 2. Upload directly to Cloudflare R2
      const uploadRes = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) throw new Error("Failed to upload to Cloudflare R2");

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "agent", content: `Upload complete. Indexing **${file.name}** into Vector Database... 🧠` }
      ]);

      // 3. Trigger ingestion from R2 to OpenSearch
      const documentKey = document.key;
      await ingestFromR2(documentKey, file.name, document.id);

      const agentMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "agent",
        content: `I've successfully indexed **${file.name}** into the RAG system! You can now ask questions about it. `,
      };
      setMessages((prev) => [...prev, agentMessage]);

      setUploadedFiles((prev) => [...prev, { name: file.name, id: document.id }]);

    } catch (error) {
      console.error("Upload Error:", error);
      if (error instanceof Error && error.message === "Free tier limit reached.") {
        // Just fail silently in chat as modal is open
      } else {
        const agentMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "agent",
          content: `Sorry, there was an error uploading your document **${file.name}** to R2. Please try again.`,
        };
        setMessages((prev) => [...prev, agentMessage]);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
              <><div className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Online</>
            ) : (
              <><AlertCircle className="w-4 h-4 text-red-500" />Offline</>
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
          {/* <Button
            variant="outline"
            size="sm"
            onClick={handleIngest}
            disabled={ingesting || !systemReady}
            className="flex items-center gap-2 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-700 dark:text-purple-300"
          >
            <Database className="w-4 h-4" />
            Sync
          </Button> */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.txt,.md,.csv"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !systemReady}
            className="flex items-center gap-2 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-700 dark:text-purple-300"
          >
            {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload
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
                messages.map((msg, index) => (
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
                        {msg.role === "agent" ? (
                          <TypewriterMessage
                            content={msg.content}
                            isLatest={index === messages.length - 1}
                            uploadedFiles={uploadedFiles}
                          />
                        ) : (
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        )}
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
            <div className="max-w-4xl mx-auto flex flex-col gap-3">
              {uploadedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 px-2">
                  {uploadedFiles.map((f) => (
                    <a
                      key={f.id}
                      href={`/api/documents/proxy?id=${f.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/50 text-xs font-medium border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer group"
                      title="Click to view PDF document in new tab"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{f.name}</span>
                      <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ))}
                </div>
              )}
              <RuixenQueryBox
                onSubmit={handleSend}
                disabled={loading || !systemReady}
                placeholder={systemReady ? "Ask your agent something..." : "Waiting for system to be ready..."}
                isPersonalized={isPersonalized}
                onTogglePersonalized={() => setIsPersonalized(!isPersonalized)}
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
        <Sheet open={testMode} onOpenChange={setTestMode} modal={false}>
          <SheetContent side="bottom" hideOverlay className="h-[65vh] sm:h-auto sm:side-right sm:w-[400px] p-0 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-t border-purple-200 dark:border-purple-800 rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)] lg:hidden flex flex-col">
            <SheetTitle className="sr-only">Clarity Mode Metrics</SheetTitle>
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 mb-1" />
            <div className="flex-1 min-h-0 py-2 px-4 sm:p-6 overflow-hidden">
              <MetricsBoard messages={messages} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
