import EmptyAgents from "../../../../components/extras/empty-state"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";

interface CompletedMeetingProps {
    meeting: any;
}

export const CompletedMeeting = ({ meeting }: CompletedMeetingProps) => {
    return (
        <div className="bg-[#1F164F]/50 border border-white/10 rounded-lg px-6 py-8 flex flex-col gap-y-6">
            <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                <div className="bg-green-500/20 p-3 rounded-full">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-xl font-semibold text-white">Meeting Completed</h3>
                    <p className="text-sm text-gray-400">Review your AI-generated summary and transcript below.</p>
                </div>
            </div>

            {meeting?.summary ? (
                <div className="bg-black/30 rounded-lg p-6 border border-white/5 shadow-inner text-gray-200">
                    <MarkdownRenderer content={meeting.summary} />
                </div>
            ) : (
                <EmptyAgents lottieJson="/animations/successconfetti.json" image="/completed-meeting.jpg" title="Summary Processing" description="Your summary is currently being generated. Please wait a moment." />
            )}
        </div>
    )
}
