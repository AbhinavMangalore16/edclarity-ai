"use client";

import { agenticSchema } from "@/modules/agentic/schemas";
import { AgenticGetOne } from "@/modules/agentic/types";
import { useTRPC } from "@/trpc/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect } from "react";
// import { createAvatar } from "@dicebear/core";
// import { adventurer, croodlesNeutral, glass, identicon, rings } from "@dicebear/collection";

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
import Image from "next/image";
import { Progress } from "../ui/progress";


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
    const [avatar, setAvatar] = useState<string | null>(null);

    const isEdit = !!initValues?.id;

    const form = useForm({
        resolver: zodResolver(agenticSchema),
        defaultValues: {
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
    useEffect(() => {
        if (!nameValue) return;

        // dynamically import DiceBear to avoid SSR
        import("@dicebear/core").then(({ createAvatar }) => {
            import("@dicebear/collection").then(({ adventurer }) => {
                const svg = createAvatar(adventurer, { seed: nameValue, size: 16 }).toDataUri();
                setAvatar(svg);
            });
        });
    }, [nameValue]);
    // Mutations
    const createAgent = useMutation(trpc.agents.create.mutationOptions({
        onSuccess: async () => {
            await queryClient.invalidateQueries(trpc.agents.getMany.queryOptions());
            if (initValues?.id) {
                await queryClient.invalidateQueries(trpc.agents.getMany.queryOptions());
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
            <Progress value={step/3*100}/>
            <div className="flex flex-col h-[50vh] overflow-y-auto space-y-4 scroll-pb-32">
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
                                <FieldContent className="flex flex-col justify-center items-center w-full gap-2">
                                    {avatar ? (
                                        <img
                                            src={avatar}
                                            alt="Avatar"
                                            className="w-36 h-36 rounded-full border-2 border-gray-200"
                                        />
                                    ) : (
                                        <div className="w-36 h-36 rounded-full border-2 border-gray-200 bg-gray-100" />
                                    )}

                                    <span className="text-[10px] text-gray-400 text-center mt-2 max-w-xs">
                                        Artistic style lovingly inspired by{" "}
                                        <a
                                            href="https://www.instagram.com/lischi_art/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="underline hover:opacity-80 bg-gradient-to-r from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-transparent bg-clip-text"
                                        >
                                            @lischi_art
                                        </a>
                                        , licensed under {" "}
                                        <a
                                            href="https://creativecommons.org/licenses/by/4.0/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="underline hover:text-gray-600"
                                        >
                                            CC&nbsp;BY&nbsp;4.0
                                        </a>
                                        <br />
                                        Thank you for the beautiful work!
                                    </span>
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
                                        onValueChange={(v: "Default" | "Friendly" | "Strict" | "Professional" | "Playful") =>
                                            form.setValue("metadata.personality", v)
                                        }
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
                                        onValueChange={(v: "Novice" | "Beginner" | "Intermediate" | "Advanced" | "Expert") =>
                                            form.setValue("metadata.level", v)
                                        }
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
                <div className="flex justify-between mt-4">
                    {step > 1 ? (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setStep((s) => s - 1)}
                        >
                            ← Back
                        </Button>
                    ) : (
                        <div />
                    )}

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
            </div>
        </form>
    );
};
