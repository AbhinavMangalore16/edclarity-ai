"use client";

import { use, useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import MuxPlayer from "@mux/mux-player-react";
import { CheckCircle2Icon, PlayCircleIcon, BotMessageSquareIcon, SendIcon, SparklesIcon, ArrowLeftIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function StudentLearnPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const trpc = useTRPC();

  const { data: course, isLoading, refetch } = useQuery(trpc.lms.getCourseDetails.queryOptions({ courseId }));
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

  // AI Chat state
  const [chatQuery, setChatQuery] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; text: string; timestamp?: string }[]>([
    { role: 'assistant', text: "Hello! I am your AI Co-Teacher for this chapter. Ask me any questions about the concepts or code!" }
  ]);

  const activeChapter = course?.chapters?.find((c: any) => c.id === (selectedChapterId || course?.chapters?.[0]?.id)) || course?.chapters?.[0];

  const toggleProgressMutation = useMutation(
    trpc.lms.toggleProgress.mutationOptions({
      onSuccess: () => {
        toast.success("Progress updated!");
        refetch();
      },
    })
  );

  const handleSendMessage = () => {
    if (!chatQuery.trim()) return;

    const userMsg = chatQuery;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatQuery("");

    // AI response simulation with timestamp jump
    setTimeout(() => {
      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: `Regarding "${userMsg}": This is detailed in chapter "${activeChapter?.title || 'current'}". You can review the video walkthrough or ask follow-up questions.`,
          timestamp: "02:15"
        }
      ]);
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2Icon className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col items-center justify-center text-center py-16">
        <h3 className="text-lg font-semibold mb-2 text-foreground">Course unavailable</h3>
        <Link href="/courses">
          <Button variant="outline" size="sm">Back to Catalog</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Top Header Bar */}
      <div className="flex items-center justify-between mb-4 px-4 py-2 md:px-8 border-b border-border pb-3">
        <div>
          <Link href={`/courses/${course.id}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-1">
            <ArrowLeftIcon className="w-3.5 h-3.5" /> Back to Overview
          </Link>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">{course.title}</h3>
            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
              Student Learning Room
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Grid: Video Player + AI Co-Teacher + Chapter Sidebar */}
      <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 8 Cols: Video & Lesson Notes */}
          <div className="lg:col-span-8 space-y-6">
            {/* Mux HLS Player Container */}
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-border shadow-sm">
              {activeChapter?.videoUrl ? (
                <MuxPlayer
                  streamType="on-demand"
                  src={activeChapter.videoUrl}
                  primaryColor="#6d28d9"
                  secondaryColor="#ffffff"
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-3 bg-muted/30">
                  <PlayCircleIcon className="w-12 h-12 text-purple-600/40" />
                  <p className="text-xs font-medium">No video uploaded for this chapter yet.</p>
                </div>
              )}
            </div>

            {/* Chapter Header Card */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <h4 className="text-xl font-bold text-foreground">{activeChapter?.title || "Select a Chapter"}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Chapter {activeChapter?.position || 1}</p>
              </div>

              {activeChapter && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => toggleProgressMutation.mutate({ chapterId: activeChapter.id, isCompleted: true })}
                  disabled={toggleProgressMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                >
                  <CheckCircle2Icon className="w-4 h-4" /> Mark Completed
                </Button>
              )}
            </div>

            {/* Overview / Notes */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-2">
              <h5 className="text-sm font-semibold text-foreground">Chapter Overview</h5>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {activeChapter?.description || "In this lesson, you will master key concepts with guided video instruction and interactive AI assistance."}
              </p>
            </div>
          </div>

          {/* Right 4 Cols: Chapter Sidebar & AI Co-Teacher */}
          <div className="lg:col-span-4 space-y-6 flex flex-col">
            {/* Curriculum Chapter List Card */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Curriculum</span>
                <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                  {course.chapters?.length || 0} Lessons
                </Badge>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {course.chapters?.map((chap: any) => {
                  const isActive = chap.id === activeChapter?.id;
                  return (
                    <button
                      key={chap.id}
                      type="button"
                      onClick={() => setSelectedChapterId(chap.id)}
                      className={`w-full text-left p-2.5 rounded-lg text-xs flex items-center justify-between transition-all ${
                        isActive
                          ? "bg-purple-50 border border-purple-200 text-purple-900 font-semibold"
                          : "bg-muted/30 border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <PlayCircleIcon className={`w-3.5 h-3.5 ${isActive ? "text-purple-700" : "text-muted-foreground"}`} />
                        <span className="truncate">{chap.title}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Co-Teacher Chat Card */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex-1 flex flex-col min-h-[360px]">
              <div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-border text-purple-700 font-semibold text-xs">
                <BotMessageSquareIcon className="w-4 h-4 text-purple-600" /> AI Co-Teacher
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs mb-3 max-h-[260px]">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl max-w-[85%] ${
                      msg.role === 'user'
                        ? 'ml-auto bg-purple-700 text-white rounded-br-none'
                        : 'bg-muted border border-border text-foreground rounded-bl-none'
                    }`}
                  >
                    <p className="leading-relaxed">{msg.text}</p>
                    {msg.timestamp && (
                      <Badge variant="outline" className="mt-2 bg-purple-50 text-purple-700 border-purple-200 cursor-pointer text-[10px] flex items-center gap-1 w-fit">
                        <SparklesIcon className="w-2.5 h-2.5" /> Jump to {msg.timestamp}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="pt-2 flex gap-2 border-t border-border">
                <input
                  type="text"
                  placeholder="Ask AI Co-Teacher..."
                  value={chatQuery}
                  onChange={(e) => setChatQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button type="button" onClick={handleSendMessage} size="icon" className="h-8 w-8 rounded-lg">
                  <SendIcon className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
