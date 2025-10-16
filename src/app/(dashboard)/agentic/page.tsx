import LoadingDisplay from "@/components/custom/loading-display";
import { AgenticView } from "@/modules/agentic/ui/views/agentic-view"
import { ErrorBoundary } from "react-error-boundary";
import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import ErrorDisplay from "@/components/custom/error-display";
import { AgenticListAdd } from "@/components/custom/agentic-list-add";

const Page = async () => {
    // server pre-fetching..
    const queryClient = getQueryClient();
    void queryClient.prefetchQuery(trpc.agents.getMany.queryOptions());
    return (
        <>
            <AgenticListAdd/>
            <HydrationBoundary state={dehydrate(queryClient)}>
                <Suspense fallback={<LoadingDisplay title="Loading your agents" description="Hold on tight! It might take a while..." />}>
                    <ErrorBoundary fallback={<ErrorDisplay title="Failed to load agents" description="Please try again later or contact support if the issue persists." />}>
                        <AgenticView />
                    </ErrorBoundary>
                </Suspense>
            </HydrationBoundary>
        </>
    )
}
export default Page;