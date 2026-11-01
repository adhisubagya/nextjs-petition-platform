import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? Redis.fromEnv() : null;

function limiter(tokens: number, window: Parameters<typeof Ratelimit.slidingWindow>[1], prefix: string) {
  const rl = redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(tokens, window), prefix }) : null;
  // shortcut: without Upstash credentials there is no limit; set them for any public deployment.
  return async (key: string): Promise<boolean> => (rl ? (await rl.limit(key)).success : true);
}

export const allowComment = limiter(3, "1 m", "rl:comments");
// Only edge-cache misses reach this, so the cap targets cursor-busting loops, not readers.
export const allowCommentRead = limiter(30, "1 m", "rl:comments-read");
