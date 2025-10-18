import {z} from "zod";

export const agenticMetadataSchema = z.object({
  personality: z
    .enum(["Default", "Friendly", "Strict", "Professional", "Playful"])
    .default("Default")
    .describe("Defines how the agent interacts with users."),
  
  level: z
    .enum(["Novice", "Beginner", "Intermediate", "Advanced", "Expert"])
    .default("Beginner")
    .describe("Determines the agent’s knowledge depth and response complexity."),
  
  topics: z
    .array(z.string().min(2, "Topic name must have at least 2 characters"))
    .optional()
    .default([])
    .describe("List of topics the agent specializes in."),
  
  resources: z
    .array(
      z
        .string()
        .refine(
          (value) =>
            /^https?:\/\//.test(value) || value.length > 3,
          "Resource must be a valid URL or a descriptive title"
        )
    )
    .optional()
    .default([])
    .describe("Links or reference names the agent uses for context."),
  
  notes: z
    .string()
    .max(500, "Notes cannot exceed 500 characters")
    .optional()
    .default("")
    .describe("Custom notes or special behavior instructions for the agent."),
  
  goals: z
    .array(z.string().min(3, "Goal must be at least 3 characters long"))
    .optional()
    .default([])
    .describe("Specific objectives or intended behaviors for this agent."),
});

export const agenticSchema = z.object({
    name: z.string().nonempty({ message: "Name is required" }).min(1, "Agentic name is required"),
    instructions: z.string().nonempty({ message: "Instructions are required" }).min(1, "Instructions are required"),
    metadata: agenticMetadataSchema,
})