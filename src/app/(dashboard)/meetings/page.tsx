import ErrorDisplay from "@/components/extras/error-display";
import LoadingDisplay from "@/components/extras/loading-display";
import { auth } from "@/lib/auth";
import { useMeetingFilter } from "@/modules/meetings/hooks/useMeetingFilter";
import { loadSearchParameters } from "@/modules/meetings/params";
import { MeetingListAdd } from "@/modules/meetings/ui/components/meeting-list-add";
import { MeetingsView } from "@/modules/meetings/ui/views/meetings-view";
import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

interface PageProps{
    searchParams: Promise<SearchParams>
}

const Page = async ({searchParams}: PageProps) => {
    const params = await loadSearchParameters(searchParams);
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    if (!session) {
        redirect("/login");
    }
    const queryClient = getQueryClient();
    void queryClient.prefetchQuery(
        trpc.meetings.getMany.queryOptions({...params})
    );

    return (
        <>
            <MeetingListAdd />
            <HydrationBoundary state={dehydrate(queryClient)}>
                <Suspense fallback={<LoadingDisplay title="Loading your meetings" description="Hold on tight! This might take a while..." />}>
                    <ErrorBoundary fallback={<ErrorDisplay title="Error fetching agents." description="Meetings are not loading. Please check again and try again later or contact support if the issue persists." />}>
                        <MeetingsView />
                    </ErrorBoundary>
                </Suspense>
            </HydrationBoundary>
        </>
    )
}

export default Page;
