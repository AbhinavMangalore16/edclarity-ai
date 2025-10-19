"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { AgentIdViewHeader } from "../components/agentid-view-header";
import { CustomAvatar } from "@/components/extras/custom-avatar";
import { Badge } from "@/components/ui/badge";
import {
    VideoIcon,
    Brain,
    Notebook,
    Target,
    StickyNote,
    Sparkles,
    ChevronDown,
    ChevronUp,
    BookOpen,
    Link2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useConfirm } from "../../hooks/useConfirm";

// Helper: Assign Tailwind color classes based on value
const getPersonalityColor = (personality: string) => {
    const colors: Record<string, string> = {
        Default: "bg-gray-100 text-gray-700 border-gray-200",
        Friendly: "bg-green-100 text-green-700 border-green-200",
        Strict: "bg-red-100 text-red-700 border-red-200",
        Professional: "bg-blue-100 text-blue-700 border-blue-200",
        Playful: "bg-pink-100 text-pink-700 border-pink-200",
    };
    return colors[personality] || colors.Default;
};

const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
        Novice: "bg-gray-100 text-gray-700 border-gray-200",
        Beginner: "bg-green-100 text-green-700 border-green-200",
        Intermediate: "bg-blue-100 text-blue-700 border-blue-200",
        Advanced: "bg-purple-100 text-purple-700 border-purple-200",
        Expert: "bg-yellow-100 text-yellow-800 border-yellow-200",
    };
    return colors[level] || colors.Beginner;
};

interface AgentidViewProps {
    agentid: string;
}

export const AgentIdView = ({ agentid }: AgentidViewProps) => {
    const trpc = useTRPC();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { data } = useSuspenseQuery(
        trpc.agents.getOne.queryOptions({ id: agentid })
    );
    const removeAgent = useMutation(
        trpc.agents.remove.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries(trpc.agents.getMany.queryOptions({}))
            },
            onError: (error) => {
                toast.error(error.message)
            }
        })
    )

    const { metadata } = data;

    // Collapsible states
    const [showNotes, setShowNotes] = useState(false);
    const [showGoals, setShowGoals] = useState(false);
    const [showTopics, setShowTopics] = useState(false);
    const [showResources, setShowResources] = useState(false);
    const [RemoveConfirm, confirmedRemoved] = useConfirm(
        "Are you absolutely sure?",
        `This action shall remove ${data.meetingCount} associated meetings!`
    )

    const handleRemoveAgent = async () => {
        const removingNow = await confirmedRemoved();
        if (!removingNow) return;
        await removeAgent.mutateAsync(
            { id: agentid },
            {
                onSuccess: () => {
                    toast.success(`${data.name} deleted successfully`);
                    router.push("/agentic");
                },
                onError: (error) => {
                    toast.error(error.message || "Failed to delete agent");
                },
            }
        );
    }
    return (
        <>
            <RemoveConfirm />
            <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-6">
                <AgentIdViewHeader
                    agentid={agentid}
                    agentName={data.name}
                    onEdit={() => { }}
                    onRemove={handleRemoveAgent}
                />

                <div className="bg-white rounded-xl border shadow-sm p-6 space-y-6">
                    {/* Avatar and Basic Info */}
                    <div className="flex items-center gap-x-4">
                        <CustomAvatar
                            variant="adventurer"
                            seed={data.name}
                            className="size-16"
                        />
                        <div>
                            <h2 className="text-2xl font-semibold">{data.name}</h2>
                            <Badge
                                variant="outline"
                                className="mt-2 flex items-center gap-x-2 text-sm font-medium"
                            >
                                <VideoIcon className="size-4 text-green-800" />
                                {data.meetingCount}{" "}
                                {data.meetingCount === 1 ? "meeting" : "meetings"}
                            </Badge>
                        </div>
                    </div>

                    {/* Instructions */}
                    <section className="space-y-2">
                        <h3 className="text-lg font-medium flex items-center gap-x-2">
                            <Notebook className="size-4 text-gray-600" />
                            Instructions
                        </h3>
                        <p className="text-gray-800 leading-relaxed">{data.instructions}</p>
                    </section>

                    {/* Personality & Level */}
                    <section className="flex flex-wrap items-center gap-3">
                        <Badge
                            className={`flex items-center gap-x-2 px-3 py-1 text-sm font-medium border ${getPersonalityColor(
                                metadata.personality
                            )}`}
                        >
                            <Sparkles className="size-4" />
                            Personality: {metadata.personality}
                        </Badge>

                        <Badge
                            className={`flex items-center gap-x-2 px-3 py-1 text-sm font-medium border ${getLevelColor(
                                metadata.level
                            )}`}
                        >
                            <Brain className="size-4" />
                            Level: {metadata.level}
                        </Badge>
                    </section>

                    {/* Notes (collapsible) */}
                    {metadata.notes && metadata.notes.trim().length > 0 && (
                        <section className="space-y-2">
                            <div
                                className="flex justify-between items-center cursor-pointer"
                                onClick={() => setShowNotes(!showNotes)}
                            >
                                <h3 className="text-lg font-medium flex items-center gap-x-2">
                                    <StickyNote className="size-4 text-gray-600" />
                                    Notes
                                </h3>
                                {showNotes ? <ChevronUp /> : <ChevronDown />}
                            </div>
                            {showNotes && (
                                <p className="text-gray-800 leading-relaxed">{metadata.notes}</p>
                            )}
                        </section>
                    )}

                    {/* Goals (collapsible) */}
                    {metadata.goals && metadata.goals.length > 0 && (
                        <section className="space-y-2">
                            <div
                                className="flex justify-between items-center cursor-pointer"
                                onClick={() => setShowGoals(!showGoals)}
                            >
                                <h3 className="text-lg font-medium flex items-center gap-x-2">
                                    <Target className="size-4 text-gray-600" />
                                    Goals
                                </h3>
                                {showGoals ? <ChevronUp /> : <ChevronDown />}
                            </div>
                            {showGoals && (
                                <ul className="list-disc pl-5 text-gray-800 space-y-1">
                                    {metadata.goals.map((goal, i) => (
                                        <li key={i}>{goal}</li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    )}

                    {/* Topics (collapsible) */}
                    {metadata.topics?.length > 0 && (
                        <section className="space-y-2">
                            <div
                                className="flex justify-between items-center cursor-pointer"
                                onClick={() => setShowTopics(!showTopics)}
                            >
                                <h3 className="text-lg font-medium flex items-center gap-x-2">
                                    <BookOpen className="size-4 text-gray-600" />
                                    Topics
                                </h3>
                                {showTopics ? <ChevronUp /> : <ChevronDown />}
                            </div>
                            {showTopics && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {metadata.topics.map((topic, i) => (
                                        <Badge key={i} variant="outline" className="px-2 py-1">
                                            {topic}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* Resources (collapsible) */}
                    {metadata.resources?.length > 0 && (
                        <section className="space-y-2">
                            <div
                                className="flex justify-between items-center cursor-pointer"
                                onClick={() => setShowResources(!showResources)}
                            >
                                <h3 className="text-lg font-medium flex items-center gap-x-2">
                                    <Link2 className="size-4 text-gray-600" />
                                    Resources
                                </h3>
                                {showResources ? <ChevronUp /> : <ChevronDown />}
                            </div>
                            {showResources && (
                                <ul className="list-disc pl-5 text-gray-800 space-y-1">
                                    {metadata.resources.map((r, i) => (
                                        <li key={i}>
                                            <a
                                                href={r}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline"
                                            >
                                                {r}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    )}
                </div>
            </div>
        </>
    );
};
