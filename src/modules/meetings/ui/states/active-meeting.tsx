import { BanIcon, VideoIcon } from "lucide-react"
import EmptyAgents from "../../../../components/extras/empty-state"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface ActiveMeetingProps{
    meetingId: string;
}

export const ActiveMeeting = ({meetingId}: ActiveMeetingProps) => {
    return (
        <div className="bg-[#F5F5f5] rounded-lg px-2 py-4 flex flex-col gap-y-8 items-center justify-center">
            <EmptyAgents image="/active-meeting.png" title="Your meeting is live!" description="Meeting shall end once all participants have left the meeting" />
            <div className="flex flex-col-reverse lg:flex-row lg: justify-center items-center gap-2 w-full">
                <Button asChild className="w-full lg:w-auto">
                    <Link href={`/meet/${41521001}`}>
                        <VideoIcon />
                        Join meeting
                    </Link>
                </Button>
            </div>
        </div>
    )
}
