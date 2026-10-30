"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, ArrowLeft, Check, ChevronRight, Sparkles, RefreshCw, BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import useSound from "use-sound";

interface ClaritiesLessonProps {
  courseId: string;
  lessonId: string;
}

export const ClaritiesLesson = ({ courseId, lessonId }: ClaritiesLessonProps) => {
  const router = useRouter();
  const trpc = useTRPC();
  
  // We need to fetch course details to find the lesson and check if content exists
  const { data: courseData, isLoading: isCourseLoading } = useQuery(trpc.clarities.getCourseDetails.queryOptions({ courseId }));
  
  const [content, setContent] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0); // 0 to slides.length + questions.length
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [achievedStreak, setAchievedStreak] = useState<number | null>(null);

  const [playCorrect] = useSound("/assets/correct.mp3", { volume: 0.6 });
  const [playWrong] = useSound("/assets/wrong.mp3", { volume: 0.6 });
  const [playAchievement] = useSound("/assets/achievement unlock.mp3", { volume: 0.8 });
  const [playStreakUp] = useSound("/assets/streak level up.mp3", { volume: 0.8 });
  const [playSelect] = useSound("/assets/clickselect.mp3", { volume: 0.5 });

  const generateContentMutation = useMutation(trpc.clarities.generateLessonContent.mutationOptions({
    onSuccess: (data) => {
      setContent(data);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to generate lesson content");
      router.push(`/clarities/${courseId}`);
    }
  }));

  const completeMutation = useMutation(trpc.clarities.completeLesson.mutationOptions({
    onSuccess: (data) => {
      // Show success screen
      setIsCompleted(true);
      setAchievedStreak(data.streak);
    }
  }));

  useEffect(() => {
    if (isCompleted && achievedStreak !== null) {
      const milestones = [1, 7, 14, 30, 90, 180, 365];
      const isMilestone = milestones.includes(achievedStreak) || (achievedStreak > 365 && achievedStreak % 365 === 0);
      
      if (isMilestone) {
        playAchievement();
      } else {
        playStreakUp();
      }
    }
  }, [isCompleted, achievedStreak, playAchievement, playStreakUp]);

  useEffect(() => {
    if (courseData) {
      const lesson = courseData.lessons.find(l => l.id === lessonId);
      if (lesson) {
        if (lesson.content) {
          setContent(JSON.parse(lesson.content));
        } else {
          // Trigger generation on the fly
          generateContentMutation.mutate({ lessonId });
        }
      }
    }
  }, [courseData, lessonId]);

  if (isCourseLoading) return null;

  if (!content) {
    // The "Premium" Loading Screen (Glassmorphic)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xl">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative w-full max-w-md p-8 rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-2xl flex flex-col items-center text-center overflow-hidden"
        >
          {/* Subtle gradient background effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-primary/10 opacity-50" />
          
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
            className="mb-8"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full" />
              <Sparkles className="h-20 w-20 text-primary relative z-10 animate-pulse" />
            </div>
          </motion.div>
          
          <h2 className="text-2xl font-bold tracking-tight text-foreground relative z-10 mb-2">Building Your Curriculum</h2>
          <p className="text-muted-foreground relative z-10">
            Our AI is crafting interactive slides and challenges customized just for you.
          </p>
          
          <div className="mt-8 w-full relative z-10 flex flex-col gap-2">
            <Progress value={generateContentMutation.isPending ? undefined : 100} className="h-2 w-full bg-primary/20" />
            <span className="text-xs text-muted-foreground animate-pulse">Synthesizing knowledge...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  const { slides, questions } = content;
  const totalSteps = slides.length + questions.length;
  const progressPercent = ((currentStep) / totalSteps) * 100;

  const isSlide = currentStep < slides.length;
  const isQuestion = currentStep >= slides.length && currentStep < totalSteps;
  
  const currentSlide = isSlide ? slides[currentStep] : null;
  const currentQuestionIndex = currentStep - slides.length;
  const currentQuestion = isQuestion ? questions[currentQuestionIndex] : null;

  const handleNext = () => {
    if (isSlide) {
      setCurrentStep(s => s + 1);
    } else if (isQuestion) {
      if (!isAnswerChecked) {
        // Check answer
        if (selectedOption === null) {
          toast.error("Please select an option");
          return;
        }
        setIsAnswerChecked(true);
        if (selectedOption === currentQuestion.correctOptionIndex) {
          playCorrect();
        } else {
          playWrong();
        }
      } else {
        // Move to next step
        if (selectedOption !== currentQuestion.correctOptionIndex) {
          // In a "Lives" system, we'd deduct a life here. For now, we let them proceed or force them to try again.
          // Let's force them to retry if wrong.
          setIsAnswerChecked(false);
          setSelectedOption(null);
          return;
        }
        
        setIsAnswerChecked(false);
        setSelectedOption(null);
        
        if (currentStep === totalSteps - 1) {
          // Complete lesson
          completeMutation.mutate({ lessonId });
        } else {
          setCurrentStep(s => s + 1);
        }
      }
    }
  };

  if (isCompleted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md bg-card border-2 border-border rounded-3xl p-8 shadow-2xl text-center space-y-6 flex flex-col items-center"
        >
          {/* Victory Badge */}
          <div className="h-28 w-28 bg-emerald-500 rounded-full flex items-center justify-center text-white border-b-[6px] border-emerald-700 shadow-xl">
            <Check className="h-16 w-16 stroke-[4]" />
          </div>

          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Lesson Complete!</h1>
            <p className="text-xs text-muted-foreground mt-1">You've mastered another key concept step in your roadmap.</p>
          </div>

          {/* Gamified Rewards Card Grid */}
          <div className="grid grid-cols-2 gap-3 w-full pt-2">
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 block mb-1">TOTAL XP</span>
              <p className="text-xl font-extrabold text-purple-700 flex items-center justify-center gap-1">
                +15 XP
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 block mb-1">STREAK</span>
              <p className="text-xl font-extrabold text-amber-700 flex items-center justify-center gap-1">
                {achievedStreak || 1} Days 🔥
              </p>
            </div>
          </div>

          {/* 3D Duolingo CTA Button */}
          <Button 
            type="button"
            className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-sm border-b-[6px] border-emerald-800 rounded-2xl shadow-lg active:translate-y-1 active:border-b-0 transition-all" 
            onClick={() => router.push(`/clarities/${courseId}`)}
          >
            CONTINUE
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <header className="h-16 border-b flex items-center px-4 md:px-8 gap-4 bg-background/80 backdrop-blur-md sticky top-0">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/clarities/${courseId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Progress value={progressPercent} className="flex-1 h-3 rounded-full" />
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground px-2 py-1 bg-muted rounded-full">
            {isSlide ? `Slide ${currentStep + 1}/${slides.length}` : `Question ${currentQuestionIndex + 1}/${questions.length}`}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-primary/20 text-xs font-semibold gap-1.5 px-3 hover:border-primary/40"
            onClick={() => {
              setIsAnswerChecked(false);
              setSelectedOption(null);
              generateContentMutation.mutate({ lessonId, regenerate: true });
            }}
            disabled={generateContentMutation.isPending}
            title="Generate a fresh batch of 6-10 questions for this lesson"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-primary", generateContentMutation.isPending && "animate-spin")} />
            <span className="hidden sm:inline">{generateContentMutation.isPending ? "Generating..." : "Regenerate Questions"}</span>
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {isSlide && (
            <motion.div
              key={`slide-${currentStep}`}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              className="w-full max-w-3xl"
            >
              <Card className="border border-white/10 shadow-2xl bg-white/5 dark:bg-black/20 backdrop-blur-2xl rounded-[2rem] p-6 md:p-12">
                <CardContent className="space-y-8 pt-0">
                  <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-primary to-purple-400">{currentSlide.title}</h2>
                  <div className="prose prose-xl dark:prose-invert max-w-none text-muted-foreground/90 leading-relaxed font-medium">
                    {currentSlide.content.split('\\n').map((p: string, i: number) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {isQuestion && (
            <motion.div
              key={`question-${currentStep}`}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              className="w-full max-w-3xl"
            >
              <Card className="border border-white/10 shadow-2xl bg-white/5 dark:bg-black/20 backdrop-blur-2xl rounded-[2rem] p-6 md:p-12">
                <CardContent className="space-y-8 pt-0">
                  <h2 className="text-3xl md:text-4xl font-extrabold leading-tight">{currentQuestion.question}</h2>
                  <div className="grid gap-4">
                    {currentQuestion.options.map((option: string, idx: number) => {
                      const isSelected = selectedOption === idx;
                      let optionClass = "border-2 border-border/50 bg-background/50 hover:bg-muted/80 hover:border-primary/30";
                      if (isSelected) {
                        optionClass = "border-[3px] border-primary bg-primary/10 shadow-md shadow-primary/20 scale-[1.02]";
                      }
                      
                      if (isAnswerChecked) {
                        if (idx === currentQuestion.correctOptionIndex) {
                          optionClass = "border-[3px] border-green-500 bg-green-500/20 text-green-700 dark:text-green-400 shadow-lg shadow-green-500/30 scale-[1.02]";
                        } else if (isSelected) {
                          optionClass = "border-[3px] border-red-500 bg-red-500/20 text-red-700 dark:text-red-400 shadow-md shadow-red-500/20";
                        } else {
                          optionClass = "opacity-40 border-border bg-background/50 scale-95";
                        }
                      }

                      return (
                        <Button
                          key={idx}
                          variant="outline"
                          className={cn("h-auto py-5 px-6 justify-start text-left text-lg font-semibold rounded-2xl whitespace-normal transition-all duration-300 active:scale-95", optionClass)}
                          onClick={() => {
                            if (!isAnswerChecked) {
                              playSelect();
                              setSelectedOption(idx);
                            }
                          }}
                          disabled={isAnswerChecked && idx !== currentQuestion.correctOptionIndex && !isSelected}
                        >
                          <span className={cn(
                            "mr-4 w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                            isSelected && !isAnswerChecked && "border-primary bg-primary text-primary-foreground",
                            isAnswerChecked && idx === currentQuestion.correctOptionIndex && "border-green-500 bg-green-500 text-white",
                            isAnswerChecked && isSelected && idx !== currentQuestion.correctOptionIndex && "border-red-500 bg-red-500 text-white"
                          )}>
                            {idx + 1}
                          </span>
                          {option}
                        </Button>
                      );
                    })}
                  </div>

                  {isAnswerChecked && currentQuestion.explanation && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 p-5 rounded-2xl border border-primary/20 bg-primary/5 text-foreground/90 space-y-1.5"
                    >
                      <span className="font-bold text-primary flex items-center gap-2 text-base">
                        <BookOpen className="h-5 w-5" /> Explanation & Key Concept
                      </span>
                      <p className="leading-relaxed text-sm font-medium text-muted-foreground">{currentQuestion.explanation}</p>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Area */}
      <footer className={cn(
        "border-t p-4 md:p-6 flex justify-between items-center bg-background/95 backdrop-blur-md sticky bottom-0",
        isAnswerChecked && selectedOption === currentQuestion?.correctOptionIndex && "bg-green-500/10 border-green-500/20",
        isAnswerChecked && selectedOption !== currentQuestion?.correctOptionIndex && "bg-red-500/10 border-red-500/20"
      )}>
        <div className="w-1/3">
          {/* Empty left space for balance, or hint button */}
        </div>
        
        <div className="w-1/3 text-center">
          {isAnswerChecked && selectedOption === currentQuestion?.correctOptionIndex && (
            <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-green-500 font-bold text-lg flex items-center justify-center gap-2">
              <Check className="h-6 w-6" /> Correct!
            </motion.p>
          )}
          {isAnswerChecked && selectedOption !== currentQuestion?.correctOptionIndex && (
            <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-red-500 font-bold text-lg">
              Not quite right.
            </motion.p>
          )}
        </div>

        <div className="w-1/3 flex justify-end">
          <Button 
            size="lg" 
            className={cn(
              "rounded-full px-8 font-bold text-lg tracking-wide",
              isAnswerChecked && selectedOption === currentQuestion?.correctOptionIndex && "bg-green-500 hover:bg-green-600 text-white"
            )}
            onClick={handleNext}
            disabled={completeMutation.isPending}
          >
            {isSlide ? "Continue" : isAnswerChecked ? "Next" : "Check"}
            {!isAnswerChecked && <ChevronRight className="ml-2 h-5 w-5" />}
          </Button>
        </div>
      </footer>
    </div>
  );
};
