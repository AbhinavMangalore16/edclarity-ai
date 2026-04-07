import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { genAvatarURI } from "@/lib/avatargen";
import { DefaultVideoPlaceholder, StreamVideoParticipant, ToggleAudioPreviewButton, ToggleVideoPreviewButton, useCallStateHooks, VideoPreview } from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import { LogInIcon, Video, VideoIcon } from "lucide-react";
import Link from "next/link";
interface LobbyProps {
    onJoin: () => void;
}

export const Finish = () => {
    const { useCameraState, useMicrophoneState } = useCallStateHooks();
    const { hasBrowserPermission: hasMicPermission } = useMicrophoneState();
    const { hasBrowserPermission: hasCameraPermission } = useCameraState();

    const fullPermissions = hasCameraPermission && hasMicPermission;

    return (
        <div className="flex flex-col items-center justify-center h-full bg-gradient-radial from-[#1E164F] via-[#2A1B6F] to-[#3B247D] from-[#1E164F]-100 to-[#1E164F">
            <div className="py-4 px-8 flex flex-1 items-center justify-center">
                <div className="flex flex-col items-center justify-center gap-y-6 bg-background rounded-lg p-10 shadow-sm">
                    <div className="flex flex-col gap-y-2 text-center">
                        <h5 className="text-lg font-medium">You have ended the meet</h5>
                        <p className="text-sm">Summary, transcripts and chats will be available in few moments. Thanks!</p>
                    </div>
                    <Button asChild variant="outline">
                        <Link href="/meetings">
                            Return
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}