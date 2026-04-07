import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { genAvatarURI } from "@/lib/avatargen";
import { DefaultVideoPlaceholder, StreamVideoParticipant, ToggleAudioPreviewButton, ToggleVideoPreviewButton, useCallStateHooks, VideoPreview } from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import { LogInIcon, Video, VideoIcon } from "lucide-react";
import Link from "next/link";
interface LobbyProps{
    onJoin : () => void;
}
const OffVideoPreview = () =>{
    const {data} = authClient.useSession();
    return (
        <DefaultVideoPlaceholder
        participant={
            {
                name: data?.user.name?? "",
                image: data?.user.image?? genAvatarURI({
                    seed: data?.user.name?? "",
                    variant: "initials"
                })
            } as StreamVideoParticipant
        }
        />
    )
}

const allowPermissions = () => {
    return (
        <p className="text-sm">
            Please grant browser permissions for microphone and camera!
        </p>
    )
}
export const Lobby = ({onJoin}: LobbyProps) =>{
    const {useCameraState, useMicrophoneState} = useCallStateHooks();
    const {hasBrowserPermission: hasMicPermission} = useMicrophoneState();
    const {hasBrowserPermission: hasCameraPermission} = useCameraState();

    const fullPermissions = hasCameraPermission && hasMicPermission;

    return (
        <div className="flex flex-col items-center justify-center h-full bg-gradient-radial from-[#1E164F] via-[#2A1B6F] to-[#3B247D] from-[#1E164F]-100 to-[#1E164F">
            <div className="py-4 px-8 flex flex-1 items-center justify-center">
                <div className="flex flex-col items-center justify-center gap-y-6 bg-background rounded-lg p-10 shadow-sm">
                    <div className="flex flex-col gap-y-2 text-center">
                    <h5 className="text-lg font-medium">Are you ready to join?</h5>
                    <p className="text-sm">Set up camera and microphone before joining</p>
                    </div>
                    <VideoPreview
                    DisabledVideoPreview={
                        fullPermissions? OffVideoPreview: allowPermissions
                    } />
                    <div className="flex gap-x-2">
                        <ToggleVideoPreviewButton/>
                        <ToggleAudioPreviewButton/>
                    </div>
                    <div className="flex gap-x-2 justify-between w-full">
                        <Button asChild variant="outline">
                            <Link href="/meetings">
                            Cancel</Link>
                        </Button>
                        <Button onClick={onJoin}>
                            <VideoIcon/>
                            Join Meeting
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}