"use client"
import { useState } from "react";
import { Lobby } from "./Lobby";
import { InCall } from "./InCall";
import { Finish } from "./Finish";
import { useAgentChat } from "@/hooks/useAgentChat";

interface MeetInterfaceProps{
    meetingId: string;
    meetingName: string;
    meetingTopic?: string;
}

export const MeetInterface = ({meetingId, meetingName, meetingTopic}: MeetInterfaceProps) =>{
    const [show, setShow] = useState<"lobby"|"call"|"ended">("lobby");
    const chat = useAgentChat(meetingId);
    
    const handleJoin = async () =>{
        try {
            await fetch('/api/meetings/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ meetingId })
            });
        } catch (err) {
            console.error("Failed to mark meeting as started", err);
        }
        setShow("call");
    }

    const handleLeave = async() =>{
        await chat.finishMeeting();
        setShow("ended");
    }

    return (
        <div className="h-full w-full bg-[#1E164F] text-white">
            {show==="lobby" && <Lobby onJoin={handleJoin}/>}
            {show==="call" && <InCall onLeave={handleLeave} meetingName={meetingName} meetingTopic={meetingTopic} chat={chat}/>}
            {show==="ended" &&<Finish/>}
        </div>
    )
}