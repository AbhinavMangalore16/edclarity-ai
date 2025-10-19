import ErrorDisplay from "@/components/extras/error-display";
import LoadingDisplay from "@/components/extras/loading-display";
import { AgentIdView } from "@/modules/agentic/ui/views/agentid-view";
import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

interface PageProps{
    params: Promise<{agentid: string}>
}

const Page = async ({params}: PageProps) =>{
    const {agentid} = await params;
    const queryClient = getQueryClient();
    void queryClient.prefetchQuery(
        trpc.agents.getOne.queryOptions({id: agentid}),
    )

    return (
        <HydrationBoundary state = {dehydrate(queryClient)}>
            <Suspense fallback={<LoadingDisplay title="Loading your agents" description="Hold on tight! This might take a while..."/>}>
                <ErrorBoundary fallback={<ErrorDisplay title="Error fetching agents." description="Agent is not loading. Please check again and try again later or contact support if the issue persists."/>}>
                <AgentIdView agentid = {agentid}/>
                </ErrorBoundary>
            </Suspense>
        </HydrationBoundary>
    )
}

export default Page;