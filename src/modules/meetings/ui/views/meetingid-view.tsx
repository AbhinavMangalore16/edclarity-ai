"use client"
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyAgents from "@/components/extras/empty-state";

interface MeetingIdViewProps {
    meetingId: string;
}

export const MeetingIdView = ({ meetingId }: MeetingIdViewProps) => {
    const trpc = useTRPC();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [updateMeeting, setupdateMeeting] = useState(false);
    
    const queryOptions = useMemo(() => trpc.meetings.getOne.queryOptions({ id: meetingId }), [trpc, meetingId]);
    const { data, isPending, isError } = useQuery(queryOptions);

    const [RemoveConfirm, confirmedRemoved] = useConfirm(
        "Are you absolutely sure?",
        `This action cannot be undone. This will permanently delete the meeting "${data?.name || 'this meeting'}".`,
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

    if (isPending) {
        return (
            <div className="flex-1 py-12 flex flex-col items-center justify-center text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Loading meeting details...</p>
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div className="flex-1 py-12 px-4 flex flex-col items-center justify-center text-center">
                <EmptyAgents
                    title="Meeting Not Found"
                />
                <p className="text-sm text-muted-foreground mt-2 mb-4">
                    The meeting with ID <span className="font-mono text-foreground font-semibold">{meetingId}</span> could not be found or has been deleted.
                </p>
                <Button variant="outline" size="sm" onClick={() => router.push("/meetings")}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Meetings
                </Button>
            </div>
        );
    }
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
                    {isCompleted && <CompletedMeeting meeting={data}/>}
                    {isCancelled && <CancelledMeeting/>}
                </div>
            </div>
        </>
    )
}