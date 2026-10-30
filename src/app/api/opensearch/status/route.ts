import { NextRequest, NextResponse } from "next/server";

const OPENSEARCH_URL = process.env.OPENSEARCH_URL || "http://localhost:9200";

export async function GET(req: NextRequest) {
  try {
    const healthRes = await fetch(`${OPENSEARCH_URL}/_cluster/health`, {
      cache: "no-store",
    });

    if (!healthRes.ok) {
      return NextResponse.json({
        status: "offline",
        message: "OpenSearch is starting or offline on port 9200",
      });
    }

    const health = await healthRes.json();

    const indicesRes = await fetch(`${OPENSEARCH_URL}/_cat/indices?format=json`, {
      cache: "no-store",
    });
    const indices = indicesRes.ok ? await indicesRes.json() : [];

    return NextResponse.json({
      status: "online",
      clusterName: health.cluster_name,
      healthStatus: health.status,
      numberOfNodes: health.number_of_nodes,
      activeShards: health.active_shards,
      indices,
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "offline",
      error: error.message,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const optimizeRes = await fetch(`${OPENSEARCH_URL}/_forcemerge?max_num_segments=1`, {
      method: "POST",
    });

    const cacheRes = await fetch(`${OPENSEARCH_URL}/_cache/clear`, {
      method: "POST",
    });

    return NextResponse.json({
      success: true,
      message: "OpenSearch indices optimized and semantic cache purged successfully!",
      forcemerge: optimizeRes.ok,
      cacheCleared: cacheRes.ok,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
