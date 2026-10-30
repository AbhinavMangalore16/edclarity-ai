"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Flame, Star, BookOpen, Crown } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CLARITIES_PRESETS } from "@/config/presets";
import { PresetSelector } from "@/components/extras/preset-selector";
import { Textarea } from "@/components/ui/textarea";
import { StudyDashboard } from "@/modules/dashboard/ui/components/StudyDashboard";

import { authClient } from "@/lib/auth-client";

export const ClaritiesDashboard = () => {
  const router = useRouter();
  const trpc = useTRPC();
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [specifics, setSpecifics] = useState("");

  const { data: sessionUser } = authClient.useSession();
  const { data: dbUser } = useQuery(trpc.lms.getCurrentUser.queryOptions());
  const currentRole = dbUser?.role || (sessionUser?.user as any)?.role || "student";
  const isTeacherOrAdmin = currentRole === "teacher" || currentRole === "admin";
  
  const { data: progress, isLoading: isProgressLoading } = useQuery(trpc.clarities.getUserProgress.queryOptions());
  const { data: courses, isLoading: isCoursesLoading, refetch } = useQuery(trpc.clarities.getCourses.queryOptions());
  
  const generateMutation = useMutation(trpc.clarities.generateCourse.mutationOptions({
    onSuccess: (course) => {
      toast.success("Course generated successfully!");
      setIsGenerateOpen(false);
      refetch();
      router.push(`/clarities/${course.id}`);
    },
    onError: (err) => {
      if (err.message.includes("PRO_REQUIRED")) {
        setIsGenerateOpen(false);
        setIsProModalOpen(true);
      } else {
        toast.error(err.message || "Failed to generate course");
      }
    }
  }));

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState<string>("");
  const [parsingPdf, setParsingPdf] = useState(false);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      return toast.error("Please select a valid PDF document.");
    }
    setPdfFile(file);
    setParsingPdf(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Str = reader.result as string;
        const { parsePdfContent } = await import("@/lib/pdf-parser");
        const extracted = await parsePdfContent(base64Str);
        setPdfText(extracted);
        toast.success(`Parsed PDF material (${extracted.length} chars)`);
        setParsingPdf(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error("PDF read error:", err);
      toast.error("Failed to parse PDF file.");
      setParsingPdf(false);
    }
  };

  const handleGenerate = () => {
    if (!topic.trim()) return toast.error("Please enter a topic");
    const finalTopic = specifics.trim() ? `${topic} - Focus on: ${specifics}` : topic;
    generateMutation.mutate({ topic: finalTopic, pdfText: pdfText || undefined });
  };

  const handleGenerateClick = (e: React.MouseEvent) => {
    if (courses && courses.length >= 10) {
      e.preventDefault();
      setIsProModalOpen(true);
    }
  };

  if (isProgressLoading || isCoursesLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 px-4 py-2 md:px-8">
        <div>
          <h3 className="text-xl font-sora font-bold text-foreground tracking-tight">Your Clarities</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Personalized gamified learning paths & active streaks.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer hover:bg-orange-500/20 transition-colors">
                <Flame className="h-3.5 w-3.5 fill-current" />
                <span>{progress?.streakDays || 0} Day Streak</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover border border-border rounded-xl shadow-md" align="end">
              <div className="p-3 border-b border-border bg-muted/40 rounded-t-xl">
                <h4 className="font-semibold text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 fill-current" />
                  Streak History
                </h4>
              </div>
              <Calendar
                mode="multiple"
                selected={progress?.activeDays ? progress.activeDays.map((d: any) => new Date(d)) : []}
                className="p-2"
                classNames={{
                  day_selected: "bg-orange-500 text-white hover:bg-orange-600 hover:text-white rounded-md font-semibold text-xs",
                  day_today: "bg-accent text-accent-foreground font-semibold text-xs",
                }}
                disableNavigation={false}
              />
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-semibold">
            <Star className="h-3.5 w-3.5 fill-current" />
            <span>{progress?.xp || 0} XP</span>
          </div>

          {isTeacherOrAdmin && (
            <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white shadow-xs" onClick={handleGenerateClick}>
                  <Plus className="h-4 w-4" />
                  Generate Course
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-popover text-popover-foreground border border-border rounded-xl">
                <DialogHeader>
                  <DialogTitle className="text-base font-semibold font-sora">Generate Curriculum</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Enter any topic you want to learn about, and our AI will build a personalized curriculum.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <PresetSelector
                    categories={CLARITIES_PRESETS}
                    selectedValue={topic}
                    onSelect={(value) => setTopic(value)}
                    disabled={generateMutation.isPending}
                  />
                  <div className="flex flex-col gap-1.5 mt-1">
                    <label className="text-xs font-medium text-foreground">Specifics (Optional)</label>
                    <Textarea
                      placeholder="E.g., I want to focus specifically on quantum mechanics..."
                      value={specifics}
                      onChange={(e) => setSpecifics(e.target.value)}
                      disabled={generateMutation.isPending}
                      rows={2}
                      className="text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 mt-1">
                    <label className="text-xs font-medium text-foreground flex items-center justify-between">
                      <span>Upload Syllabus / Reference PDF (Optional)</span>
                      {parsingPdf && <span className="text-[10px] text-purple-600 dark:text-purple-400 animate-pulse">Parsing PDF...</span>}
                    </label>
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={handlePdfUpload}
                      disabled={generateMutation.isPending || parsingPdf}
                      className="text-xs cursor-pointer file:text-xs file:font-semibold file:bg-purple-500/10 file:text-purple-700 dark:file:text-purple-300 hover:file:bg-purple-500/20 border-dashed"
                    />
                    {pdfFile && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ Attached: {pdfFile.name} ({Math.round(pdfFile.size / 1024)} KB)
                      </span>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white" disabled={generateMutation.isPending} onClick={handleGenerate}>
                    {generateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Generate Course
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-6">
        {/* AI Adaptive Learning & Flashcards Hub */}
        <StudyDashboard />

        <div className="flex items-center justify-between border-b border-border pb-2">
          <h4 className="text-base font-sora font-semibold text-foreground">My Clarities Courses</h4>
        </div>

        {courses?.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl bg-card">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h4 className="text-base font-sora font-semibold text-foreground">No Clarities courses yet</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
              {isTeacherOrAdmin
                ? "Generate your course roadmap with optional PDF syllabus materials to start teaching!"
                : "Clarities courses created by your course teachers will appear here."}
            </p>
            {isTeacherOrAdmin && (
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={(e) => {
                if (courses && courses.length >= 2) {
                  setIsProModalOpen(true);
                } else {
                  setIsGenerateOpen(true);
                }
              }}>
                Generate a Course
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses?.map((course) => (
              <div
                key={course.id}
                className="bg-card border border-border/80 hover:border-purple-500/40 rounded-xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
                onClick={() => router.push(`/clarities/${course.id}`)}
              >
                <div>
                  <div className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 mb-2">
                    {course.topic}
                  </div>
                  <h4 className="text-base font-sora font-semibold text-foreground line-clamp-1 mb-1">{course.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{course.description}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border text-xs font-semibold text-purple-600 dark:text-purple-400">
                  <span>View Roadmap →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pro Upgrade Modal */}
      <Dialog open={isProModalOpen} onOpenChange={setIsProModalOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-xl border border-border bg-popover text-popover-foreground">
          <DialogHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center mb-2">
              <Crown className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-bold">Upgrade to Pro</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              You've reached the limit of 2 free courses. Unlock unlimited Clarities and advanced AI models.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="flex justify-between items-center p-3 border border-border rounded-lg bg-card cursor-pointer hover:border-purple-300 transition">
              <div>
                <h5 className="font-semibold text-sm">Monthly Plan</h5>
                <p className="text-xs text-muted-foreground">Billed monthly</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-base">₹499</p>
                <p className="text-[10px] text-muted-foreground">/ month</p>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 border-2 border-purple-600 rounded-lg bg-purple-50/50 cursor-pointer shadow-sm relative">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                BEST VALUE
              </div>
              <div>
                <h5 className="font-semibold text-sm text-foreground">Yearly Plan</h5>
                <p className="text-xs text-muted-foreground">Billed annually</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-base text-purple-700">₹3999</p>
                <p className="text-[10px] text-muted-foreground">/ year</p>
              </div>
            </div>
          </div>
          <DialogFooter className="sm:justify-center pt-2">
            <Button size="sm" className="w-full" onClick={() => setIsProModalOpen(false)}>
              Upgrade Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};


