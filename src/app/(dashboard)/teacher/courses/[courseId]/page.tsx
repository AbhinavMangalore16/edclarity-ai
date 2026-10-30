"use client";

import { use, useState, useEffect } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { ArrowLeftIcon, GripVerticalIcon, PlusIcon, Edit3Icon, Loader2Icon, UploadIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function TeacherCourseStudioPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const router = useRouter();
  const trpc = useTRPC();

  const { data: course, isLoading, refetch } = useQuery(trpc.lms.getCourseDetails.queryOptions({ courseId }));

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [imageUrl, setImageUrl] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  // Chapter List State for Drag-and-Drop
  const [chapters, setChapters] = useState<{ id: string; title: string; position: number; isPublished: boolean }[]>([]);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [isChapterDialogOpen, setIsChapterDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (course) {
      setTitle(course.title || "");
      setDescription(course.description || "");
      setPrice(course.price ? course.price / 100 : 0);
      setImageUrl(course.imageUrl || "");
      setIsPublished(course.isPublished || false);
      if (course.chapters) {
        setChapters(course.chapters.map((c: any) => ({ id: c.id, title: c.title, position: c.position, isPublished: c.isPublished })));
      }
    }
  }, [course]);

  const updateCourseMutation = useMutation(
    trpc.lms.updateCourse.mutationOptions({
      onSuccess: () => {
        toast.success("Course saved!");
        refetch();
      },
      onError: (err: { message?: string }) => {
        toast.error(err.message || "Failed to save course");
      },
    })
  );

  const deleteCourseMutation = useMutation(
    trpc.lms.deleteCourse.mutationOptions({
      onSuccess: () => {
        toast.success("Course deleted successfully!");
        router.push("/teacher/courses");
      },
      onError: (err: { message?: string }) => {
        toast.error(err.message || "Failed to delete course");
      },
    })
  );

  const createChapterMutation = useMutation(
    trpc.lms.createChapter.mutationOptions({
      onSuccess: () => {
        toast.success("Chapter added!");
        setNewChapterTitle("");
        setIsChapterDialogOpen(false);
        refetch();
      },
    })
  );

  const deleteChapterMutation = useMutation(
    trpc.lms.deleteChapter.mutationOptions({
      onSuccess: () => {
        toast.success("Chapter and associated Mux video deleted!");
        refetch();
      },
      onError: (err: { message?: string }) => {
        toast.error(err.message || "Failed to delete chapter");
      },
    })
  );

  const reorderChaptersMutation = useMutation(
    trpc.lms.reorderChapters.mutationOptions({
      onSuccess: () => {
        toast.success("Chapters reordered!");
      },
    })
  );

  const muxUploadMutation = useMutation(trpc.lms.createMuxDirectUpload.mutationOptions({}));
  const syncMuxUploadMutation = useMutation(trpc.lms.syncMuxUpload.mutationOptions({}));

  const handleSaveCourse = () => {
    updateCourseMutation.mutate({
      courseId,
      title,
      description,
      price: Math.round(price * 100),
      imageUrl,
      isPublished,
    });
  };

  const handleCreateChapter = () => {
    if (!newChapterTitle.trim()) return;
    createChapterMutation.mutate({ courseId, title: newChapterTitle });
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(chapters);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updated = items.map((item, index) => ({
      ...item,
      position: index + 1,
    }));

    setChapters(updated);
    reorderChaptersMutation.mutate({
      courseId,
      list: updated.map(u => ({ id: u.id, position: u.position })),
    });
  };

  const handleUploadVideoToMux = async (chapterId: string, file: File) => {
    try {
      toast.loading("Generating Mux upload URL...", { id: 'mux-upload' });
      const res = await muxUploadMutation.mutateAsync({ chapterId, courseId });
      const uploadUrl = res?.uploadUrl;
      const uploadId = res?.uploadId;
      if (!uploadUrl || !uploadId) {
        throw new Error("Failed to get Mux upload URL");
      }

      toast.loading("Uploading video bytes to Mux...", { id: 'mux-upload' });
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
      });

      toast.loading("Syncing HLS stream & updating chapter...", { id: 'mux-upload' });
      for (let i = 0; i < 10; i++) {
        const syncRes = await syncMuxUploadMutation.mutateAsync({ uploadId, chapterId, courseId });
        if (syncRes && 'videoUrl' in syncRes && syncRes.videoUrl) {
          toast.success("Video uploaded and ready to stream!", { id: 'mux-upload' });
          refetch();
          return;
        }
        await new Promise(r => setTimeout(r, 2000));
      }

      toast.success("Video uploaded to Mux! Processing in background...", { id: 'mux-upload' });
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Video upload failed", { id: 'mux-upload' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2Icon className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4 px-4 py-2 md:px-8">
        <div>
          <Link href="/teacher/courses" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-1">
            <ArrowLeftIcon className="w-3.5 h-3.5" /> Back to Teacher Studio
          </Link>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">{title || "Course Studio"}</h3>
            <Badge
              variant="outline"
              className={isPublished ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"}
            >
              {isPublished ? "Published" : "Draft Studio"}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => {
              setIsPublished(!isPublished);
              updateCourseMutation.mutate({ courseId, isPublished: !isPublished });
            }}
            variant="outline"
            size="sm"
          >
            {isPublished ? "Unpublish" : "Publish Course"}
          </Button>
          <Button type="button" onClick={handleSaveCourse} disabled={updateCourseMutation.isPending} size="sm">
            {updateCourseMutation.isPending ? <Loader2Icon className="w-4 h-4 animate-spin mr-1.5" /> : "Save Changes"}
          </Button>

          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="text-rose-600 border-rose-200 hover:bg-rose-50 flex items-center gap-1">
                <Trash2Icon className="w-3.5 h-3.5" /> Delete
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-popover border border-border text-popover-foreground">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold text-rose-600">Delete Course</DialogTitle>
              </DialogHeader>
              <div className="py-2 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete <span className="font-semibold text-foreground">&quot;{title}&quot;</span>? All chapters and associated video assets will be permanently removed.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsDeleteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={deleteCourseMutation.isPending}
                    onClick={() => deleteCourseMutation.mutate({ courseId })}
                  >
                    {deleteCourseMutation.isPending ? <Loader2Icon className="w-4 h-4 animate-spin mr-1.5" /> : "Confirm Delete"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Cols: Course Settings */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
              <h4 className="text-base font-semibold text-foreground border-b border-border pb-2">Course Details</h4>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Course Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Description</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Price (INR ₹)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Thumbnail URL</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-3.5 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Chapter Reordering & Video Direct Upload to Mux */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
                <h4 className="text-base font-semibold text-foreground">Chapters Curriculum</h4>
                <Dialog open={isChapterDialogOpen} onOpenChange={setIsChapterDialogOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" size="sm" variant="outline" className="flex items-center gap-1">
                      <PlusIcon className="w-3.5 h-3.5" /> Add Chapter
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-popover border border-border text-popover-foreground">
                    <DialogHeader>
                      <DialogTitle className="text-base font-semibold">Add New Chapter</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                      <input
                        type="text"
                        placeholder="Chapter Title"
                        value={newChapterTitle}
                        onChange={(e) => setNewChapterTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateChapter();
                          }
                        }}
                        className="w-full px-3.5 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <Button type="button" onClick={handleCreateChapter} className="w-full">
                        Save Chapter
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Drag & Drop List */}
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="chapters">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2.5">
                      {chapters.map((chapter, index) => (
                        <Draggable key={chapter.id} draggableId={chapter.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="flex items-center justify-between p-3 bg-muted/40 border border-border rounded-lg"
                            >
                              <div className="flex items-center gap-2.5">
                                <div {...provided.dragHandleProps} className="text-muted-foreground hover:text-foreground cursor-grab">
                                  <GripVerticalIcon className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium text-foreground">{chapter.title}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Direct Upload to Mux */}
                                <label className="cursor-pointer text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-md border border-purple-200 flex items-center gap-1 transition-colors">
                                  <UploadIcon className="w-3.5 h-3.5" /> Mux Video
                                  <input
                                    type="file"
                                    accept="video/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleUploadVideoToMux(chapter.id, file);
                                    }}
                                  />
                                </label>

                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                  onClick={() => {
                                    if (confirm(`Delete chapter "${chapter.title}"? Associated Mux video will be removed.`)) {
                                      deleteChapterMutation.mutate({ chapterId: chapter.id, courseId });
                                    }
                                  }}
                                >
                                  <Trash2Icon className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

