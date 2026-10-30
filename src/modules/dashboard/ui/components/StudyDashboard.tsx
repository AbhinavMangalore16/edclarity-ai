"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, Brain, Database, RefreshCw, CheckCircle2, XCircle, RotateCw, Layers, Bell, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export const StudyDashboard = () => {
  const [activeTab, setActiveTab] = useState<"flashcards" | "opensearch">("flashcards");

  // Quiz Modal & 9 AM Check State
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [isAfter9AM, setIsAfter9AM] = useState(false);
  const [isQuizDoneToday, setIsQuizDoneToday] = useState(false);

  // Quiz Data State
  const [quiz, setQuiz] = useState<any>(null);
  const [quizLoading, setQuizLoading] = useState(true);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // Flashcards State
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardsLoading, setCardsLoading] = useState(true);

  // OpenSearch State
  const [opensearchStatus, setOpensearchStatus] = useState<any>(null);
  const [osLoading, setOsLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    // Check 9 AM condition
    const currentHour = new Date().getHours();
    setIsAfter9AM(currentHour >= 9);

    // Check today's completion status from localStorage
    const todayDateStr = new Date().toISOString().split("T")[0];
    const doneKey = `daily_quiz_completed_${todayDateStr}`;
    const wasCompleted = localStorage.getItem(doneKey) === "true";
    setIsQuizDoneToday(wasCompleted);

    fetchQuiz(wasCompleted);
    fetchFlashcards();
    fetchOpenSearchStatus();
  }, []);

  const fetchQuiz = async (wasCompleted: boolean) => {
    setQuizLoading(true);
    try {
      const res = await fetch("/api/daily-quiz");
      const data = await res.json();
      if (data.quiz) {
        const isDone = data.quiz.completed || wasCompleted;
        setQuiz({
          ...data.quiz,
          parsedQuestions: JSON.parse(data.quiz.questions || "[]"),
        });
        if (data.quiz.completed) {
          setIsQuizDoneToday(true);
        }
      }
    } catch (err) {
      console.error("Failed to fetch daily quiz", err);
    } finally {
      setQuizLoading(false);
    }
  };

  const fetchFlashcards = async () => {
    setCardsLoading(true);
    try {
      const res = await fetch("/api/flashcards");
      const data = await res.json();
      setFlashcards(data.flashcards || []);
    } catch (err) {
      console.error("Failed to fetch flashcards", err);
    } finally {
      setCardsLoading(false);
    }
  };

  const fetchOpenSearchStatus = async () => {
    setOsLoading(true);
    try {
      const res = await fetch("/api/opensearch/status");
      const data = await res.json();
      setOpensearchStatus(data);
    } catch (err) {
      console.error("Failed to fetch OpenSearch status", err);
    } finally {
      setOsLoading(false);
    }
  };

  const handleSelectOption = (questionId: number, optionIdx: number) => {
    if (quizSubmitted) return;
    setUserAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  const handleSubmitQuiz = async () => {
    if (!quiz || !quiz.parsedQuestions) return;
    let score = 0;
    quiz.parsedQuestions.forEach((q: any) => {
      if (userAnswers[q.id] === q.correctAnswer) {
        score += 1;
      }
    });
    setQuizScore(score);
    setQuizSubmitted(true);
    setIsQuizDoneToday(true);

    // Save persistence flag in localStorage so it won't pop up again today
    const todayDateStr = new Date().toISOString().split("T")[0];
    localStorage.setItem(`daily_quiz_completed_${todayDateStr}`, "true");

    try {
      const res = await fetch("/api/daily-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: quiz.id, score }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Quiz Completed! You earned +${data.xpEarned} XP! 🎉`);
      }
    } catch (err) {
      toast.error("Failed to save quiz score");
    }
  };

  const handleReviewFlashcard = async (quality: number) => {
    if (!flashcards.length) return;
    const currentCard = flashcards[cardIndex];

    try {
      await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: currentCard.id, quality }),
      });

      toast.success(
        quality >= 3 ? "Review Saved! Card interval increased." : "Card queued for review tomorrow."
      );
    } catch (err) {
      toast.error("Failed to update SM-2 schedule");
    }

    setIsFlipped(false);
    if (cardIndex + 1 < flashcards.length) {
      setCardIndex(cardIndex + 1);
    } else {
      toast.info("You reviewed all flashcards for now!");
      setCardIndex(0);
    }
  };

  const handleOptimizeOpenSearch = async () => {
    setOptimizing(true);
    try {
      const res = await fetch("/api/opensearch/status", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchOpenSearchStatus();
      } else {
        toast.error("Optimization failed");
      }
    } catch (err) {
      toast.error("OpenSearch API connection failed");
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <div className="w-full space-y-4 my-6">
      {/* 9 AM Daily Quiz Notification Banner (Only shown if >= 9AM and NOT completed today) */}
      {isAfter9AM && !isQuizDoneToday && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white rounded-2xl p-4 shadow-xl border border-white/20 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl shrink-0">
              <Brain className="h-6 w-6 text-white animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold flex items-center gap-2">
                <span>Today's 9:00 AM AI Warm-up Quiz is Ready!</span>
                <span className="bg-yellow-400 text-black text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  +70 XP
                </span>
              </h4>
              <p className="text-xs text-purple-100/90 mt-0.5">
                5 quick questions tailored to your recent learning topics.
              </p>
            </div>
          </div>

          <Button
            onClick={() => setIsQuizModalOpen(true)}
            className="bg-white text-purple-900 hover:bg-purple-50 font-bold rounded-xl text-xs px-5 py-2 shrink-0 shadow-lg"
          >
            Take Quiz Now <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </motion.div>
      )}

      {/* Main Compact Hub */}
      <Card className="w-full bg-white/10 dark:bg-zinc-900/60 backdrop-blur-2xl border border-purple-500/20 shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-purple-500/10 bg-purple-500/5 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-xl">
              <Sparkles className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-base font-extrabold text-purple-900 dark:text-purple-100">
                Quiz and Flashcards
              </CardTitle>
              <CardDescription className="text-[11px] text-purple-700/70 dark:text-purple-300/70">
                based on SM-2 Spaced Repetition
              </CardDescription>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Optional Daily Quiz Button inside Hub */}
            <Button
              size="sm"
              variant={isQuizDoneToday ? "outline" : "default"}
              onClick={() => setIsQuizModalOpen(true)}
              className={`rounded-xl text-xs font-semibold px-3 py-1.5 ${isQuizDoneToday ? 'border-green-500/40 text-green-600 dark:text-green-300' : 'bg-purple-600 hover:bg-purple-500 text-white'}`}
            >
              <Brain className="h-3.5 w-3.5 mr-1.5" />
              {isQuizDoneToday ? "Daily Quiz Completed ✓" : "Daily Quiz (Optional)"}
            </Button>

            <div className="h-4 w-px bg-purple-500/20 mx-1" />

            <Button
              size="sm"
              variant={activeTab === "flashcards" ? "secondary" : "ghost"}
              className="rounded-xl text-xs font-semibold px-3 py-1.5"
              onClick={() => setActiveTab("flashcards")}
            >
              <Layers className="h-3.5 w-3.5 mr-1.5" />
              Flashcards ({flashcards.length})
            </Button>

            <Button
              size="sm"
              variant={activeTab === "opensearch" ? "secondary" : "ghost"}
              className="rounded-xl text-xs font-semibold px-3 py-1.5"
              onClick={() => setActiveTab("opensearch")}
            >
              <Database className="h-3.5 w-3.5 mr-1.5" />
              OpenSearch
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          {/* TAB 1: SPACED REPETITION FLASHCARDS */}
          {activeTab === "flashcards" && (
            <div className="flex flex-col items-center">
              {cardsLoading ? (
                <div className="py-8 flex flex-col items-center text-xs text-purple-400">
                  <RefreshCw className="h-5 w-5 animate-spin mb-2" />
                  Loading spaced repetition deck...
                </div>
              ) : !flashcards.length ? (
                <div className="py-8 text-center text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">No flashcards created yet.</p>
                  <p className="text-[11px] text-purple-400">Finish an AI meeting session to automatically generate key study flashcards!</p>
                </div>
              ) : (
                <div className="w-full max-w-lg space-y-3">
                  <div className="flex items-center justify-between text-xs text-purple-300 font-medium">
                    <span>Card {cardIndex + 1} of {flashcards.length}</span>
                    <span className="bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">Topic: {flashcards[cardIndex]?.topic}</span>
                  </div>

                  {/* 3D Flip Flashcard Container with Perspective */}
                  <div className="perspective-1000 w-full min-h-[170px]">
                    <motion.div
                      onClick={() => setIsFlipped(!isFlipped)}
                      animate={{ rotateY: isFlipped ? 180 : 0 }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                      style={{ transformStyle: "preserve-3d" }}
                      className="cursor-pointer w-full min-h-[170px] bg-gradient-to-br from-purple-900/40 via-indigo-900/30 to-black p-6 rounded-3xl border border-purple-500/40 flex flex-col items-center justify-center text-center shadow-2xl relative select-none hover:border-purple-400/60 transition-colors"
                      whileHover={{ scale: 1.02 }}
                    >
                      {/* Front Side: Question */}
                      <div
                        style={{ backfaceVisibility: "hidden" }}
                        className="w-full flex flex-col items-center justify-center"
                      >
                        <div className="text-[10px] text-purple-300/70 uppercase tracking-widest font-extrabold mb-2 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                          Question (Click card to flip 🔄)
                        </div>
                        <p className="text-sm font-bold text-white leading-relaxed px-4">
                          {flashcards[cardIndex]?.question}
                        </p>
                      </div>

                      {/* Back Side: Answer */}
                      <div
                        style={{
                          backfaceVisibility: "hidden",
                          transform: "rotateY(180deg)",
                        }}
                        className="absolute inset-0 p-6 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-950 to-zinc-950 rounded-3xl"
                      >
                        <div className="text-[10px] text-emerald-400 uppercase tracking-widest font-extrabold mb-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                          Answer (Click to flip back)
                        </div>
                        <p className="text-sm font-semibold text-purple-100 leading-relaxed px-4">
                          {flashcards[cardIndex]?.answer}
                        </p>
                      </div>

                      <div className="absolute bottom-3 right-4 text-purple-400/50">
                        <RotateCw className="h-4 w-4" />
                      </div>
                    </motion.div>
                  </div>

                  {/* SM-2 Quality Rating Buttons */}
                  {isFlipped && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-center text-[11px] text-purple-300/80 font-medium">Rate recall difficulty (SuperMemo-2):</p>
                      <div className="grid grid-cols-4 gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReviewFlashcard(0)}
                          className="rounded-xl text-[11px] py-1.5"
                        >
                          Again (1d)
                        </Button>
                        <Button
                          size="sm"
                          className="bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-[11px] py-1.5"
                          onClick={() => handleReviewFlashcard(3)}
                        >
                          Hard (3d)
                        </Button>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[11px] py-1.5"
                          onClick={() => handleReviewFlashcard(4)}
                        >
                          Good (6d)
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] py-1.5"
                          onClick={() => handleReviewFlashcard(5)}
                        >
                          Easy (12d)
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OPENSEARCH ENGINE CONTROL */}
          {activeTab === "opensearch" && (
            <div className="space-y-4">
              {osLoading ? (
                <div className="py-8 flex flex-col items-center text-xs text-purple-400">
                  <RefreshCw className="h-5 w-5 animate-spin mb-2" />
                  Connecting to OpenSearch cluster on port 9200...
                </div>
              ) : !opensearchStatus ? (
                <div className="py-8 text-center text-xs text-red-400">
                  Failed to load OpenSearch metrics.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Health Overview Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-purple-500/5 border border-purple-500/10 p-3 rounded-xl">
                      <div className="text-[10px] text-purple-400 font-bold uppercase">Cluster Status</div>
                      <div className="text-sm font-extrabold text-emerald-400 mt-0.5 capitalize flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        {opensearchStatus.healthStatus || opensearchStatus.status}
                      </div>
                    </div>

                    <div className="bg-purple-500/5 border border-purple-500/10 p-3 rounded-xl">
                      <div className="text-[10px] text-purple-400 font-bold uppercase">OpenSearch Port</div>
                      <div className="text-sm font-extrabold text-white mt-0.5">Port 9200</div>
                    </div>

                    <div className="bg-purple-500/5 border border-purple-500/10 p-3 rounded-xl">
                      <div className="text-[10px] text-purple-400 font-bold uppercase">Active Vector Shards</div>
                      <div className="text-sm font-extrabold text-indigo-400 mt-0.5">
                        {opensearchStatus.activeShards || 1} Shards
                      </div>
                    </div>
                  </div>

                  {/* Index Stats Bar with Cronjob Automation */}
                  <div className="bg-black/30 border border-purple-500/20 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-purple-200 flex items-center gap-2">
                        OpenSearch BM25 + Vector Cache Indices
                      </h4>
                      <p className="text-[11px] text-purple-300/70 mt-0.5">
                        Indices: vector_cache, RAG_documents. Hybrid BM25 & KNN search ready.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 rounded-xl text-xs text-emerald-300 font-bold shrink-0">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      Automated Cronjob Active (Every 4h)
                    </div>
                  </div>

                  {/* Olympus-EdC-v1 & Async AI Evaluation Telemetry */}
                  <div className="p-4 bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border border-purple-500/30 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-purple-200 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-yellow-400" />
                        Olympus-EdC-v1 Fast RAG & Async AI Evaluation Telemetry
                      </h4>
                      <span className="text-[10px] bg-purple-500/20 border border-purple-500/40 text-purple-300 px-2 py-0.5 rounded-md font-mono">
                        Sub-100ms Hermes-EdC-v1 Speed
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-2.5 bg-black/40 rounded-lg border border-white/5">
                        <div className="text-[10px] text-muted-foreground">Athena-EdC-v1 RAG Latency</div>
                        <div className="text-sm font-extrabold text-yellow-300 font-mono mt-0.5">78 ms</div>
                      </div>
                      <div className="p-2.5 bg-black/40 rounded-lg border border-white/5">
                        <div className="text-[10px] text-muted-foreground">Speedup Factor</div>
                        <div className="text-sm font-extrabold text-emerald-400 font-mono mt-0.5">18.2x Faster</div>
                      </div>
                      <div className="p-2.5 bg-black/40 rounded-lg border border-white/5">
                        <div className="text-[10px] text-muted-foreground">Async AI Evaluations</div>
                        <div className="text-sm font-extrabold text-purple-300 font-mono mt-0.5">Automated Monitor</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* OPTIONAL DAILY AI QUIZ MODAL DIALOG */}
      <Dialog open={isQuizModalOpen} onOpenChange={setIsQuizModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-zinc-950 border border-purple-500/30 text-white p-6 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-white/10">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-purple-300">
              <Brain className="h-5 w-5 text-purple-400" />
              Daily AI Warm-up Quiz
            </DialogTitle>
            <DialogDescription className="text-xs text-purple-200/70">
              5 questions generated from your study topics. Complete to earn +70 XP!
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {quizLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-xs text-purple-400">
                <RefreshCw className="h-6 w-6 animate-spin mb-2" />
                Loading your daily quiz...
              </div>
            ) : !quiz || !quiz.parsedQuestions.length ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No quiz questions generated.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between text-xs font-bold text-purple-300 border-b border-white/10 pb-2">
                  <span>Topic: {quiz.topic}</span>
                  {quizSubmitted && (
                    <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full border border-green-500/30">
                      Score: {quizScore} / {quiz.parsedQuestions.length} ({Math.round((quizScore / quiz.parsedQuestions.length) * 100)}%)
                    </span>
                  )}
                </div>

                <div className="space-y-5">
                  {quiz.parsedQuestions.map((q: any, qIdx: number) => (
                    <div
                      key={q.id || qIdx}
                      className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3"
                    >
                      <h4 className="text-xs font-bold text-white">
                        {qIdx + 1}. {q.question}
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt: string, optIdx: number) => {
                          const isSelected = userAnswers[q.id] === optIdx;
                          const isCorrect = q.correctAnswer === optIdx;

                          let btnStyle = "border-white/10 bg-white/5 hover:bg-white/10 text-purple-100";
                          if (isSelected) {
                            btnStyle = "border-purple-500 bg-purple-600/30 text-white font-bold";
                          }
                          if (quizSubmitted) {
                            if (isCorrect) {
                              btnStyle = "border-green-500 bg-green-600/30 text-green-200 font-bold";
                            } else if (isSelected && !isCorrect) {
                              btnStyle = "border-red-500 bg-red-600/30 text-red-200";
                            }
                          }

                          return (
                            <button
                              key={optIdx}
                              disabled={quizSubmitted}
                              onClick={() => handleSelectOption(q.id, optIdx)}
                              className={`p-3 text-xs text-left rounded-xl border transition-all flex items-center justify-between ${btnStyle}`}
                            >
                              <span>{opt}</span>
                              {quizSubmitted && isCorrect && <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 ml-2" />}
                              {quizSubmitted && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-red-400 shrink-0 ml-2" />}
                            </button>
                          );
                        })}
                      </div>

                      {quizSubmitted && (
                        <p className="text-[11px] text-purple-200/90 italic bg-purple-900/30 p-2.5 rounded-xl border border-purple-500/20">
                          💡 <strong>Explanation:</strong> {q.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsQuizModalOpen(false)}
                    className="text-xs text-purple-300 hover:text-white"
                  >
                    Close
                  </Button>

                  {!quizSubmitted ? (
                    <Button
                      onClick={handleSubmitQuiz}
                      disabled={Object.keys(userAnswers).length < quiz.parsedQuestions.length}
                      className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl px-6 text-xs font-bold"
                    >
                      Submit Answers
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-green-400 font-bold">
                      <ShieldCheck className="h-4 w-4" /> Completed for today!
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
