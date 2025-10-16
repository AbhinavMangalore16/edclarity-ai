import {z} from "zod";

export const agenticMetadataSchema = z.object({
    personality: z.enum(["Default", "Friendly", "Strict"]).default("Default"),
    level: z.enum(["Novice", "Beginner", "Intermediate", "Advanced", "Ace"]).default("Beginner"),
    topics: z.array(z.string()).min(1, "Select at least one topic"),
    resources: z.array(z.string().url()).optional(),
    notes: z.string().max(500).optional(),
})

export const agenticSchema = z.object({
    name: z.string().min(1, "Agentic name is required"),
    instructions: z.string().min(1, "Instructions are required"),
    metadata: agenticMetadataSchema,
})