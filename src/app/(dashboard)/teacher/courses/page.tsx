"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PlusIcon, BookOpenCheckIcon, Edit3Icon, Loader2Icon, SparklesIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import EmptyAgents from "@/components/extras/empty-state";

export default function TeacherCoursesPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);

  const { data: currentUser } = useQuery(trpc.lms.getCurrentUser.queryOptions());
  const { data: courses = [], isLoading, refetch } = useQuery(trpc.lms.getTeacherCourses.queryOptions());

  const createCourseMutation = useMutation(
    trpc.lms.createCourse.mutationOptions({
      onSuccess: (course: { id: string }) => {
        toast.success("Course created!");
        setIsOpen(false);
        setNewCourseTitle("");
        router.push(`/teacher/courses/${course.id}`);
      },
      onError: (err: { message?: string }) => {
        toast.error(err.message || "Failed to create course");
      },
    })
  );

  const deleteCourseMutation = useMutation(
    trpc.lms.deleteCourse.mutationOptions({
      onSuccess: () => {
        toast.success("Course deleted successfully!");
        setDeletingCourseId(null);
        refetch();
      },
      onError: (err: { message?: string }) => {
        toast.error(err.message || "Failed to delete course");
      },
    })
  );

  const handleCreate = () => {
    if (!newCourseTitle.trim()) return;
    createCourseMutation.mutate({ title: newCourseTitle });
  };

  if (currentUser && currentUser.role === "student") {
    return (
      <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
        <h3 className="text-xl font-bold text-foreground mb-2">Teacher Permission Required</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">
          Your account is currently set to Student role. Use the bottom profile menu to switch to Teacher or Admin role to access Teacher Studio.
        </p>
        <Link href="/courses">
          <Button variant="outline" size="sm">Back to LMS Courses</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4 px-4 py-2 md:px-8">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Teacher Studio</h3>
          <p className="text-xs text-muted-foreground">Create, manage, and publish your course curriculum.</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button type="button" className="flex items-center gap-2">
              <PlusIcon className="w-4 h-4" />
              Add New Course
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-popover text-popover-foreground border border-border">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">Name your course</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <input
                type="text"
                placeholder="e.g. Advanced Next.js 16 & AI Agents Masterclass"
                value={newCourseTitle}
                onChange={(e) => setNewCourseTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button
                type="button"
                onClick={handleCreate}
                disabled={createCourseMutation.isPending || !newCourseTitle.trim()}
                className="w-full"
              >
                {createCourseMutation.isPending ? <Loader2Icon className="w-4 h-4 animate-spin mr-2" /> : "Create & Edit Curriculum"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 bg-card border border-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <EmptyAgents
            title="No courses created yet"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course: any) => (
              <div
                key={course.id}
                className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Badge
                      variant="outline"
                      className={course.isPublished ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"}
                    >
                      {course.isPublished ? "Published" : "Draft"}
                    </Badge>
                    <span className="text-sm font-semibold text-foreground">
                      {course.price && course.price > 0 ? `₹${(course.price / 100).toLocaleString('en-IN')}` : "Free"}
                    </span>
                  </div>
                  <h4 className="text-base font-semibold text-foreground mb-1 line-clamp-1">{course.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{course.description || "No description added."}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border text-xs">
                  <span className="text-muted-foreground">{course.chapters?.length || 0} Chapters</span>
                  <div className="flex items-center gap-2">
                    <Link href={`/teacher/courses/${course.id}`}>
                      <Button type="button" size="sm" variant="outline" className="flex items-center gap-1.5 text-xs">
                        <Edit3Icon className="w-3.5 h-3.5" /> Edit Studio
                      </Button>
                    </Link>

                    <Dialog open={deletingCourseId === course.id} onOpenChange={(open) => setDeletingCourseId(open ? course.id : null)}>
                      <DialogTrigger asChild>
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                          <Trash2Icon className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-popover border border-border text-popover-foreground">
                        <DialogHeader>
                          <DialogTitle className="text-base font-semibold text-rose-600">Delete Course</DialogTitle>
                        </DialogHeader>
                        <div className="py-2 space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Are you sure you want to delete <span className="font-semibold text-foreground">&quot;{course.title}&quot;</span>? This action cannot be undone.
                          </p>
                          <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setDeletingCourseId(null)}>
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              disabled={deleteCourseMutation.isPending}
                              onClick={() => deleteCourseMutation.mutate({ courseId: course.id })}
                            >
                              {deleteCourseMutation.isPending ? <Loader2Icon className="w-4 h-4 animate-spin mr-1.5" /> : "Delete Course"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

