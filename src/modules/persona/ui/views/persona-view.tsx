"use client";

import { useState, useRef, useEffect } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  MessageSquareIcon,
  SparklesIcon,
  SendIcon,
  HashIcon,
  BookOpenIcon,
  BotIcon,
  UserIcon,
  CheckCircle2Icon,
  ShieldCheckIcon,
  Loader2Icon,
  HelpCircleIcon,
  FileTextIcon,
  ZapIcon,
  LockIcon,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import { CustomAvatar } from "@/components/extras/custom-avatar";

export function PersonaView() {
  const trpc = useTRPC();
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedChannelId, setSelectedChannelId] = useState<string>("general-discussion");
  const [inputMessage, setInputMessage] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all class forums
  const { data: forums = [], isLoading: loadingForums } = useQuery(trpc.persona.getCourseForums.queryOptions());
  const { data: currentUser } = useQuery(trpc.lms.getCurrentUser.queryOptions());

  // Auto-select first course if not selected
  useEffect(() => {
    if (forums.length > 0 && !selectedCourseId) {
      setSelectedCourseId(forums[0].id);
    }
  }, [forums, selectedCourseId]);

  const activeCourse = forums.find((f) => f.id === selectedCourseId) || forums[0];
  const activeChannel = activeCourse?.channels?.find((c) => c.id === selectedChannelId) || activeCourse?.channels?.[0];

  // Fetch channel messages
  const { data: messages = [], isLoading: loadingMessages, refetch: refetchMessages } = useQuery(
    trpc.persona.getChannelMessages.queryOptions(
      { courseId: selectedCourseId || "", channelId: selectedChannelId },
      { enabled: !!selectedCourseId }
    )
  );

  // Send message mutation
  const sendMessageMutation = useMutation(
    trpc.persona.sendMessage.mutationOptions({
      onSuccess: () => {
        setInputMessage("");
        refetchMessages();
      },
      onError: (err) => {
        toast.error(err.message || "Failed to send message");
      },
    })
  );

  // Generate AI Class Notes mutation
  const generateNotesMutation = useMutation(
    trpc.persona.generateAiClassNotes.mutationOptions({
      onSuccess: () => {
        toast.success("AI Notetaker generated new class study notes!");
        setSelectedChannelId("ai-notetaker-summary");
        refetchMessages();
      },
      onError: (err) => {
        toast.error(err.message || "Failed to generate class notes");
      },
    })
  );

  const handleSend = () => {
    if (!inputMessage.trim() || !selectedCourseId) return;
    sendMessageMutation.mutate({
      courseId: selectedCourseId,
      channelId: selectedChannelId,
      content: inputMessage.trim(),
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (loadingForums) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2Icon className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (forums.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[65vh] px-4 text-center">
        <div className="w-16 h-16 bg-purple-100 border border-purple-200 rounded-full flex items-center justify-center mb-4 shadow-sm">
          <LockIcon className="w-8 h-8 text-purple-600" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">Class Forums Locked</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
          You haven't enrolled in any courses yet. Enroll in a course or upgrade to EdClarity Pro to unlock Persona Mode discussion forums and AI Co-Teacher chats.
        </p>
        <Link href="/courses">
          <Button size="lg" className="gap-2">
            Explore Courses Catalog <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Top Header Bar */}
      <div className="flex items-center justify-between mb-4 px-4 py-2 md:px-8">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              Persona Mode
              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                Discord Discussion Forum & AI Notetaker
              </Badge>
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Class communities where teachers, students, and the AI Co-Teacher Notetaker collaborate in real time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => selectedCourseId && generateNotesMutation.mutate({ courseId: selectedCourseId })}
            disabled={generateNotesMutation.isPending || !selectedCourseId}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm flex items-center gap-1.5"
          >
            {generateNotesMutation.isPending ? (
              <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <SparklesIcon className="w-3.5 h-3.5 text-amber-300" />
            )}
            Generate AI Class Notes
          </Button>
        </div>
      </div>

      <div className="flex-1 pb-6 px-4 md:px-8 flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 h-[calc(100vh-180px)] min-h-[550px]">
          
          {/* LEFT SIDEBAR: Course Servers & Channels (3 cols) */}
          <div className="lg:col-span-3 bg-card border border-border rounded-xl p-3.5 shadow-sm flex flex-col gap-4 overflow-y-auto">
            {/* Course Server Selector */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                Class Discussion Servers
              </p>
              <div className="space-y-1.5">
                {forums.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => setSelectedCourseId(course.id)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2.5 border ${
                      selectedCourseId === course.id
                        ? "bg-purple-50 text-purple-900 border-purple-200 shadow-xs font-semibold"
                        : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/70 hover:text-foreground"
                    }`}
                  >
                    <BookOpenIcon className={`w-4 h-4 shrink-0 ${selectedCourseId === course.id ? "text-purple-600" : "text-muted-foreground"}`} />
                    <span className="truncate flex-1">{course.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Channels Tree */}
            {activeCourse && (
              <div className="flex-1 pt-2 border-t border-border">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1 flex items-center justify-between">
                  <span>Class Channels</span>
                  <span className="text-[10px] text-purple-600 font-mono">#4</span>
                </p>
                <div className="space-y-1">
                  {activeCourse.channels.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => setSelectedChannelId(ch.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-xs transition-all flex items-center justify-between ${
                        selectedChannelId === ch.id
                          ? "bg-purple-600 text-white font-semibold shadow-xs"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <HashIcon className="w-3.5 h-3.5 opacity-70 shrink-0" />
                        <span className="truncate">{ch.name}</span>
                      </span>
                      {ch.id === "ai-notetaker-summary" && (
                        <SparklesIcon className={`w-3 h-3 ${selectedChannelId === ch.id ? "text-amber-300" : "text-purple-600"}`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CENTER PANEL: Main Discord Channel Chat Feed (6 cols) */}
          <div className="lg:col-span-6 bg-card border border-border rounded-xl shadow-sm flex flex-col overflow-hidden">
            {/* Active Channel Header */}
            <div className="p-3.5 border-b border-border bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HashIcon className="w-4 h-4 text-purple-600" />
                <h4 className="font-semibold text-sm text-foreground">{activeChannel?.name || "general-discussion"}</h4>
                <span className="text-xs text-muted-foreground hidden sm:inline">| {activeChannel?.description}</span>
              </div>

              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                AI Notetaker Live (Sub-50ms)
              </Badge>
            </div>

            {/* Chat Message Feed */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-background/50">
              {loadingMessages ? (
                <div className="flex justify-center items-center h-full text-muted-foreground">
                  <Loader2Icon className="w-5 h-5 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-6">
                  <MessageSquareIcon className="w-8 h-8 text-muted-foreground/40 mb-2" />
                  <p className="text-xs font-medium">No messages in this channel yet.</p>
                  <p className="text-[11px]">Start the conversation or ask the AI Notetaker Persona a question!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isAi = msg.senderRole === "ai_notetaker";
                  const isTeacher = msg.senderRole === "teacher";

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                        isAi
                          ? "bg-purple-50/60 border border-purple-100 dark:bg-purple-950/20"
                          : isTeacher
                          ? "bg-amber-50/40 border border-amber-100/60 dark:bg-amber-950/10"
                          : "bg-card border border-border/60"
                      }`}
                    >
                      {isAi ? (
                        <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <BotIcon className="w-4 h-4" />
                        </div>
                      ) : msg.senderAvatar ? (
                        <Image src={msg.senderAvatar} alt={msg.senderName} width={32} height={32} className="rounded-full ring-1 ring-border shrink-0" />
                      ) : (
                        <CustomAvatar seed={msg.senderName} variant="initials" className="w-8 h-8 shrink-0" />
                      )}

                      <div className="flex-1 space-y-1 overflow-hidden">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-xs text-foreground">{msg.senderName}</span>
                          {isAi && (
                            <Badge className="bg-purple-600 text-white text-[9px] px-1.5 py-0 flex items-center gap-0.5 font-mono">
                              <ZapIcon className="w-2.5 h-2.5" /> AI NOTETAKER
                            </Badge>
                          )}
                          {isTeacher && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] px-1.5 py-0 font-semibold">
                              TEACHER
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <div className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Prompt Triggers */}
            <div className="px-3 pt-2 bg-muted/20 flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setInputMessage("@AI Summarize today's key lesson takeaways")}
                className="px-2.5 py-1 rounded-full text-[11px] bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors flex items-center gap-1 shrink-0"
              >
                <SparklesIcon className="w-3 h-3 text-purple-600" /> Summarize Lesson
              </button>
              <button
                onClick={() => setInputMessage("@AI Explain the core formula used in this chapter")}
                className="px-2.5 py-1 rounded-full text-[11px] bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-1 shrink-0"
              >
                <HelpCircleIcon className="w-3 h-3 text-blue-600" /> Explain Concept
              </button>
              <button
                onClick={() => setInputMessage("@AI Generate a 3-question practice quiz for this class")}
                className="px-2.5 py-1 rounded-full text-[11px] bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors flex items-center gap-1 shrink-0"
              >
                <FileTextIcon className="w-3 h-3 text-amber-600" /> Generate Quiz
              </button>
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-border bg-card flex items-center gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={`Message #${activeChannel?.name || "discussion"} (tag @AI to trigger Notetaker)...`}
                className="text-xs bg-muted/40 border-border flex-1 focus-visible:ring-purple-500"
              />
              <Button
                onClick={handleSend}
                disabled={sendMessageMutation.isPending || !inputMessage.trim()}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white shadow-xs shrink-0"
              >
                {sendMessageMutation.isPending ? (
                  <Loader2Icon className="w-4 h-4 animate-spin" />
                ) : (
                  <SendIcon className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
          </div>

          {/* RIGHT SIDEBAR: Class Community Members & AI Telemetry (3 cols) */}
          <div className="lg:col-span-3 bg-card border border-border rounded-xl p-3.5 shadow-sm flex flex-col gap-4 overflow-y-auto">
            {/* AI Telemetry Card */}
            <div className="p-3 rounded-lg bg-purple-50/80 border border-purple-200 space-y-2">
              <div className="flex items-center gap-2 text-purple-900 font-semibold text-xs">
                <BotIcon className="w-4 h-4 text-purple-600" />
                AI Notetaker Telemetry
              </div>
              <p className="text-[11px] text-purple-700 leading-relaxed">
                Active in <strong>#{activeChannel?.name}</strong> with sub-50ms Olympus-EdC-v1 inference & Stage 2 Fast Guardrails.
              </p>
              <div className="flex items-center justify-between text-[10px] text-purple-800 font-mono pt-1 border-t border-purple-200/60">
                <span>Model: Athena-EdC-v1</span>
                <span className="text-emerald-700 font-bold">100% Safe</span>
              </div>
            </div>

            {/* Class Members List */}
            <div className="flex-1 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1 flex items-center justify-between">
                <span>Class Roster</span>
                <span className="text-[10px]">3 Members</span>
              </p>

              <div className="space-y-2">
                {/* AI Persona Member */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-purple-50/40 border border-purple-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs">
                      <BotIcon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">AI Notetaker</p>
                      <p className="text-[10px] text-purple-700">Class Co-Teacher</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px]">Online</Badge>
                </div>

                {/* Teacher Member */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/30 border border-amber-100/50">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold">
                      T
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Class Instructor</p>
                      <p className="text-[10px] text-amber-700">Course Teacher</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">Instructor</Badge>
                </div>

                {/* Current User Student */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border">
                  <div className="flex items-center gap-2">
                    <CustomAvatar seed={currentUser?.name || "Student"} variant="initials" className="w-7 h-7" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">{currentUser?.name || "You"}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{currentUser?.role || "student"}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[9px]">Active</Badge>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </>
  );
}

export default PersonaView;
