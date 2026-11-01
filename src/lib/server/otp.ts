import "server-only";
import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { Redis } from "@upstash/redis";
import { DEMO_MODE } from "@/lib/demo";

export const CODE_TTL_SECONDS = 600;
export const MAX_ATTEMPTS = 5;

type Store = {
  set(key: string, value: string, ttl: number): Promise<void>;
  get(key: string): Promise<string | null>;
  incr(key: string, ttl: number): Promise<number>;
  del(...keys: string[]): Promise<void>;
};

function redisStore(redis: Redis): Store {
  return {
    set: async (k, v, ttl) => void (await redis.set(k, v, { ex: ttl })),
    get: (k) => redis.get<string>(k),
    incr: async (k, ttl) => {
      const n = await redis.incr(k);
      if (n === 1) await redis.expire(k, ttl);
      return n;
    },
    del: async (...k) => void (await redis.del(...k)),
  };
}

// shortcut: per-instance memory, so codes don't survive across serverless instances; local dev and tests only.
export function memoryStore(): Store {
  const m = new Map<string, { v: string; exp: number }>();
  const live = (k: string) => {
    const e = m.get(k);
    if (e && e.exp > Date.now()) return e;
    m.delete(k);
    return null;
  };
  return {
    set: async (k, v, ttl) => void m.set(k, { v, exp: Date.now() + ttl * 1000 }),
    get: async (k) => live(k)?.v ?? null,
    incr: async (k, ttl) => {
      const n = Number(live(k)?.v ?? 0) + 1;
      m.set(k, { v: String(n), exp: live(k)?.exp ?? Date.now() + ttl * 1000 });
      return n;
    },
    del: async (...k) => k.forEach((key) => m.delete(key)),
  };
}

const defaultStore =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? redisStore(Redis.fromEnv()) : memoryStore();

function secret(): string {
  const s = process.env.OTP_HMAC_SECRET;
  // Demo codes are printed on screen anyway; a live deploy must set its own secret.
  if (s) return s;
  if (DEMO_MODE) return "demo-mode-only";
  throw new Error("OTP_HMAC_SECRET is not set");
}

const keyFor = (email: string) => `otp:${createHash("sha256").update(email).digest("hex")}`;
const mac = (email: string, code: string) => createHmac("sha256", secret()).update(`${email}:${code}`).digest();

/** Issues a fresh single-use code; only its HMAC is stored. Email must already be normalised. */
export async function issueCode(email: string, store: Store = defaultStore): Promise<string> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const key = keyFor(email);
  await store.del(`${key}:n`);
  await store.set(key, mac(email, code).toString("hex"), CODE_TTL_SECONDS);
  return code;
}

export type CheckResult = "ok" | "invalid" | "expired";

export async function checkCode(email: string, code: string, store: Store = defaultStore): Promise<CheckResult> {
  const key = keyFor(email);
  const stored = await store.get(key);
  if (!stored) return "expired";
  if ((await store.incr(`${key}:n`, CODE_TTL_SECONDS)) > MAX_ATTEMPTS) {
    await store.del(key, `${key}:n`);
    return "expired";
  }
  if (!timingSafeEqual(Buffer.from(stored, "hex"), mac(email, code))) return "invalid";
  await store.del(key, `${key}:n`);
  return "ok";
}
