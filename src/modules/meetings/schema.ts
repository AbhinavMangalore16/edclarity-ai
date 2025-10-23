import {z} from "zod";

export const meetingSchema = z.object({
    name: z.string().min(1, "Meeting name is required"),
    agentId: z.string().min(1, "Agent ID is required"),
})

export const meetingUpdationSchema = meetingSchema.extend({
    id: z.string().min(1, "Meeting ID is required"),
})