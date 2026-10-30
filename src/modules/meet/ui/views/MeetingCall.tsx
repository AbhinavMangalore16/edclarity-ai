"use client";
import EndingDisplay from "@/components/extras/ending-display";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { MeetProvider } from "../components/MeetProvider";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { VideoOff, ArrowLeft, Loader2 } from "lucide-react";

interface MeetingCallProps {
    meetingId: string;
}

export const MeetingCall = ({ meetingId }: MeetingCallProps) => {
    const trpc = useTRPC();
    const { data, isPending, isError } = useQuery(trpc.meetings.getOne.queryOptions({ id: meetingId }));

    if (isPending) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#1E164F] text-white">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                    <p className="text-sm font-medium text-purple-200">Loading meeting room...</p>
                </div>
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-[#1E164F] text-white p-6 text-center">
                <div className="bg-white/10 p-4 rounded-full mb-4 border border-white/15">
                    <VideoOff className="h-10 w-10 text-rose-400" />
                </div>
                <h2 className="text-xl font-bold mb-2">Meeting Not Found</h2>
                <p className="text-sm text-purple-200/80 max-w-md mb-6 leading-relaxed">
                    This meeting link is invalid, has expired, or was deleted. (ID: <span className="font-mono text-purple-300 font-semibold">{meetingId}</span>)
                </p>
                <Link href="/meetings">
                    <Button variant="secondary" className="rounded-xl px-5 py-2 text-xs font-semibold bg-white/15 text-white hover:bg-white/25">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Meetings Catalog
                    </Button>
                </Link>
            </div>
        );
    }

    if (data.status === "completed") {
        return (
            <div className="flex h-screen items-center justify-center bg-[#1E164F]">
                <EndingDisplay title="Your meeting has ended!" description="You can safely leave this page!" />
            </div>
        );
    }

    return (
        <MeetProvider meetingId={meetingId} meetingName={data.name} />
    );
};