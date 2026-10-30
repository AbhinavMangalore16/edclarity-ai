"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowLeft, Check, Lock, Play, Crown, Flame, Star, Heart, Sparkles, BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import useSound from "use-sound";

interface ClaritiesRoadmapProps {
  courseId: string;
}

// Duolingo offset curve pattern for snake layout
const OFFSET_PATTERN = [0, 52, 80, 52, 0, -52, -80, -52];

export const ClaritiesRoadmap = ({ courseId }: ClaritiesRoadmapProps) => {
  const router = useRouter();
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(trpc.clarities.getCourseDetails.queryOptions({ courseId }));
  const { data: userProgress } = useQuery(trpc.clarities.getUserProgress.queryOptions());
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null);
  const [playStart] = useSound("/assets/start.mp3", { volume: 0.6 });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col items-center justify-center text-center py-16">
        <h3 className="text-lg font-semibold text-foreground mb-2">Roadmap not found</h3>
        <Button variant="outline" size="sm" onClick={() => router.push("/clarities")}>
          Back to Clarities
        </Button>
      </div>
    );
  }

  const { course, modules, lessons, completions } = data;
  const completedLessonIds = new Set(completions.map(c => c.lessonId));

  // Global lesson sequence calculation
  let globalLessonIndex = 0;
  let firstUncompletedLessonId: string | null = null;
  const sortedModules = [...modules].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <>
      {/* Duolingo Gamified Top Bar */}
      <div className="flex items-center justify-between mb-4 px-4 py-2 md:px-8 border-b border-border pb-3">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.push("/clarities")} className="mb-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Clarities
          </Button>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-foreground">{course.title}</h3>
            <span className="text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-full">
              {course.topic}
            </span>
          </div>
        </div>

        {/* Duolingo Gamification Stats Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
            <Flame className="h-3.5 w-3.5 fill-current text-amber-500" />
            <span>{userProgress?.streakDays || 1} STREAK</span>
          </div>

          <div className="flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
            <Star className="h-3.5 w-3.5 fill-current text-purple-600" />
            <span>{userProgress?.xp || 0} XP</span>
          </div>

          <div className="flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
            <Heart className="h-3.5 w-3.5 fill-current text-rose-500" />
            <span>5/5 HEARTS</span>
          </div>
        </div>
      </div>

      <div className="flex-1 pb-12 px-4 md:px-8 flex flex-col items-center">
        <p className="text-xs text-muted-foreground max-w-xl text-center mb-8 leading-relaxed">{course.description}</p>

        {/* Snake Curriculum Modules */}
        <div className="w-full max-w-xl space-y-16">
          {sortedModules.map((mod, modIndex) => {
            const modLessons = lessons
              .filter(l => l.moduleId === mod.id)
              .sort((a, b) => a.orderIndex - b.orderIndex);

            const completedCount = modLessons.filter(l => completedLessonIds.has(l.id)).length;
            const isProLocked = modIndex >= 3;

            return (
              <div key={mod.id} className="relative space-y-8">
                {/* Duolingo Unit Header Banner */}
                <div className={cn(
                  "p-5 rounded-2xl shadow-sm border flex items-center justify-between transition-all",
                  isProLocked ? "bg-purple-50 border-purple-200 text-purple-900" : "bg-emerald-600 text-white border-emerald-700"
                )}>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80 block mb-0.5">
                      UNIT {modIndex + 1}
                    </span>
                    <h4 className="text-base font-extrabold line-clamp-1">{mod.title}</h4>
                  </div>

                  <div className="flex items-center gap-3">
                    {isProLocked ? (
                      <span className="inline-flex items-center gap-1 bg-purple-200/60 text-purple-900 text-xs font-bold px-3 py-1 rounded-full border border-purple-300">
                        <Crown className="w-3.5 h-3.5 text-purple-700" /> PRO UNIT
                      </span>
                    ) : (
                      <span className="bg-emerald-700/80 text-white text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/40">
                        {completedCount} / {modLessons.length} Lessons
                      </span>
                    )}
                  </div>
                </div>

                {/* Curvy Winding Node Path Container */}
                <div className="flex flex-col items-center relative py-4">
                  {modLessons.map((lesson, lessonIndex) => {
                    const currentIdx = globalLessonIndex++;
                    const isCompleted = completedLessonIds.has(lesson.id);
                    let isCurrent = false;

                    if (!isCompleted && !firstUncompletedLessonId && !isProLocked) {
                      isCurrent = true;
                      firstUncompletedLessonId = lesson.id;
                    }
                    const isLocked = (!isCompleted && !isCurrent) || isProLocked;

                    // Curvy snake horizontal offset calculation
                    const offsetX = OFFSET_PATTERN[currentIdx % OFFSET_PATTERN.length];

                    return (
                      <div
                        key={lesson.id}
                        className="relative z-10 my-4 flex flex-col items-center"
                        style={{ transform: `translateX(${offsetX}px)` }}
                      >
                        {/* Duolingo Floating "START" Badge on Active Node */}
                        {isCurrent && (
                          <motion.div
                            initial={{ y: -6, opacity: 0 }}
                            animate={{ y: [0, -6, 0], opacity: 1 }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                            className="absolute -top-10 z-20 bg-purple-700 text-white text-[11px] font-extrabold uppercase px-3.5 py-1.5 rounded-full shadow-lg border border-purple-500 flex items-center gap-1 tracking-wider"
                          >
                            <span>START</span>
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-purple-700 rotate-45" />
                          </motion.div>
                        )}

                        {/* Duolingo Popover Card trigger on Node Click */}
                        <Popover
                          open={selectedLesson?.id === lesson.id}
                          onOpenChange={(open) => setSelectedLesson(open ? lesson : null)}
                        >
                          <PopoverTrigger asChild>
                            <motion.button
                              whileHover={!isLocked || isProLocked ? { scale: 1.08 } : {}}
                              whileTap={!isLocked || isProLocked ? { scale: 0.92 } : {}}
                              onClick={() => {
                                if (isProLocked) {
                                  setIsProModalOpen(true);
                                }
                              }}
                              className={cn(
                                "w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center font-bold text-lg relative transition-all duration-150 outline-none select-none",
                                isCompleted
                                  ? "bg-emerald-500 text-white border-b-[6px] border-emerald-700 shadow-md hover:bg-emerald-400 active:translate-y-1.5 active:border-b-0"
                                  : isCurrent
                                  ? "bg-purple-600 text-white border-b-[6px] border-purple-900 shadow-xl hover:bg-purple-500 active:translate-y-1.5 active:border-b-0 ring-4 ring-purple-300"
                                  : isProLocked
                                  ? "bg-amber-400 text-amber-950 border-b-[6px] border-amber-600 shadow-md hover:bg-amber-300"
                                  : "bg-muted text-muted-foreground border-b-[5px] border-border cursor-not-allowed opacity-70"
                              )}
                            >
                              {isProLocked ? (
                                <Crown className="h-8 w-8 drop-shadow-sm" />
                              ) : isCompleted ? (
                                <Check className="h-10 w-10 stroke-[3.5] drop-shadow-sm" />
                              ) : isLocked ? (
                                <Lock className="h-7 w-7 opacity-70" />
                              ) : (
                                <Play className="h-9 w-9 fill-current ml-1 drop-shadow-sm" />
                              )}
                            </motion.button>
                          </PopoverTrigger>

                          {/* Duolingo Popover Card preview */}
                          <PopoverContent
                            side="top"
                            align="center"
                            className="w-64 p-4 bg-popover border-2 border-border rounded-2xl shadow-xl space-y-3"
                          >
                            <div className="flex items-center justify-between border-b border-border pb-2">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                                Lesson {lessonIndex + 1}
                              </span>
                              <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 fill-current" /> +15 XP
                              </span>
                            </div>

                            <h5 className="font-bold text-sm text-foreground leading-snug">{lesson.title}</h5>

                            <Button
                              type="button"
                              className="w-full font-extrabold rounded-xl text-xs py-2.5 uppercase tracking-wider"
                              disabled={isLocked && !isProLocked}
                              onClick={() => {
                                if (isProLocked) {
                                  setIsProModalOpen(true);
                                } else {
                                  playStart();
                                  router.push(`/clarities/${course.id}/lesson/${lesson.id}`);
                                }
                              }}
                            >
                              {isCompleted ? "PRACTICE (+10 XP)" : isCurrent ? "START LESSON (+15 XP)" : isProLocked ? "UNLOCK PRO" : "LOCKED"}
                            </Button>
                          </PopoverContent>
                        </Popover>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pro Upgrade Modal */}
      <Dialog open={isProModalOpen} onOpenChange={setIsProModalOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl border border-border bg-popover text-popover-foreground">
          <DialogHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center mb-2 shadow-sm">
              <Crown className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-bold">Upgrade to Pro</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              You've completed 3 free units! Unlock the rest of this roadmap and unlimited Clarities.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="flex justify-between items-center p-3.5 border border-border rounded-xl bg-card cursor-pointer hover:border-purple-300 transition">
              <div>
                <h5 className="font-bold text-sm">Monthly Plan</h5>
                <p className="text-xs text-muted-foreground">Billed monthly</p>
              </div>
              <div className="text-right">
                <p className="font-extrabold text-base">₹499</p>
                <p className="text-[10px] text-muted-foreground">/ month</p>
              </div>
            </div>
            <div className="flex justify-between items-center p-3.5 border-2 border-purple-600 rounded-xl bg-purple-50/50 cursor-pointer shadow-sm relative">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[9px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full">
                BEST VALUE
              </div>
              <div>
                <h5 className="font-bold text-sm text-foreground">Yearly Plan</h5>
                <p className="text-xs text-muted-foreground">Billed annually</p>
              </div>
              <div className="text-right">
                <p className="font-extrabold text-base text-purple-700">₹3999</p>
                <p className="text-[10px] text-muted-foreground">/ year</p>
              </div>
            </div>
          </div>
          <DialogFooter className="sm:justify-center pt-2">
            <Button size="sm" className="w-full font-extrabold rounded-xl" onClick={() => setIsProModalOpen(false)}>
              Upgrade Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};


