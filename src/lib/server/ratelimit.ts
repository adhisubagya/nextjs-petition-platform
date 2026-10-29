import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const configured = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

const limiter = configured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(3, "1 m"), prefix: "rl:comments" })
  : null;

// shortcut: without Upstash credentials there is no limit; set them for any public deployment.
export async function allowComment(ip: string): Promise<boolean> {
  return limiter ? (await limiter.limit(ip)).success : true;
}
