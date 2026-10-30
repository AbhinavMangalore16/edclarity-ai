import "server-only";
import { z } from "zod";

/**
 * Centralised, validated AI environment config. No secrets are hardcoded.
 * Optional providers/integrations degrade gracefully when unset.
 */
const schema = z.object({
  GROQ_API_KEY: z.string().optional(),
  AICREDITS_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  LANGFUSE_PUBLIC_KEY: z.string().optional(),
  LANGFUSE_SECRET_KEY: z.string().optional(),
  LANGFUSE_HOST: z.string().url().optional(),
  LIBRA_RAG_URL: z.string().url().default("http://localhost:8000"),
  INTERNAL_API_SECRET: z.string().optional(),
  AI_SEMANTIC_CACHE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.95),
  AI_SEMANTIC_CACHE_TTL_SEC: z.coerce.number().default(60 * 60 * 24),
});

export const aiEnv = schema.parse(process.env);

export const hasRedis = Boolean(aiEnv.UPSTASH_REDIS_REST_URL && aiEnv.UPSTASH_REDIS_REST_TOKEN);
export const hasLangfuse = Boolean(aiEnv.LANGFUSE_PUBLIC_KEY && aiEnv.LANGFUSE_SECRET_KEY);
