import ErrorDisplay from "@/components/extras/error-display";
import LoadingDisplay from "@/components/extras/loading-display";
import { auth } from "@/lib/auth";
import { MeetingIdView } from "@/modules/meetings/ui/views/meetingid-view";
import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

interface PageProps{
  params: Promise<{meetingId: string}>
}

const Page = async ({params}: PageProps) => {
  const {meetingId} = await params;
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(
    trpc.meetings.getOne.queryOptions({id: meetingId})
  );
  return (
            <HydrationBoundary state={dehydrate(queryClient)}>
                <Suspense fallback={<LoadingDisplay title="Loading your meeting" description="Hold on tight! This might take a while..." />}>
                    <ErrorBoundary fallback={<ErrorDisplay title="Error fetching meeting." description="Meetings are not loading. Please check again and try again later or contact support if the issue persists." />}>
                        <MeetingIdView meetingId={meetingId} />
                    </ErrorBoundary>
                </Suspense>
            </HydrationBoundary>
  )
}

export default Page;
