"use client"
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, PhoneOff, Video, VideoOff, MonitorUp, Sparkles, MessageSquare, Hand } from "lucide-react";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { motion, AnimatePresence } from "framer-motion";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

interface InCallProps {
    onLeave: () => void;
    meetingName: string;
    meetingTopic?: string;
    chat: any;
}

export const InCall = ({ onLeave, meetingName, meetingTopic, chat }: InCallProps) => {
    const trpc = useTRPC();
    const { data: currentUser } = useQuery(trpc.lms.getCurrentUser.queryOptions());
    const isTeacherHost = currentUser?.role === "teacher" || currentUser?.role === "admin";
    const [isHandRaised, setIsHandRaised] = useState(false);
    const userVideoRef = useRef<HTMLVideoElement>(null);
    
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [showTranscript, setShowTranscript] = useState(true);

    useEffect(() => {
        let currentStream: MediaStream | null = null;
        const getMedia = async () => {
            let mediaStream: MediaStream | null = null;
            try {
                mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            } catch (err) {
                console.warn("InCall: Could not get both video and audio", err);
                try {
                    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                } catch (audioErr) {
                    console.warn("InCall: Could not get audio", audioErr);
                    try {
                        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    } catch (videoErr) {
                        console.warn("InCall: Could not get video stream", videoErr);
                    }
                }
            }

            if (mediaStream) {
                currentStream = mediaStream;
                setStream(mediaStream);
                const hasVideo = mediaStream.getVideoTracks().length > 0;
                setIsVideoOn(hasVideo);
            } else {
                setIsVideoOn(false);
            }
        };
        getMedia();
        return () => {
            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    useEffect(() => {
        if (userVideoRef.current && stream) {
            userVideoRef.current.srcObject = stream;
        }
    }, [stream, isVideoOn, isScreenSharing]);

    const toggleVideo = () => {
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOn(videoTrack.enabled);
            }
        }
    };

    const toggleScreenShare = async () => {
        if (!stream) return;

        if (isScreenSharing) {
            try {
                const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
                const videoTrack = cameraStream.getVideoTracks()[0];
                const oldTrack = stream.getVideoTracks()[0];
                stream.removeTrack(oldTrack);
                if (oldTrack) oldTrack.stop();
                stream.addTrack(videoTrack);
                setIsScreenSharing(false);
                setIsVideoOn(true);
            } catch (err) {
                console.error("Failed to revert to camera", err);
            }
        } else {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const videoTrack = screenStream.getVideoTracks()[0];
                
                videoTrack.onended = () => {
                    toggleScreenShare();
                };

                const oldTrack = stream.getVideoTracks()[0];
                stream.removeTrack(oldTrack);
                if (oldTrack) oldTrack.stop();
                stream.addTrack(videoTrack);
                setIsScreenSharing(true);
                setIsVideoOn(true);
            } catch (err) {
                console.error("Failed to share screen", err);
            }
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            chat.startListening();
        }, 1500);
        return () => clearTimeout(timer);
    }, [chat]);

    return (
        <div className="flex flex-col h-screen w-screen p-4 md:p-6 text-white bg-gradient-to-br from-[#0F0926] via-[#1E164F] to-[#2A1B6F] overflow-hidden select-none">
            {/* Top Bar Header */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl px-6 py-3 flex items-center justify-between border border-white/15 shadow-xl shrink-0">
                <div className="flex items-center gap-3">
                    <Link href="/" className="flex items-center justify-center p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl">
                        <Image src="/logo.png" width={20} height={20} alt="EdClarity logo" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold tracking-tight">{meetingName}</h4>
                            {meetingTopic && (
                                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                                    Topic: {meetingTopic}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-purple-200/80">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="font-semibold">{isTeacherHost ? "Teacher Broadcast Host" : "Student Live Participant"}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className={`rounded-xl border text-xs font-semibold px-3 transition-colors ${showTranscript ? 'bg-indigo-500/30 border-indigo-400/40 text-white' : 'bg-white/5 border-white/10 text-purple-200'}`}
                        onClick={() => setShowTranscript(!showTranscript)}
                    >
                        <MessageSquare className="h-4 w-4 mr-1.5" />
                        {showTranscript ? "Hide Chat Sidebar" : "Show Chat Sidebar"}
                    </Button>
                </div>
            </div>
            
            {/* Main Stage & Right Chat Sidebar Container */}
            <div className="flex-1 flex gap-4 my-3 min-h-0 overflow-hidden">
                
                {/* Left Area: Video Stage & Controls */}
                <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden">
                    
                    {/* Video Stage Grid */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0 overflow-hidden">
                        
                        {/* AI Agent View */}
                        <div className="relative bg-black/40 backdrop-blur-2xl rounded-3xl border border-white/15 overflow-hidden flex flex-col items-center justify-center shadow-2xl p-6">
                            <div className="absolute top-4 left-4 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold border border-white/15 flex items-center gap-2 z-20">
                                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                                <span>AI Assistant</span>
                            </div>

                            {/* Dynamic AI Voice Orb Visualizer */}
                            <div className="relative flex items-center justify-center w-full max-w-[240px] aspect-square">
                                <motion.div 
                                    animate={{
                                        scale: chat.isAgentSpeaking ? [1, 1.25, 1.05, 1.2, 1] : [1, 1.08, 1],
                                        opacity: chat.isAgentSpeaking ? [0.6, 0.9, 0.6] : [0.3, 0.5, 0.3],
                                    }}
                                    transition={{ repeat: Infinity, duration: chat.isAgentSpeaking ? 1.2 : 3, ease: "easeInOut" }}
                                    className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 blur-3xl opacity-50"
                                />

                                <motion.div 
                                    animate={{ rotate: 360, scale: chat.isAgentSpeaking ? 1.1 : 1 }}
                                    transition={{ rotate: { repeat: Infinity, duration: 12, ease: "linear" } }}
                                    className="absolute inset-3 rounded-full border-2 border-dashed border-indigo-400/40"
                                />

                                <motion.div 
                                    animate={{ scale: chat.isAgentSpeaking ? [1, 1.12, 1] : [1, 1.03, 1] }}
                                    transition={{ repeat: Infinity, duration: chat.isAgentSpeaking ? 0.8 : 2.5 }}
                                    className="relative h-36 w-36 rounded-full bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 border-4 border-white/20 shadow-[0_0_40px_rgba(99,102,241,0.6)] flex items-center justify-center overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.4),transparent)]" />
                                    <Sparkles className={`h-14 w-14 text-white transition-all duration-300 ${chat.isAgentSpeaking ? 'scale-125 animate-pulse' : 'opacity-80'}`} />
                                </motion.div>
                            </div>

                            {/* Live Waveform Indicator */}
                            <div className="mt-4 h-6 flex items-center justify-center gap-1.5 z-10">
                                {chat.isAgentSpeaking ? (
                                    [1, 2, 3, 4, 5, 6, 7].map(i => (
                                        <motion.div 
                                            key={i} 
                                            animate={{ height: ["20%", "90%", "30%", "100%", "40%"] }}
                                            transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.08, ease: "easeInOut" }}
                                            className="w-1.5 bg-gradient-to-t from-indigo-400 to-pink-400 rounded-full" 
                                        />
                                    ))
                                ) : (
                                    <span className="text-xs text-purple-200/70 font-medium tracking-wide">
                                        {chat.isListening ? "Listening for your question..." : "AI Assistant Ready"}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* User Camera View */}
                        <div className="relative bg-black/40 backdrop-blur-2xl rounded-3xl border border-white/15 overflow-hidden flex items-center justify-center shadow-2xl">
                            <div className="absolute top-4 left-4 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold border border-white/15 z-20">
                                You {isScreenSharing ? "(Screen Share)" : ""}
                            </div>

                            {isHandRaised && (
                                <div className="absolute top-4 right-4 bg-amber-500/90 text-white px-3 py-1 rounded-full text-xs font-bold border border-amber-300/40 flex items-center gap-1.5 shadow-lg animate-pulse z-20">
                                    <Hand className="h-3.5 w-3.5" />
                                    <span>Hand Raised</span>
                                </div>
                            )}

                            <video 
                                ref={userVideoRef} 
                                autoPlay 
                                playsInline 
                                muted 
                                className={`w-full h-full object-cover ${isScreenSharing ? '' : 'mirror'} absolute inset-0`}
                            />
                            
                            {!isVideoOn && !isScreenSharing && (
                                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2">
                                    <VideoOff className="h-10 w-10 text-white/40" />
                                    <span className="text-xs text-white/60 font-medium">Camera Turned Off</span>
                                </div>
                            )}

                            {chat.isListening && (
                                <motion.div 
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-500/90 border border-red-400/40 text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 backdrop-blur-xl shadow-lg z-20 shadow-red-500/20"
                                >
                                    <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                                    <Mic className="h-3.5 w-3.5" />
                                    <span>Listening...</span>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Control Bar */}
                    <div className="bg-white/10 backdrop-blur-2xl rounded-full px-6 py-3 flex items-center justify-center gap-5 border border-white/20 shadow-2xl shrink-0 max-w-xl mx-auto w-full">
                        <Button 
                            variant={chat.isListening ? "destructive" : "secondary"} 
                            size="icon" 
                            className="rounded-full size-11 shadow-lg transition-transform active:scale-95"
                            onClick={() => chat.isListening ? chat.stopListening() : chat.startListening()}
                            disabled={chat.isAgentSpeaking}
                            title={chat.isListening ? "Mute Microphone" : "Unmute Microphone"}
                        >
                            {chat.isListening ? <Mic className="size-5" /> : <MicOff className="size-5" />}
                        </Button>

                        <Button 
                            variant={isVideoOn ? "secondary" : "destructive"} 
                            size="icon" 
                            className="rounded-full size-11 shadow-lg transition-transform active:scale-95"
                            onClick={toggleVideo}
                            title={isVideoOn ? "Turn Camera Off" : "Turn Camera On"}
                        >
                            {isVideoOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
                        </Button>

                        <Button 
                            variant={isScreenSharing ? "default" : "secondary"} 
                            size="icon" 
                            className={`rounded-full size-11 shadow-lg transition-transform active:scale-95 ${isScreenSharing ? 'bg-indigo-600 text-white' : ''}`}
                            onClick={toggleScreenShare}
                            title="Share Screen"
                        >
                            <MonitorUp className="size-5" />
                        </Button>
                        
                        {!isTeacherHost && (
                            <Button 
                                variant={isHandRaised ? "default" : "secondary"} 
                                size="icon" 
                                className={`rounded-full size-11 shadow-lg transition-transform active:scale-95 ${isHandRaised ? 'bg-amber-500 text-white hover:bg-amber-600' : ''}`}
                                onClick={() => setIsHandRaised(!isHandRaised)}
                                title={isHandRaised ? "Lower Hand" : "Raise Hand to Ask Question"}
                            >
                                <Hand className="size-5 animate-bounce" />
                            </Button>
                        )}

                        <Button 
                            variant="destructive" 
                            className="rounded-full px-6 py-4 text-xs font-bold shadow-lg shadow-red-500/30 bg-red-600 hover:bg-red-500 text-white"
                            onClick={onLeave}
                        >
                            <PhoneOff className="size-4 mr-2" />
                            End Meeting
                        </Button>
                    </div>
                </div>

                {/* Right Chat Sidebar */}
                <AnimatePresence>
                    {showTranscript && (
                        <motion.div 
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 340, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            className="bg-black/40 backdrop-blur-2xl rounded-3xl border border-white/15 p-4 flex flex-col h-full shrink-0 shadow-2xl overflow-hidden"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
                                <span className="text-xs font-bold uppercase tracking-wider text-purple-200 flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4 text-indigo-400" />
                                    Live Session Chat
                                </span>
                                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-purple-200">
                                    {chat.messages.length} messages
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
                                {chat.messages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                        <MessageSquare className="h-8 w-8 text-purple-300/30 mb-2" />
                                        <p className="text-xs text-purple-200/60 font-medium">No messages yet.</p>
                                        <p className="text-[11px] text-purple-200/40 mt-1">Speak into your microphone to ask questions!</p>
                                    </div>
                                ) : (
                                    chat.messages.map((msg: any, i: number) => (
                                        <div key={i} className={`text-xs flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                            <div className={`px-3.5 py-2.5 rounded-2xl max-w-[90%] ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white/10 text-purple-100 border border-white/10 rounded-tl-sm'}`}>
                                                <span className="text-[10px] font-bold opacity-60 block mb-0.5">{msg.role === 'user' ? 'You' : 'AI Assistant'}</span>
                                                {msg.role === 'user' ? (
                                                    <p className="leading-relaxed">{msg.text}</p>
                                                ) : (
                                                    <MarkdownRenderer content={msg.text} className="text-xs leading-relaxed" />
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
            
            {chat.error && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-600 text-white px-5 py-2 rounded-2xl shadow-2xl text-xs font-bold z-50 border border-red-400">
                    {chat.error}
                </div>
            )}
        </div>
    );
};