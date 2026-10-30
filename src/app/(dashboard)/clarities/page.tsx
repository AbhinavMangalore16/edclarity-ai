import { ClaritiesDashboard } from "@/modules/clarities/ui/views/clarities-dashboard";
import { ErrorBoundary } from "react-error-boundary";
import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import ErrorDisplay from "@/components/extras/error-display";
import LoadingDisplay from "@/components/extras/loading-display";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const Page = async () => {
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    if (!session) {
        redirect("/login");
    }

    const queryClient = getQueryClient();
    void queryClient.prefetchQuery(trpc.clarities.getUserProgress.queryOptions());
    void queryClient.prefetchQuery(trpc.clarities.getCourses.queryOptions());

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <Suspense fallback={<LoadingDisplay title="Loading Dashboard" description="Fetching your gamified learning progress..." />}>
                <ErrorBoundary fallback={<ErrorDisplay title="Failed to load" description="Please try again later." />}>
                    <ClaritiesDashboard />
                </ErrorBoundary>
            </Suspense>
        </HydrationBoundary>
    );
};

export default Page;
