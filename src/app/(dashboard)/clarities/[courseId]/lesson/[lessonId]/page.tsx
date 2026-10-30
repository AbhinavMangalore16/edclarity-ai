import { ClaritiesLesson } from "@/modules/clarities/ui/views/clarities-lesson";
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
  params: Promise<{ courseId: string; lessonId: string }>;
}

const Page = async ({ params }: PageProps) => {
    const { courseId, lessonId } = await params;
    
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    if (!session) {
        redirect("/login");
    }

    const queryClient = getQueryClient();
    // We prefetch the course details so the lesson can find itself and check if content is generated
    void queryClient.prefetchQuery(trpc.clarities.getCourseDetails.queryOptions({ courseId }));

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <Suspense fallback={<LoadingDisplay title="Loading Lesson" description="Preparing your interactive learning experience..." />}>
                <ErrorBoundary fallback={<ErrorDisplay title="Failed to load lesson" description="The lesson could not be loaded." />}>
                    <ClaritiesLesson courseId={courseId} lessonId={lessonId} />
                </ErrorBoundary>
            </Suspense>
        </HydrationBoundary>
    );
};

export default Page;
