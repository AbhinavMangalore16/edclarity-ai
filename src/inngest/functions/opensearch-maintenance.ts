import { inngest } from "../client";

const OPENSEARCH_URL = process.env.OPENSEARCH_URL || "http://localhost:9200";

export const opensearchMaintenance = inngest.createFunction(
  { id: "opensearch-maintenance", triggers: [{ cron: "0 3 * * *" }] },
  async ({ step }: any) => {
    // 1. Check OpenSearch Cluster Health
    const health = await step.run("check-opensearch-health", async () => {
      try {
        const res = await fetch(`${OPENSEARCH_URL}/_cluster/health`);
        if (!res.ok) return { status: "offline", error: res.statusText };
        return await res.json();
      } catch (err: any) {
        return { status: "offline", error: err.message };
      }
    });

    // 2. Force Merge / Optimize Indices
    const optimizeResult = await step.run("forcemerge-indices", async () => {
      if (health.status === "offline") return { skipped: true };
      try {
        const res = await fetch(`${OPENSEARCH_URL}/_forcemerge?max_num_segments=1`, {
          method: "POST",
        });
        return await res.json();
      } catch (err: any) {
        return { error: err.message };
      }
    });

    // 3. Clear Stale OpenSearch Caches
    const clearCacheResult = await step.run("clear-search-cache", async () => {
      if (health.status === "offline") return { skipped: true };
      try {
        const res = await fetch(`${OPENSEARCH_URL}/_cache/clear`, {
          method: "POST",
        });
        return await res.json();
      } catch (err: any) {
        return { error: err.message };
      }
    });

    return {
      success: true,
      timestamp: new Date().toISOString(),
      clusterHealth: health,
      optimization: optimizeResult,
      cacheClear: clearCacheResult,
    };
  }
);
