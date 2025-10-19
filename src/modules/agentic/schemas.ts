import {z} from "zod";

export const agenticMetadataSchema = z.object({
  personality: z
    .enum(["Default", "Friendly", "Strict", "Professional", "Playful"])
    .optional()
    .default("Default"),

  level: z
    .enum(["Novice", "Beginner", "Intermediate", "Advanced", "Expert"])
    .optional()
    .default("Beginner"),

  topics: z
    .array(z.string().min(2, "Topic name must have at least 2 characters"))
    .optional()
    .default([]),

  resources: z
    .array(
      z
        .string()
        .refine(
          (value) => /^https?:\/\//.test(value) || value.length > 10,
          "Resource must be a valid URL or descriptive title"
        )
    )
    .optional()
    .default([]),

  notes: z
    .string()
    .max(500, "Notes cannot exceed 500 characters")
    .optional()
    .default(""),

  goals: z
    .array(z.string().min(3, "Goal must be at least 3 characters long"))
    .optional()
    .default([]),
});



const baseAgenticSchema = z.object({
  name: z.string().min(1, "Agent name is required"),
  instructions: z.string().min(1, "Instructions are required"),
  metadata: agenticMetadataSchema,
});

export const agenticSchema = baseAgenticSchema
  .strict()
  .transform((data) => ({
    ...data,
    metadata: {
      personality: data.metadata.personality ?? "Default",
      level: data.metadata.level ?? "Beginner",
      topics: data.metadata.topics ?? [],
      resources: data.metadata.resources ?? [],
      notes: data.metadata.notes ?? "",
      goals: data.metadata.goals ?? [],
    },
  }));

export const agenticUpdationSchema = baseAgenticSchema
  .extend({
    id: z.string().min(1, { message: "ID is required!" }),
  })
  .strict()
  .transform((data) => ({
    ...data,
    metadata: {
      personality: data.metadata.personality ?? "Default",
      level: data.metadata.level ?? "Beginner",
      topics: data.metadata.topics ?? [],
      resources: data.metadata.resources ?? [],
      notes: data.metadata.notes ?? "",
      goals: data.metadata.goals ?? [],
    },
  }));