import { ClaritiesRoadmap } from "@/modules/clarities/ui/views/clarities-roadmap";
import { ErrorBoundary } from "react-error-boundary";
import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import ErrorDisplay from "@/components/extras/error-display";
import LoadingDisplay from "@/components/extras/loading-display";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ courseId: string }>;
}

const Page = async ({ params }: PageProps) => {
    const { courseId } = await params;
    
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    if (!session) {
        redirect("/login");
    }

    const queryClient = getQueryClient();
    void queryClient.prefetchQuery(trpc.clarities.getCourseDetails.queryOptions({ courseId }));

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <Suspense fallback={<LoadingDisplay title="Loading Roadmap" description="Charting your learning path..." />}>
                <ErrorBoundary fallback={<ErrorDisplay title="Failed to load course" description="Course not found or an error occurred." />}>
                    <ClaritiesRoadmap courseId={courseId} />
                </ErrorBoundary>
            </Suspense>
        </HydrationBoundary>
    );
};

export default Page;
