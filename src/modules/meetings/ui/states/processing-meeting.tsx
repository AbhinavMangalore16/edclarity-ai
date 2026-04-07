
import EmptyAgents from "../../../../components/extras/empty-state"


export const ProcessingMeeting = () => {
    return (
        <div className="bg-[#F5F5f5] rounded-lg px-2 py-4 flex flex-col gap-y-8 items-center justify-center">
            <EmptyAgents lottieJson="/animations/Loading.json" image="/processing-meeting.jpg" title="Meeting ended" description="Summary, playback and chats shall appear soon enough!" />
        </div>
    )
}
