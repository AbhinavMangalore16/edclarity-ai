"use client";

import { use } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BookOpenIcon, LockIcon, PlayCircleIcon, ArrowLeftIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

function getValidImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  }
  return url;
}

export default function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const router = useRouter();
  const trpc = useTRPC();

  const { data: course, isLoading } = useQuery(trpc.lms.getCourseDetails.queryOptions({ courseId }));
  const checkoutMutation = useMutation(
    trpc.lms.createDodoCheckoutSession.mutationOptions({
      onSuccess: (data: { checkoutUrl?: string }) => {
        if (data.checkoutUrl) {
          if (data.checkoutUrl.startsWith("http")) {
            toast.loading("Redirecting to Dodo Payments...");
            window.location.href = data.checkoutUrl;
          } else {
            toast.success("Enrolled in course successfully!");
            router.push(data.checkoutUrl);
          }
        }
      },
      onError: (err: { message?: string }) => {
        toast.error(err.message || "Checkout session failed");
      },
    })
  );

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2Icon className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col items-center justify-center text-center">
        <h3 className="text-lg font-semibold mb-2">Course not found</h3>
        <Link href="/courses">
          <Button variant="outline" size="sm">Back to Catalog</Button>
        </Link>
      </div>
    );
  }

  const isFree = !course.price || course.price === 0;
  const canAccess = isFree || course.isPurchased;
  const displayImageUrl = getValidImageUrl(course.imageUrl);

  return (
    <>
      <div className="flex items-center justify-between mb-4 px-4 py-2 md:px-8">
        <div>
          <Link href="/courses" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-1">
            <ArrowLeftIcon className="w-3.5 h-3.5" /> Back to Catalog
          </Link>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">{course.title}</h3>
            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
              {course.chapters?.length || 0} Chapters
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h4 className="text-base font-semibold text-foreground mb-2">Course Overview</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {course.description || "Master this course through step-by-step video lessons and AI Co-Teacher interaction."}
              </p>
            </div>

            {/* Curriculum */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h4 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2 border-b border-border pb-2">
                <BookOpenIcon className="w-4 h-4 text-purple-600" /> Course Curriculum
              </h4>

              <div className="space-y-2.5">
                {course.chapters?.map((chapter, index) => (
                  <div
                    key={chapter.id}
                    className="flex items-center justify-between p-3.5 bg-muted/40 border border-border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div>
                        <h5 className="font-medium text-foreground text-sm">{chapter.title}</h5>
                        {chapter.isFree && (
                          <span className="text-[10px] text-emerald-600 font-semibold">Free Preview</span>
                        )}
                      </div>
                    </div>

                    <div>
                      {canAccess || chapter.isFree ? (
                        <Link href={`/learn/${course.id}?chapterId=${chapter.id}`}>
                          <Button size="sm" variant="outline" className="flex items-center gap-1 text-xs">
                            <PlayCircleIcon className="w-3.5 h-3.5" /> Watch
                          </Button>
                        </Link>
                      ) : (
                        <LockIcon className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Purchase Box */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
              <div className="relative aspect-video w-full rounded-lg bg-muted overflow-hidden">
                {displayImageUrl ? (
                  <Image src={displayImageUrl} alt={course.title} fill unoptimized className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted/60">
                    <BookOpenIcon className="w-10 h-10 text-muted-foreground/40" />
                  </div>
                )}
              </div>

              <div className="flex items-baseline justify-between pt-2">
                <span className="text-xs text-muted-foreground">Fee</span>
                <span className="text-2xl font-bold text-foreground">
                  {isFree ? "Free" : `₹${(course.price! / 100).toLocaleString('en-IN')}`}
                </span>
              </div>

              {canAccess ? (
                <Link href={`/learn/${course.id}`} className="block">
                  <Button className="w-full font-semibold">
                    Start Learning Now
                  </Button>
                </Link>
              ) : (
                <Button
                  onClick={() => checkoutMutation.mutate({ courseId: course.id })}
                  disabled={checkoutMutation.isPending}
                  className="w-full font-semibold"
                >
                  {checkoutMutation.isPending ? (
                    <Loader2Icon className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    `Buy Course for ₹${(course.price! / 100).toLocaleString('en-IN')}`
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

