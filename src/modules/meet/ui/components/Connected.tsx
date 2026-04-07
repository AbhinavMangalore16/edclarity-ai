"use client"

import { useTRPC } from "@/trpc/client"
import { Call, CallingState, StreamCall, StreamVideo, StreamVideoClient } from "@stream-io/video-react-sdk";
import { useMutation } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { MeetInterface } from "./MeetInterface";

interface ConnectedProps {
    meetingId: string,
    meetingName: string,
    userId: string,
    userName: string,
    userImage: string
}

export const Connected = ({ meetingId, meetingName, userId, userName, userImage }: ConnectedProps) => {
    const trpc = useTRPC();

    const { mutateAsync: generateToken, error: tokenError } =
        useMutation(trpc.meetings.generateToken.mutationOptions());

    // ✅ ALL HOOKS FIRST
    const [comms, setComms] = useState<StreamVideoClient>();
    const [meet, setMeet] = useState<Call>();

    useEffect(() => {
        const _comms = new StreamVideoClient({
            apiKey: process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY!,
            user: {
                id: userId,
                name: userName,
                image: userImage
            },
            tokenProvider: generateToken
        });

        setComms(_comms);

        return () => {
            _comms.disconnectUser();
            setComms(undefined);
        };
    }, [userId, userName, userImage, generateToken]);

    useEffect(() => {
        if (!comms) return;

        const _meet = comms.call("default", meetingId);

        _meet.camera.disable();
        _meet.microphone.disable();

        setMeet(_meet);

        return () => {
            if (_meet.state.callingState !== CallingState.LEFT) {
                _meet.leave();
                _meet.endCall();
                setMeet(undefined);
            }
        };
    }, [comms, meetingId]);

    // ✅ NOW handle conditional rendering
    if (tokenError) {
        return (
            <div className="flex h-screen items-center justify-center bg-radial bg-[#1E164F]">
                <p className="text-white">Failed to connect: {tokenError.message}</p>
            </div>
        );
    }

    if (!comms || !meet) {
        return (
            <div className="flex h-screen items-center justify-center bg-radial bg-[#1E164F]">
                <Loader2Icon className="size-6 animate-spin text-white" />
                Waiting for connection for: {userId}
            </div>
        );
    }

    return (
        <StreamVideo client={comms}>
            <StreamCall call={meet}>
                <MeetInterface meetingName={meetingName} />
            </StreamCall>
        </StreamVideo>
    );
};