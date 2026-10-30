"use client"
import { Button } from "@/components/ui/button";
import { VideoIcon, Mic, MicOff, Video, VideoOff, RefreshCw, AlertCircle, Volume2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";

interface LobbyProps {
    onJoin: () => void;
}

export const Lobby = ({ onJoin }: LobbyProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [hasPermission, setHasPermission] = useState(false);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [isAudioOn, setIsAudioOn] = useState(true);
    const [hasVideoTrack, setHasVideoTrack] = useState(false);
    const [hasAudioTrack, setHasAudioTrack] = useState(false);
    const [isRequesting, setIsRequesting] = useState(false);
    const [permissionError, setPermissionError] = useState<string | null>(null);

    const streamRef = useRef<MediaStream | null>(null);
    streamRef.current = stream;

    const getMedia = useCallback(async () => {
        setIsRequesting(true);
        setPermissionError(null);

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            setStream(null);
        }

        let mediaStream: MediaStream | null = null;
        let audioSuccess = false;
        let videoSuccess = false;
        let lastError: any = null;

        // 1. Try requesting both audio and video
        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            audioSuccess = true;
            videoSuccess = true;
        } catch (err: any) {
            console.warn("Could not acquire both video and audio stream:", err);
            lastError = err;

            // 2. Try audio-only if combined request failed
            try {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaStream = audioStream;
                audioSuccess = true;
            } catch (audioErr: any) {
                console.warn("Could not acquire audio stream:", audioErr);
                lastError = audioErr;
            }

            // 3. Try video-only if audio also failed
            if (!mediaStream) {
                try {
                    const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    mediaStream = videoStream;
                    videoSuccess = true;
                } catch (videoErr: any) {
                    console.warn("Could not acquire video stream:", videoErr);
                    lastError = videoErr;
                }
            }
        }

        if (mediaStream) {
            setStream(mediaStream);
            setHasPermission(true);
            const vTracks = mediaStream.getVideoTracks();
            const aTracks = mediaStream.getAudioTracks();
            const vLive = vTracks.length > 0 && vTracks[0].readyState === 'live';
            const aLive = aTracks.length > 0 && aTracks[0].readyState === 'live';
            setHasVideoTrack(vLive);
            setHasAudioTrack(aLive);
            setIsVideoOn(vLive && vTracks[0].enabled);
            setIsAudioOn(aLive && aTracks[0].enabled);
        } else {
            setHasPermission(false);
            setHasVideoTrack(false);
            setHasAudioTrack(false);

            if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
                setPermissionError("Media devices API is unavailable (Not a secure context. Access over https:// or http://localhost).");
            } else if (lastError) {
                const errName = lastError.name || 'Error';
                const errMsg = lastError.message || '';
                console.warn("Media Acquisition Failure Details:", { name: errName, message: errMsg, error: lastError });

                if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
                    setPermissionError(
                        `[${errName}] Permission blocked (${errMsg || 'Denied'}). If enabled in Chrome site settings, check Windows Settings > Privacy & security > Camera/Microphone > 'Allow desktop apps'.`
                    );
                } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
                    setPermissionError(
                        `[${errName}] Camera/Mic in use (${errMsg || 'Device busy'}). Please close Zoom, Teams, Skype, or other apps using your webcam/mic.`
                    );
                } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
                    setPermissionError(
                        `[${errName}] No physical camera or microphone hardware found on this PC (${errMsg || 'No device'}).`
                    );
                } else {
                    setPermissionError(
                        `[${errName}] ${errMsg || 'Could not start media devices.'}`
                    );
                }
            } else {
                setPermissionError("Could not access camera or microphone.");
            }
        }
        setIsRequesting(false);
    }, []);

    useEffect(() => {
        getMedia();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [getMedia]);

    // Ensure video ref srcObject is attached whenever DOM renders or stream changes
    useEffect(() => {
        if (videoRef.current && stream && hasVideoTrack) {
            videoRef.current.srcObject = stream;
        }
    }, [stream, hasPermission, hasVideoTrack, isVideoOn]);

    const toggleVideo = () => {
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOn(videoTrack.enabled);
            }
        }
    };

    const toggleAudio = () => {
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioOn(audioTrack.enabled);
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#1E164F] via-[#2A1B6F] to-[#120B2E] p-6">
            <div className="w-full max-w-lg bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-y-6 text-white">
                <div className="flex flex-col gap-y-1.5 text-center">
                    <h3 className="text-2xl font-bold tracking-tight text-white">Ready to join your AI Session?</h3>
                    <p className="text-sm text-purple-200/80">Check your camera and microphone setup before entering</p>
                </div>
                
                <div className="w-full aspect-video bg-black/60 rounded-2xl overflow-hidden relative flex items-center justify-center border border-white/10 shadow-inner">
                    {hasPermission && hasVideoTrack && isVideoOn ? (
                        <>
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                muted 
                                className="w-full h-full object-cover mirror"
                            />
                            <div className="absolute bottom-4 flex gap-4 backdrop-blur-md bg-black/40 px-4 py-2 rounded-full border border-white/10">
                                {hasAudioTrack && (
                                    <Button 
                                        variant={isAudioOn ? "secondary" : "destructive"} 
                                        size="icon" 
                                        className="rounded-full size-11 shadow-md"
                                        onClick={toggleAudio}
                                    >
                                        {isAudioOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
                                    </Button>
                                )}
                                <Button 
                                    variant={isVideoOn ? "secondary" : "destructive"} 
                                    size="icon" 
                                    className="rounded-full size-11 shadow-md"
                                    onClick={toggleVideo}
                                >
                                    {isVideoOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
                                </Button>
                            </div>
                        </>
                    ) : hasPermission ? (
                        <div className="flex flex-col items-center justify-center p-6 text-center gap-3">
                            <div className="h-16 w-16 rounded-full bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                                {hasAudioTrack ? <Volume2 className="h-8 w-8 text-indigo-300 animate-pulse" /> : <VideoOff className="h-8 w-8 text-purple-300/60" />}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-white">
                                    {hasAudioTrack ? "Microphone active (Camera Off or Unavailable)" : "Media devices connected"}
                                </p>
                                <p className="text-xs text-purple-200/70 mt-1">
                                    You're ready to join the session.
                                </p>
                            </div>
                            <div className="flex gap-3 mt-2">
                                {hasAudioTrack && (
                                    <Button 
                                        variant={isAudioOn ? "secondary" : "destructive"} 
                                        size="sm" 
                                        className="rounded-full px-4 text-xs"
                                        onClick={toggleAudio}
                                    >
                                        {isAudioOn ? <Mic className="size-4 mr-1.5" /> : <MicOff className="size-4 mr-1.5" />}
                                        {isAudioOn ? "Mic On" : "Mic Muted"}
                                    </Button>
                                )}
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="rounded-full px-4 text-xs border-white/20 bg-white/5 hover:bg-white/10 text-white"
                                    onClick={getMedia}
                                    disabled={isRequesting}
                                >
                                    <RefreshCw className={`size-3.5 mr-1.5 ${isRequesting ? 'animate-spin' : ''}`} />
                                    Retry Camera
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-6 text-center gap-3">
                            <AlertCircle className="h-10 w-10 text-amber-400 opacity-90" />
                            <p className="text-sm text-purple-200 max-w-sm">
                                {permissionError || "Please grant camera and microphone permissions in your browser to proceed."}
                            </p>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="rounded-full border-indigo-400/40 bg-indigo-500/20 hover:bg-indigo-500/30 text-white text-xs font-semibold px-4 mt-1"
                                onClick={getMedia}
                                disabled={isRequesting}
                            >
                                <RefreshCw className={`size-3.5 mr-1.5 ${isRequesting ? 'animate-spin' : ''}`} />
                                {isRequesting ? "Checking Permissions..." : "Allow / Retry Media Access"}
                            </Button>
                        </div>
                    )}
                </div>
                
                <div className="flex gap-x-3 justify-between w-full mt-2">
                    <Button asChild variant="outline" className="rounded-2xl border-white/20 bg-white/5 hover:bg-white/10 text-white font-medium px-6">
                        <Link href="/meetings">Cancel</Link>
                    </Button>
                    <Button 
                        className="rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 shadow-lg shadow-indigo-600/30"
                        onClick={() => {
                            if (streamRef.current) {
                                streamRef.current.getTracks().forEach(track => track.stop());
                            }
                            onJoin();
                        }} 
                    >
                        <VideoIcon className="mr-2 h-5 w-5" />
                        {hasPermission ? "Join Session" : "Join Without Camera/Mic"}
                    </Button>
                </div>
            </div>
        </div>
    )
}