import "server-only";
import { createHash } from "crypto";
import { GoogleGenAI } from "@google/genai";
import { aiEnv } from "./env";
import { kv } from "./kv";

/**
 * Two-level LLM response cache.
 *  L1: exact match on a normalised-prompt hash (O(1)).
 *  L2: semantic match — cosine similarity over embeddings of recent prompts in the
 *      same namespace (bounded list, linear scan; fine up to ~1-2k entries per ns).
 *
 * Namespaces MUST include anything that changes the correct answer:
 * feature, system prompt hash, and user scope for private (RAG over user docs) data.
 */

const DIM = 256;
const MAX_ENTRIES_PER_NS = 1000;
const EMBED_VERSION = aiEnv.GEMINI_API_KEY ? "gem-256-v1" : "hash-256-v1";

interface Entry {
  id: string;
  v: number[];
  docIds?: string[];
}
interface Cached {
  response: string;
  model: string;
  createdAt: number;
  docIds?: string[];
}

const gemini = aiEnv.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: aiEnv.GEMINI_API_KEY }) : null;

const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 32);
export const normalisePrompt = (s: string) => s.toLowerCase().replace(/\s+/g, " ").replace(/[^\p{L}\p{N} ]/gu, "").trim();

/** Deterministic hashed char-trigram + word embedding — offline fallback when no embedding API. */
function hashEmbed(text: string): number[] {
  const v = new Array(DIM).fill(0);
  const t = ` ${normalisePrompt(text)} `;
  const add = (tok: string, w: number) => {
    const h = createHash("md5").update(tok).digest();
    const idx = h.readUInt16LE(0) % DIM;
    v[idx] += h[2] & 1 ? w : -w;
  };
  for (let i = 0; i < t.length - 2; i++) add(t.slice(i, i + 3), 1);
  for (const w of t.split(" ").filter(Boolean)) add(`w:${w}`, 2);
  return l2(v);
}

function l2(v: number[]) {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
}
const cosine = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * (b[i] ?? 0), 0);

export async function embed(text: string): Promise<number[]> {
  if (gemini) {
    try {
      const r = await gemini.models.embedContent({
        model: "gemini-embedding-001",
        contents: text.slice(0, 8000),
        config: { outputDimensionality: DIM, taskType: "SEMANTIC_SIMILARITY" },
      });
      const values = r.embeddings?.[0]?.values;
      if (values?.length) return l2(values);
    } catch {
      /* fall through to local embedding */
    }
  }
  return hashEmbed(text);
}

export interface CacheScope {
  feature: string;
  /** Hash of system prompt / persona / agent instructions. */
  contextKey?: string;
  /** Set for user-private answers (RAG over personal docs, memory). Undefined = shared. */
  userId?: string;
}

const nsKey = (s: CacheScope) => `sc:${EMBED_VERSION}:${s.feature}:${s.contextKey ?? "-"}:${s.userId ?? "shared"}`;

export interface CacheHit {
  kind: "exact" | "semantic";
  similarity: number;
  response: string;
  model: string;
}

export async function cacheLookup(
  scope: CacheScope,
  prompt: string,
  threshold = aiEnv.AI_SEMANTIC_CACHE_THRESHOLD
): Promise<{ hit: CacheHit | null; vector?: number[] }> {
  const ns = nsKey(scope);
  try {
    const exactId = sha(normalisePrompt(prompt));
    const exact = await kv.get<Cached>(`${ns}:r:${exactId}`);
    if (exact) return { hit: { kind: "exact", similarity: 1, response: exact.response, model: exact.model } };

    const vector = await embed(prompt);
    const raw = await kv.lrange(`${ns}:idx`, 0, MAX_ENTRIES_PER_NS - 1);
    let best: { id: string; sim: number } | null = null;
    for (const r of raw) {
      const e: Entry = typeof r === "string" ? JSON.parse(r) : (r as unknown as Entry);
      const sim = cosine(vector, e.v);
      if (!best || sim > best.sim) best = { id: e.id, sim };
    }
    if (best && best.sim >= threshold) {
      const c = await kv.get<Cached>(`${ns}:r:${best.id}`);
      if (c) return { hit: { kind: "semantic", similarity: best.sim, response: c.response, model: c.model }, vector };
    }
    return { hit: null, vector };
  } catch {
    return { hit: null }; // cache must never break the request path
  }
}

export async function cacheStore(
  scope: CacheScope,
  prompt: string,
  response: string,
  model: string,
  opts: { vector?: number[]; docIds?: string[]; ttlSec?: number } = {}
) {
  if (!response || response.length < 2) return;
  const ns = nsKey(scope);
  const id = sha(normalisePrompt(prompt));
  const ttl = opts.ttlSec ?? aiEnv.AI_SEMANTIC_CACHE_TTL_SEC;
  try {
    const v = opts.vector ?? (await embed(prompt));
    await kv.set<Cached>(`${ns}:r:${id}`, { response, model, createdAt: Date.now(), docIds: opts.docIds }, ttl);
    await kv.lpush(`${ns}:idx`, JSON.stringify({ id, v: v.map((x) => +x.toFixed(5)), docIds: opts.docIds } satisfies Entry), MAX_ENTRIES_PER_NS);
    // Reverse index for CDC invalidation: doc -> cache namespaces/ids that cited it.
    for (const d of opts.docIds ?? []) await kv.lpush(`sc:doc:${d}`, `${ns}:r:${id}`, 200);
  } catch {
    /* best-effort */
  }
}

/** Called by the CDC worker when a source document changes or is deleted. */
export async function invalidateByDoc(docId: string) {
  const keys = await kv.lrange(`sc:doc:${docId}`, 0, -1);
  await Promise.all(keys.map((k) => kv.del(k)));
  await kv.del(`sc:doc:${docId}`);
  return keys.length;
}

export const hashContext = (s: string) => sha(s);
