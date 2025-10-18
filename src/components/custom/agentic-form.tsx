"use client";

import { agenticSchema } from "@/modules/agentic/schemas";
import { AgenticGetOne } from "@/modules/agentic/types";
import { useTRPC } from "@/trpc/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useState, useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import { croodlesNeutral, glass, identicon, rings } from "@dicebear/collection";

import {
    FieldSet,
    FieldTitle,
    Field,
    FieldLabel,
    FieldContent,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";

interface AgenticFormProps {
    onSuccess?: () => void;
    onCancel?: () => void;
    initValues?: AgenticGetOne;
}

export const AgenticForm = ({ onSuccess, onCancel, initValues }: AgenticFormProps) => {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const [step, setStep] = useState(1);
    const [fileUploading, setFileUploading] = useState(false);

    const isEdit = !!initValues?.id;

    const form = useForm<z.infer<typeof agenticSchema>>({
        resolver: zodResolver(agenticSchema),
        defaultValues: initValues
            ? {
                name: initValues.name,
                instructions: initValues.instructions,
                metadata:
                    typeof initValues.metadata === "string"
                        ? JSON.parse(initValues.metadata)
                        : initValues.metadata,
            }
            : {
                name: "",
                instructions: "",
                metadata: {
                    personality: "Default",
                    level: "Beginner",
                    topics: [],
                    resources: [],
                    notes: "",
                    goals: [],
                },
            },
    });

    // Watch name for avatar
    const nameValue = useWatch({ control: form.control, name: "name" });
    const topics = useWatch({ control: form.control, name: "metadata.topics" });
    const goals = useWatch({ control: form.control, name: "metadata.goals" });
    const avatar = useMemo(
        () => createAvatar(rings, { seed: nameValue, size: 16 }).toDataUri(),
        [nameValue]
    );

    // Mutations
    const createAgent = useMutation(trpc.agents.create.mutationOptions({
        onSuccess: async () => {
            await queryClient.invalidateQueries(trpc.agents.getMany.queryOptions());
            if (initValues?.id) {
                await queryClient.invalidateQueries(trpc.agents.getMany.queryOptions({id: initValues.id}));
            }
            onSuccess?.();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    }));

    const onSubmit = (values: z.infer<typeof agenticSchema>) => {
        if (isEdit) {
            console.log("TODO: Update logic for edit");
        } else {
            createAgent.mutate(values);
        }
    };

    const [newTopic, setNewTopic] = useState("");
    const [newGoal, setNewGoal] = useState("");

    const addItem = (type: "topics" | "goals", value: string, reset: (v: string) => void) => {
        if (!value.trim()) return;
        const updated = [...(form.getValues(`metadata.${type}`) || []), value.trim()];
        form.setValue(`metadata.${type}`, updated);
        reset("");
    };

    const deleteItem = (type: "topics" | "goals" | "resources", index: number) => {
        const arr = [...(form.getValues(`metadata.${type}`) || [])];
        arr.splice(index, 1);
        form.setValue(`metadata.${type}`, arr);
    };

    const isPending = createAgent.isPending;

    const submitStep = async () => {
        if (step === 1) {
            // Validate name & instructions
            const valid = await form.trigger(["name", "instructions"]);
            if (!valid) return; // stop if invalid
            setStep(2);
        } else if (step === 2) {
            // No mandatory fields in step 2, just proceed
            setStep(3);
        } else if (step === 3) {
            form.handleSubmit(onSubmit)();
        }
    };

    return (
        <form className="space-y-6 w-full pb-20" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex flex-col h-[65vh] overflow-y-auto space-y-4 pb-32">
                <FieldSet className="space-y-6">
                    <FieldTitle className="text-2xl font-semibold mb-4">
                        {step === 1 && "Step 1: Basic Info"}
                        {step === 2 && "Step 2: Personality & Level"}
                        {step === 3 && "Step 3: Topics, Goals & Notes"}
                    </FieldTitle>

                    {/* Step 1 */}
                    {step === 1 && (
                        <>
                            <Field>
                                <FieldLabel>Avatar</FieldLabel>
                                <FieldContent className="flex justify-center items-center w-full">
                                    <img
                                        src={avatar}
                                        alt="Avatar"
                                        className="w-36 h-36 rounded-full border-2 border-gray-200"
                                    />
                                </FieldContent>
                            </Field>

                            <Field>
                                <FieldLabel>Name</FieldLabel>
                                <FieldContent>
                                    <Input {...form.register("name")} placeholder="Agent name" />
                                    {form.formState.errors.name && (
                                        <span className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</span>
                                    )}
                                </FieldContent>
                            </Field>

                            <Field>
                                <FieldLabel>Instructions</FieldLabel>
                                <FieldContent>
                                    <Textarea
                                        {...form.register("instructions")}
                                        placeholder="Teaching instructions"
                                        rows={4}
                                    />
                                    {form.formState.errors.instructions && (
                                        <span className="text-red-500 text-sm mt-1">{form.formState.errors.instructions.message}</span>
                                    )}
                                </FieldContent>
                            </Field>
                        </>
                    )}

                    {/* Step 2 */}
                    {step === 2 && (
                        <>
                            <Field>
                                <FieldLabel>Personality</FieldLabel>
                                <FieldContent>
                                    <Select
                                        onValueChange={(v) => form.setValue("metadata.personality", v as any)}
                                        defaultValue={form.getValues("metadata.personality")}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select personality" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {["Default", "Friendly", "Strict", "Professional", "Playful"].map(opt => (
                                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FieldContent>
                            </Field>

                            <Field>
                                <FieldLabel>Difficulty Level</FieldLabel>
                                <FieldContent>
                                    <Select
                                        onValueChange={(v) => form.setValue("metadata.level", v as any)}
                                        defaultValue={form.getValues("metadata.level")}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select level" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {["Novice", "Beginner", "Intermediate", "Advanced", "Expert"].map(opt => (
                                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FieldContent>
                            </Field>
                        </>
                    )}

                    {/* Step 3 */}
                    {step === 3 && (
                        <>
                            <Field>
                                <FieldLabel>Topics</FieldLabel>
                                <FieldContent className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded bg-white">
                                    {topics?.map((t, i) => (
                                        <div
                                            key={i}
                                            className="inline-flex w-fit items-center gap-1 bg-gray-100 px-2 py-1 rounded-full text-sm"
                                        >
                                            {t}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteItem("topics", i);
                                                }}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </FieldContent>
                                <div className="flex gap-2 mt-2">
                                    <Input placeholder="Add topic" value={newTopic} onChange={e => setNewTopic(e.target.value)} />
                                    <Button type="button" onClick={() => addItem("topics", newTopic, setNewTopic)}>Add</Button>
                                </div>
                            </Field>

                            <Field>
                                <FieldLabel>Goals</FieldLabel>
                                <FieldContent className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded bg-white">
                                    {goals?.map((g, i) => (
                                        <div
                                            key={i}
                                            className="inline-flex w-fit items-center gap-1 bg-blue-100 px-2 py-1 rounded-full text-sm"
                                        >
                                            {g}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteItem("goals", i);
                                                }}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </FieldContent>
                                <div className="flex gap-2 mt-2">
                                    <Input placeholder="Add goal" value={newGoal} onChange={e => setNewGoal(e.target.value)} />
                                    <Button type="button" onClick={() => addItem("goals", newGoal, setNewGoal)}>Add</Button>
                                </div>
                            </Field>

                            <Field>
                                <FieldLabel>Notes</FieldLabel>
                                <FieldContent>
                                    <Textarea {...form.register("metadata.notes")} placeholder="Special instructions" rows={3} />
                                </FieldContent>
                            </Field>
                        </>
                    )}
                </FieldSet>
            </div>

            {/* Pagination */}
            <div className="fixed bottom-0 left-0 right-0 bg-white py-3 px-4 border-t flex justify-between items-center shadow-md">
                {step > 1 ? (
                    <Button type="button" variant="ghost" onClick={() => setStep(s => s - 1)}>
                        ← Back
                    </Button>
                ) : <div />}

                <Button
                    type="button"
                    onClick={async () => {
                        if (step === 1) {
                            const valid = await form.trigger(["name", "instructions"]);
                            if (!valid) return;
                            setStep(2);
                        } else if (step === 2) {
                            setStep(3);
                        } else if (step === 3) {
                            form.handleSubmit(onSubmit)();
                        }
                    }}
                    disabled={isPending}
                >
                    {step < 3 ? "Next →" : isEdit ? "Update Agent" : "Create Agent"}
                </Button>
            </div>

            {onCancel && (
                <div className="flex justify-end mt-4">
                    <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
                </div>
            )}
        </form>
    );
};
