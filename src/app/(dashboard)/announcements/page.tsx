"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MegaphoneIcon, RocketIcon, FileTextIcon, VideoIcon, BotMessageSquareIcon, SparklesIcon, BookOpenIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const changelog = [
  {
    title: "LibraAI (RAG Assistant)",
    description: "Our intelligent Retrieval-Augmented Generation agent. Chat with study material seamlessly.",
    icon: SparklesIcon,
    highlights: [
      "Advanced hybrid retrieval for high accuracy",
      "Interactive 'Clarity Mode' with real-time performance telemetry",
      "Per-query Faithfulness and Hallucination scoring"
    ]
  },
  {
    title: "Meeting Intelligence",
    description: "Transform how you manage meetings with automated transcription and insights.",
    icon: VideoIcon,
    highlights: [
      "Automated video meeting transcription",
      "AI-powered meeting summarization and action items extraction"
    ]
  },
  {
    title: "EdTutors Integration",
    description: "Customized AI agents to assist with specific educational and administrative workflows.",
    icon: BotMessageSquareIcon,
    highlights: [
      "Deploy specialized agents for distinct tasks",
      "Seamless integration with your institutional knowledge base"
    ]
  },
  {
    title: "Official Documentation & Manual",
    description: "Comprehensive guides to help you get the most out of EdClarity.ai.",
    icon: BookOpenIcon,
    highlights: [
      "Complete user manual for all platform features",
      "Developer documentation and API references"
    ]
  },
  {
    title: "Redesigned Dashboard UI",
    description: "A fresh, modern, and highly responsive user interface.",
    icon: FileTextIcon,
    highlights: [
      "Glassmorphic design elements and cohesive branding",
      "Improved mobile and tablet responsiveness",
      "Unified dark mode support"
    ]
  }
];

export default function AnnouncementsPage() {
  return (
    <div className="flex flex-col flex-1 w-full max-w-5xl mx-auto space-y-6 p-4 md:p-8">
      <div className="flex flex-col items-center text-center space-y-4 mb-4">
        <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full">
          <MegaphoneIcon className="w-8 h-8 text-purple-600" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Developer Announcements
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl">
          Stay up to date with the latest features, improvements, and bug fixes across the EdClarity.ai platform.
        </p>
      </div>

      <Card className="flex flex-col border-purple-100 dark:border-purple-900/30 shadow-md bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm overflow-hidden mb-8">
        <CardHeader className="border-b border-purple-100 dark:border-purple-900/30 bg-purple-50/50 dark:bg-zinc-900/50 flex flex-row items-center justify-between py-6">
          <div className="space-y-1">
            <CardTitle className="text-2xl flex items-center gap-2">
              <RocketIcon className="w-6 h-6 text-purple-600" />
              EdClarity.ai Version 1.0.0-beta
            </CardTitle>
            <CardDescription className="text-base">
              The foundational beta release introducing our core AI platform capabilities.
            </CardDescription>
          </div>
          <Badge className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-3 py-1">
            Latest Release
          </Badge>
        </CardHeader>
        <ScrollArea>
          <CardContent className="p-6 md:p-8 space-y-8">
            <div className="grid gap-8">
              {changelog.map((item, index) => (
                <div key={index} className="flex gap-4">
                  <div className="mt-1 flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{item.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400">{item.description}</p>
                    <ul className="list-disc list-inside space-y-1 pt-2 text-gray-700 dark:text-gray-300">
                      {item.highlights.map((highlight, idx) => (
                        <li key={idx} className="text-sm">{highlight}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t border-purple-100 dark:border-purple-900/30 text-center">
              <p className="text-sm text-gray-500">
                Thank you for participating in the EdClarity.ai beta program. Your feedback shapes our future!
              </p>
            </div>
          </CardContent>
        </ScrollArea>
      </Card>
    </div>
  );
}
