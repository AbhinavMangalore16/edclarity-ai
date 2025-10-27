import { BanIcon, VideoIcon } from "lucide-react"
import EmptyAgents from "../../../../components/extras/empty-state"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface ScheduledMeetingProps{
    meetingId: string;
    onCancelMeeting: () => void;
    isCancelling: boolean;
}

export const ScheduledMeeting = ({meetingId, onCancelMeeting, isCancelling}: ScheduledMeetingProps) => {
    return (
        <div className="bg-[#F5F5f5] rounded-lg px-2 py-4 flex flex-col gap-y-8 items-center justify-center">
            <EmptyAgents image="/scheduled-meeting.png" title="Meeting is scheduled... not started yet" description="Once you start here, a summary of your meeting shall appear here" />
            <div className="flex flex-col-reverse lg:flex-row lg: justify-center items-center gap-2 w-full">
                <Button variant="destructive" className="w-full lg:w-auto" onClick={onCancelMeeting} disabled={isCancelling}>
                    <BanIcon />
                    Cancel Meeting
                </Button>
                <Button asChild className="w-full lg:w-auto" disabled={isCancelling}>
                    <Link href={`/meet/${41521001}`}>
                        <VideoIcon />
                        Start meeting
                    </Link>
                </Button>
            </div>
        </div>
    )
}
