import { DefaultVideoPlaceholder, StreamTheme, StreamVideoParticipant, useCall } from "@stream-io/video-react-sdk";
import { useState } from "react";
import { Lobby } from "./Lobby";
import { authClient } from "@/lib/auth-client";
import { genAvatarURI } from "@/lib/avatargen";
import { InCall } from "./InCall";
import { Finish } from "./Finish";

interface MeetInterfaceProps{
    meetingName: string;
}


export const MeetInterface = ({meetingName}: MeetInterfaceProps) =>{
    const meet = useCall();
    const [show, setShow] = useState<"lobby"|"call"|"ended">("lobby");
    
    const handleJoin = async () =>{
        if (!meet) return;
        await meet.join();
        setShow("call");
    }
    const handleLeave = async() =>{
        if (!meet) return;
        meet.endCall();
        setShow("ended");
    }
    return (
        <StreamTheme className="h-full">
            {show==="lobby" && <Lobby onJoin={handleJoin}/>}
            {show==="call" && <InCall onLeave={handleLeave} meetingName={meetingName}/>}
            {show==="ended" &&<Finish/>}
        </StreamTheme>
    )
}