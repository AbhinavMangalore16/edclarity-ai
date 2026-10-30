import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index";
import * as schema from '../db/schema';
export const auth = betterAuth({
    user: {
        additionalFields: {
            role: {
                type: "string",
                required: false,
                defaultValue: "student",
            },
            isPro: {
                type: "boolean",
                required: false,
                defaultValue: false,
            },
            aiCredits: {
                type: "number",
                required: false,
                defaultValue: 50,
            },
        },
    },
    socialProviders: {
        github: { 
            clientId: process.env.GITHUB_CLIENT_ID as string, 
            clientSecret: process.env.GITHUB_CLIENT_SECRET as string, 
        }, 
        google: { 
            clientId: process.env.GOOGLE_CLIENT_ID as string, 
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string, 
        },
    },
    emailAndPassword: {
        enabled: true,
    },
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: schema
    }),
});