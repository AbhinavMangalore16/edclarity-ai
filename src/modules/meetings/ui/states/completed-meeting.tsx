import { BanIcon, VideoIcon } from "lucide-react"
import EmptyAgents from "../../../../components/extras/empty-state"
import { Button } from "@/components/ui/button"
import Link from "next/link"


export const CompletedMeeting = () => {
    return (
        <div className="bg-[#F5F5f5] rounded-lg px-2 py-4 flex flex-col gap-y-8 items-center justify-center">
            <EmptyAgents lottieJson="/animations/successconfetti.json" image="/completed-meeting.jpg" title="Meeting DONE" description="Summary, playback and chats feature for this meeting available NOW!" />
        </div>
    )
}
