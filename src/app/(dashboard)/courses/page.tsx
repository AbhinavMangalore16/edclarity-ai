"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon, BookOpenIcon, PlayCircleIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import EmptyAgents from "@/components/extras/empty-state";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

function getValidImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  }
  return url;
}

export default function CoursesCatalogPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const trpc = useTRPC();

  const { data: categories = [] } = useQuery(trpc.lms.getCategories.queryOptions());
  const { data: courses = [], isLoading } = useQuery(
    trpc.lms.getCourses.queryOptions({
      title: search || undefined,
      categoryId: selectedCategory || undefined,
    })
  );

  return (
    <>
      <div className="flex items-center justify-between mb-4 px-4 py-2 md:px-8">
        <div>
          <h3 className="text-lg font-semibold text-foreground">LMS Courses</h3>
          <p className="text-xs text-muted-foreground">Explore interactive courses with AI-powered timestamp search & flashcards.</p>
        </div>
      </div>

      <ScrollArea>
        <div className="flex flex-wrap items-center gap-3 px-4 md:px-8 mb-4">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <Button
              size="sm"
              variant={selectedCategory === null ? "default" : "outline"}
              onClick={() => setSelectedCategory(null)}
              className="h-8 text-xs rounded-full"
            >
              All Courses
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                size="sm"
                variant={selectedCategory === cat.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(cat.id)}
                className="h-8 text-xs rounded-full whitespace-nowrap"
              >
                {cat.name}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </div>
      </ScrollArea>

      <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-card border border-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <EmptyAgents
            title="No courses found"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const displayImageUrl = getValidImageUrl(course.imageUrl);
              return (
                <Link key={course.id} href={`/courses/${course.id}`}>
                  <div className="group bg-card border border-border hover:border-purple-300 rounded-xl overflow-hidden transition-all shadow-sm hover:shadow-md flex flex-col h-full">
                    {/* Thumbnail */}
                    <div className="relative aspect-video w-full bg-muted overflow-hidden">
                      {displayImageUrl ? (
                        <Image
                          src={displayImageUrl}
                          alt={course.title}
                          fill
                          unoptimized
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted/60">
                          <BookOpenIcon className="w-10 h-10 text-muted-foreground/40" />
                        </div>
                      )}
                      {course.isProOnly && (
                        <Badge className="absolute top-2.5 right-2.5 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5">
                          PRO
                        </Badge>
                      )}
                    </div>


                  {/* Content */}
                  <div className="p-4 flex flex-col flex-1 justify-between">
                    <div>
                      <h4 className="text-base font-semibold text-foreground group-hover:text-purple-700 transition-colors line-clamp-1 mb-1">
                        {course.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                        {course.description || "Interactive AI-powered course content with video lessons and practice quizzes."}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <PlayCircleIcon className="w-3.5 h-3.5 text-purple-600" />
                        <span>{course.chapters?.length || 0} Chapters</span>
                      </div>

                      <span className="font-semibold text-foreground">
                        {course.price && course.price > 0 ? `₹${(course.price / 100).toLocaleString('en-IN')}` : "Free"}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}


          </div>
        )}
      </div>
    </>
  );
}


