"use client"
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { MeetingIdViewHeader } from "../components/meetingid-view-header";
import { useRouter } from "next/navigation";
import { useConfirm } from "../../hooks/useConfirm";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { UpdationMeetingDialog } from "@/components/custom/updation-meeting-dialog";
import { ScheduledMeeting } from "../states/scheduled-meeting";
import { ActiveMeeting } from "../states/active-meeting";
import { ProcessingMeeting } from "../states/processing-meeting";
import { CancelledMeeting } from "../states/cancelled-meeting";
import { CompletedMeeting } from "../states/completed-meeting";

interface MeetingIdViewProps {
    meetingId: string;
}



export const MeetingIdView = ({ meetingId }: MeetingIdViewProps) => {
    const trpc = useTRPC();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [updateMeeting, setupdateMeeting] = useState(false);
    
    const queryOptions = useMemo(() => trpc.meetings.getOne.queryOptions({ id: meetingId }), [trpc, meetingId]);
    const { data } = useSuspenseQuery(queryOptions);
    const [RemoveConfirm, confirmedRemoved] = useConfirm(
        "Are you absolutely sure?",
        `This action cannot be undone. This will permanently delete the meeting "${data.name}".`,
    )
    const removeMeeting = useMutation(
        trpc.meetings.remove.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries(trpc.meetings.getMany.queryOptions({}))
                router.push("/meetings");
            },
            onError: (error) => {
                toast.error(error.message)
            }
        }),
    )
    if (!data) return null;
    const handleRemoveMeeting = async () => {
        const isConfirmed = await confirmedRemoved();
        if (!isConfirmed) {
            return;
        }
        await removeMeeting.mutateAsync({ id: meetingId });
    }
    const isScheduled = data.status==="scheduled";
    const isActive = data.status==="active";
    const isCancelled = data.status==="cancelled";
    const isCompleted = data.status==="completed";
    const isProcessing = data.status==="processing";
    return (
        <>
            <RemoveConfirm />
            <UpdationMeetingDialog open={updateMeeting} onOpenChange={setupdateMeeting} initValues={data}/>
            <div className="flex-1 py-4 px-4 md:px-8 flex flex-col gap-y-4">
                <MeetingIdViewHeader
                    meetingId={data.id}
                    meetingName={data.name}
                    onEdit={() => {setupdateMeeting(true) }}
                    onRemove={handleRemoveMeeting}
                />
                <div>
                    {/* {JSON.stringify(data, null, 2)} */}
                    {isScheduled && <ScheduledMeeting meetingId={meetingId} onCancelMeeting={() => {}} isCancelling={false}/>}
                    {isActive && <ActiveMeeting meetingId={meetingId}/>}
                    {isProcessing && <ProcessingMeeting/>}
                    {isCompleted && <CompletedMeeting/>}
                    {isCancelled && <CancelledMeeting/>}
                </div>
            </div>
        </>
    )
}