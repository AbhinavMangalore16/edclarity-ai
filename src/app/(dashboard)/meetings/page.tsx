import ErrorDisplay from "@/components/extras/error-display";
import LoadingDisplay from "@/components/extras/loading-display";
import {MeetingsView} from "@/modules/meetings/ui/views/meetings-view";
import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

const MeetingsPage = () => {
    const queryClient = getQueryClient();
    void queryClient.prefetchQuery(
        trpc.meetings.getMany.queryOptions({})
    );

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <Suspense fallback={<LoadingDisplay title="Loading your meetings" description="Hold on tight! This might take a while..."/>}>
                <ErrorBoundary fallback={<ErrorDisplay title="Error fetching agents." description="Meetings are not loading. Please check again and try again later or contact support if the issue persists."/>}>
                    <MeetingsView />
                </ErrorBoundary>
            </Suspense>
        </HydrationBoundary>
    )
}

export default MeetingsPage;
