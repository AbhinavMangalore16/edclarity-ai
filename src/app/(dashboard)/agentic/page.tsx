import LoadingDisplay from "@/components/extras/loading-display";
import { AgenticView } from "@/modules/agentic/ui/views/agentic-view"
import { ErrorBoundary } from "react-error-boundary";
import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import ErrorDisplay from "@/components/extras/error-display";
import { AgenticListAdd } from "@/components/custom/agentic-list-add";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SearchParams } from "nuqs";
import { loadSearchParameters } from "@/modules/agentic/params";

interface PageProps{
  searchParams: Promise<SearchParams>
}

const Page = async ({searchParams}: PageProps) => {
    const filters = await loadSearchParameters(searchParams);
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    if (!session){
        redirect("/login");
    }
    // server pre-fetching..
    const queryClient = getQueryClient();
    void queryClient.prefetchQuery(trpc.agents.getMany.queryOptions({...filters,}));
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