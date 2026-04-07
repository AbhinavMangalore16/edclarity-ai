"use client";
import EndingDisplay from "@/components/extras/ending-display";
import ErrorDisplay from "@/components/extras/error-display";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { MeetProvider } from "../components/MeetProvider";

interface MeetingCallProps{
    meetingId: string;
}

export const MeetingCall = ({meetingId}: MeetingCallProps) =>{
    const trpc = useTRPC();
    const {data} = useSuspenseQuery(trpc.meetings.getOne.queryOptions({id: meetingId}));
    if (data.status==="completed"){
        return(
            <div className="flex h-screen items-center justify-center">
                <EndingDisplay title="Your meeting has ended!" description="You can leave this page!"/>
            </div>
        )
    }

    return(
        <MeetProvider meetingId={meetingId} meetingName={data.name}/>
    )
}