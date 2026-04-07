
import EmptyAgents from "../../../../components/extras/empty-state"



export const CancelledMeeting = () => {
    return (
        <div className="bg-[#F5F5f5] rounded-lg px-2 py-4 flex flex-col gap-y-8 items-center justify-center">
            <EmptyAgents lottieJson="/animations/CalendarError.json" image="/cancelled-meeting.jpg" title="Meeting cancelled" description="This meeting's got cancelled. Nothing more to see here.." />
        </div>
    )
}
