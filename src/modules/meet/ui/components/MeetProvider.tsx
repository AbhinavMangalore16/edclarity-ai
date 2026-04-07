"use client";

import { genAvatarURI } from "@/lib/avatargen";
import { Loader, Loader2Icon, LoaderIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Connected } from "./Connected";

interface MeetProviderProps{
    meetingId: string;
    meetingName: string;
}

export const MeetProvider = ({meetingId, meetingName}: MeetProviderProps)=>{
    const {data, isPending} = authClient.useSession();
    if (!data || isPending){
        return (
            <div className="flex h-screen items-center justify-center bg-radial from-sidebar-accent to-sidebar">
                <LoaderIcon className="size-6 animate-spin text-white"/> 
            </div>
        )
    }
    return (
        <div>
            <Connected meetingId={meetingId} meetingName={meetingName} userId={data.user.id} userName={data.user.name} 
            userImage={data.user.image?? genAvatarURI({seed: data.user.name, variant: "initials"})} />
        </div>
    )
}