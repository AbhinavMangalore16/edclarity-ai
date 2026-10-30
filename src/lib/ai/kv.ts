import "server-only";
import { Redis } from "@upstash/redis";
import { aiEnv, hasRedis } from "./env";

/**
 * Minimal KV interface backed by Upstash Redis, with an in-process fallback
 * for local development. The fallback is per-instance (not shared across
 * serverless invocations) — fine for dev, use Upstash in production.
 */
export interface KV {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSec?: number): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string, ttlSec?: number): Promise<number>;
  /** Sorted-set style list helpers used by the semantic cache index. */
  lpush(key: string, value: string, maxLen?: number): Promise<void>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
}

class MemoryKV implements KV {
  private store = new Map<string, { v: unknown; exp?: number }>();
  private alive(key: string) {
    const e = this.store.get(key);
    if (!e) return undefined;
    if (e.exp && e.exp < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return e;
  }
  async get<T>(key: string) {
    return (this.alive(key)?.v as T) ?? null;
  }
  async set<T>(key: string, value: T, ttlSec?: number) {
    this.store.set(key, { v: value, exp: ttlSec ? Date.now() + ttlSec * 1000 : undefined });
  }
  async del(key: string) {
    this.store.delete(key);
  }
  async incr(key: string, ttlSec?: number) {
    const e = this.alive(key);
    const n = ((e?.v as number) ?? 0) + 1;
    this.store.set(key, { v: n, exp: e?.exp ?? (ttlSec ? Date.now() + ttlSec * 1000 : undefined) });
    return n;
  }
  async lpush(key: string, value: string, maxLen = 1000) {
    const list = ((this.alive(key)?.v as string[]) ?? []).slice();
    list.unshift(value);
    this.store.set(key, { v: list.slice(0, maxLen) });
  }
  async lrange(key: string, start: number, stop: number) {
    const list = (this.alive(key)?.v as string[]) ?? [];
    return list.slice(start, stop === -1 ? undefined : stop + 1);
  }
}

class UpstashKV implements KV {
  constructor(private r: Redis) {}
  async get<T>(key: string) {
    return (await this.r.get<T>(key)) ?? null;
  }
  async set<T>(key: string, value: T, ttlSec?: number) {
    if (ttlSec) await this.r.set(key, value, { ex: ttlSec });
    else await this.r.set(key, value);
  }
  async del(key: string) {
    await this.r.del(key);
  }
  async incr(key: string, ttlSec?: number) {
    const n = await this.r.incr(key);
    if (n === 1 && ttlSec) await this.r.expire(key, ttlSec);
    return n;
  }
  async lpush(key: string, value: string, maxLen = 1000) {
    const p = this.r.pipeline();
    p.lpush(key, value);
    p.ltrim(key, 0, maxLen - 1);
    await p.exec();
  }
  async lrange(key: string, start: number, stop: number) {
    return this.r.lrange<string>(key, start, stop);
  }
}

export const redis: Redis | null = hasRedis
  ? new Redis({ url: aiEnv.UPSTASH_REDIS_REST_URL!, token: aiEnv.UPSTASH_REDIS_REST_TOKEN! })
  : null;

const g = globalThis as unknown as { __edkv?: KV };
export const kv: KV = redis ? new UpstashKV(redis) : (g.__edkv ??= new MemoryKV());
