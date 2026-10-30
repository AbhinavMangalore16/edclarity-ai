import { NextRequest, NextResponse } from "next/server";

const OPENSEARCH_URL = process.env.OPENSEARCH_URL || "http://localhost:9200";

let lastCronRun: { timestamp: string; success: boolean; details: any } | null = null;

async function runOpenSearchOptimization() {
  console.log(`\n[Cronjob Automation] Starting OpenSearch Index & Vector Cache Optimization...`);
  
  try {
    // 1. Force Merge Segments for Faster Vector Search
    const mergeRes = await fetch(`${OPENSEARCH_URL}/_forcemerge?max_num_segments=1`, {
      method: "POST",
    });

    // 2. Clear Vector Cache for Optimal Memory Utilization
    const cacheRes = await fetch(`${OPENSEARCH_URL}/_cache/clear`, {
      method: "POST",
    });

    const result = {
      timestamp: new Date().toISOString(),
      success: true,
      forcemerge: mergeRes.ok,
      cacheCleared: cacheRes.ok,
    };

    lastCronRun = { timestamp: result.timestamp, success: true, details: result };
    console.log(`[Cronjob Automation] OpenSearch Optimization completed successfully at ${result.timestamp}`);
    return result;
  } catch (error: any) {
    console.error(`[Cronjob Automation Error] OpenSearch optimization failed:`, error.message);
    const failResult = {
      timestamp: new Date().toISOString(),
      success: false,
      details: { error: error.message },
    };
    lastCronRun = failResult;
    return failResult;
  }
}

// Scheduled Cron Trigger Endpoint
export async function GET(req: NextRequest) {
  const result = await runOpenSearchOptimization();
  return NextResponse.json({
    message: "Automated OpenSearch Cron Job Triggered",
    lastRun: lastCronRun,
    result,
  });
}

export async function POST(req: NextRequest) {
  const result = await runOpenSearchOptimization();
  return NextResponse.json({
    message: "Automated OpenSearch Cron Job Triggered",
    lastRun: lastCronRun,
    result,
  });
}
