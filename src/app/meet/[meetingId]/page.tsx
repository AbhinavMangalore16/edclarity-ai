import { auth } from "@/lib/auth"
import { MeetingCall } from "@/modules/meet/ui/views/MeetingCall";
import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

interface MeetProps{
    params: Promise<{meetingId: string}>
}

const MeetPage = async({params}: MeetProps)=>{
    const {meetingId} = await params;
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session){
        redirect("/login");
    }

    const queryClient = getQueryClient();
    void queryClient.prefetchQuery(
        trpc.meetings.getOne.queryOptions({id: meetingId}),
    );

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <MeetingCall meetingId={meetingId}/>
        </HydrationBoundary>
    )
}

export default MeetPage;