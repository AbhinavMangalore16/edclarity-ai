import { Inngest } from "inngest";

// Ensure Vercel deployments ALWAYS run in signed production mode even if INNGEST_DEV=1 was copied from local .env
const isVercelProd = Boolean(process.env.VERCEL || process.env.NODE_ENV === "production");
if (isVercelProd && process.env.INNGEST_DEV) {
  delete process.env.INNGEST_DEV;
}

export const inngest = new Inngest({
  id: "edclarity-ai",
  isDev: !isVercelProd && process.env.INNGEST_DEV === "1",
});
