"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MegaphoneIcon,
  RocketIcon,
  FileTextIcon,
  BotMessageSquareIcon,
  SparklesIcon,
  BookOpenIcon,
  ShieldCheckIcon,
  CpuIcon,
  GraduationCapIcon,
  ActivityIcon,
  LockIcon,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const v2Changelog = [
  {
    title: "Olympus-EdC-v1 Proprietary AI Model Suite",
    description: "Introducing our EdC-v1 model lineup with complexity-based routing and automatic failover.",
    icon: CpuIcon,
    highlights: [
      "Athena-EdC-v1 (Balanced Primary LLM) & Hermes-EdC-v1 (Sub-50ms Instant Inference)",
      "Apollo-EdC-v1 (Deep Reasoning Pro Model) & Prometheus-EdC-v1 (Structured JSON Generator)",
      "Mnemosyne-EdC-v1 semantic embeddings & cross-encoder reranking with Zelos/Iris-EdC-v1 failover pool",
    ],
  },
  {
    title: "Enterprise AI Hardening, Guardrails v2 & PII Redaction",
    description: "Production-grade safety, 2-level semantic caching, and Human-in-the-Loop governance.",
    icon: ShieldCheckIcon,
    highlights: [
      "2-Stage Guardrails with automatic PII scrubbing (emails, phones, IDs, cards) prior to model inference",
      "L1 Exact SHA-256 + L2 Mnemosyne-EdC-v1 vector semantic cache for instant repeat query responses",
      "Admin Human-in-the-Loop (HITL) Review Queue and p50/p95/p99 Observability",
    ],
  },
  {
    title: "LMS Course Marketplace, Teacher Studio & 85% Creator Split",
    description: "Full creator economy with HD video streaming and Dodo Payments checkout.",
    icon: GraduationCapIcon,
    highlights: [
      "Teachers earn an automated 85% net revenue share on every course sale via Dodo Payments",
      "Transactional Outbox CDC & Inngest workers keep course PDFs and vector indices automatically synced",
      "10-feature Learning-to-Rank (LTR) engine in LibraAI with citation and thumbs-up/down feedback loops",
    ],
  },
  {
    title: "Encrypted RBAC Role Elevation, Email OTP & Legal Hub",
    description: "Hardened account security and transparent platform governance.",
    icon: LockIcon,
    highlights: [
      "PBKDF2-SHA256 encrypted passphrase modal when elevating from Student to Teacher or SuperAdmin",
      "Live 6-digit Email OTP verification for new account sign-ups and password recovery",
      "Interactive Terms of Service (/terms) and Privacy Policy (/privacy) hub linked across the platform",
    ],
  },
];

const v1Changelog = [
  {
    title: "Voice Dictation & Smart Citations",
    description: "Speak directly to LibraAI and view beautifully formatted Markdown answers.",
    icon: SparklesIcon,
    highlights: [
      "Web Speech API integration for hands-free voice-to-text queries",
      "Full Markdown support in chat bubbles for lists, bold text, and code",
      "PDF source citations now perfectly hyperlink and open directly from the backend",
    ],
  },
  {
    title: "Personalized Knowledge Space",
    description: "Toggle between global knowledge and your specific uploaded files.",
    icon: FileTextIcon,
    highlights: [
      "New Global vs Personalized toggle in the query box",
      "Persistent guest IDs ensure your uploaded documents are retained across sessions",
      "Backend securely partitions RAG vector space per user",
    ],
  },
  {
    title: "Mobile Responsivity & Telemetry",
    description: "Extensive polishing for mobile users and dashboard graphs.",
    icon: BotMessageSquareIcon,
    highlights: [
      "Clarity Mode drawer now allows full background interaction on mobile",
      "Evaluation graphs fixed to support new Tailwind CSS v4 variables",
      "Video modal and landing page assets perfectly adhere to mobile screen bounds",
    ],
  },
  {
    title: "LibraAI (RAG Assistant)",
    description: "Our core intelligent Retrieval-Augmented Generation agent.",
    icon: BookOpenIcon,
    highlights: [
      "Advanced hybrid retrieval for high accuracy",
      "Interactive 'Clarity Mode' with real-time performance telemetry",
    ],
  },
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
          Stay up to date with the latest major releases, Olympus-EdC-v1 model upgrades, and platform improvements across EdClarity.ai.
        </p>
      </div>

      {/* Major Release v2.0.0 Card */}
      <Card className="flex flex-col border-purple-200 dark:border-purple-900/40 shadow-lg bg-white/90 dark:bg-zinc-950/90 backdrop-blur-sm overflow-hidden mb-8">
        <CardHeader className="border-b border-purple-100 dark:border-purple-900/30 bg-gradient-to-r from-purple-50/80 via-indigo-50/50 to-purple-50/80 dark:from-zinc-900/80 dark:to-zinc-900/50 flex flex-row items-center justify-between py-6">
          <div className="space-y-1">
            <CardTitle className="text-2xl flex items-center gap-2">
              <RocketIcon className="w-6 h-6 text-purple-600" />
              EdClarity.ai Version 2.0.0 — The Olympus Release
            </CardTitle>
            <CardDescription className="text-base">
              Major production release introducing the Olympus-EdC-v1 model suite, 9-phase AI hardening, Teacher Studio 85% revenue split, and encrypted RBAC.
            </CardDescription>
          </div>
          <Badge className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-3 py-1 shrink-0">
            v2.0.0 Major Release
          </Badge>
        </CardHeader>
        <ScrollArea>
          <CardContent className="p-6 md:p-8 space-y-8">
            <div className="grid gap-8">
              {v2Changelog.map((item, index) => (
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
          </CardContent>
        </ScrollArea>
      </Card>

      {/* Previous Release v1.1.0-beta Card */}
      <Card className="flex flex-col border-purple-100 dark:border-purple-900/30 shadow-md bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm overflow-hidden mb-8 opacity-90">
        <CardHeader className="border-b border-purple-100 dark:border-purple-900/30 bg-purple-50/50 dark:bg-zinc-900/50 flex flex-row items-center justify-between py-6">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <ActivityIcon className="w-5 h-5 text-purple-500" />
              EdClarity.ai Version 1.1.0-beta
            </CardTitle>
            <CardDescription className="text-sm">
              Previous milestone introducing Voice Dictation, Personalized RAG, and mobile responsiveness.
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-purple-300 text-purple-700 dark:text-purple-300 text-xs px-3 py-1 shrink-0">
            Previous Release
          </Badge>
        </CardHeader>
        <ScrollArea>
          <CardContent className="p-6 md:p-8 space-y-8">
            <div className="grid gap-8">
              {v1Changelog.map((item, index) => (
                <div key={index} className="flex gap-4">
                  <div className="mt-1 flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{item.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{item.description}</p>
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
                Thank you for building and learning with EdClarity.ai!
              </p>
            </div>
          </CardContent>
        </ScrollArea>
      </Card>
    </div>
  );
}
