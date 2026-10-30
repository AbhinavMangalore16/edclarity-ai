"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Sparkles, Trophy } from "lucide-react";
import { motion } from "framer-motion";

export const Finish = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#1E164F] via-[#2A1B6F] to-[#120B2E] p-6 relative overflow-hidden">
            {/* Background Glowing Aura Ring */}
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-indigo-500/30 via-purple-500/30 to-emerald-500/30 blur-3xl -z-10"
            />

            {/* Celebratory Card Container */}
            <motion.div 
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="w-full max-w-md bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 md:p-10 shadow-2xl flex flex-col items-center text-center space-y-6 relative"
            >
                {/* Glowing Celebration Trophy / Icon */}
                <motion.div 
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.2 }}
                    className="relative"
                >
                    <div className="h-20 w-20 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-emerald-500/40 border border-emerald-300/30">
                        <CheckCircle2 className="h-10 w-10" />
                    </div>
                    <motion.div 
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute -top-2 -right-2 bg-yellow-400 text-black p-1.5 rounded-full shadow-lg"
                    >
                        <Sparkles className="h-4 w-4" />
                    </motion.div>
                </motion.div>
                
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30">
                        <Trophy className="h-3.5 w-3.5" />
                        Session Complete
                    </div>
                    <h3 className="text-2xl font-extrabold text-white tracking-tight pt-1">Meeting Finished 🎉</h3>
                    <p className="text-sm text-purple-200/80 leading-relaxed">
                        Your study summary, AI insights, and SM-2 flashcards are now compiled and saved to your dashboard!
                    </p>
                </div>

                <Button asChild size="lg" className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-transform active:scale-95">
                    <Link href="/meetings" className="flex items-center justify-center gap-2 py-3">
                        Return to Meetings <ArrowRight className="h-4 w-4" />
                    </Link>
                </Button>
            </motion.div>
        </div>
    );
};