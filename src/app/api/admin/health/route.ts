import { NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo";
import { isAdmin } from "@/lib/server/admin-auth";
import { readHealth, SAMPLE_HEALTH } from "@/lib/server/health";

/** Abuse counters and today's email quota per provider. Sample numbers in Demo Mode or without Upstash. */
export async function GET(req: Request) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const live = !DEMO_MODE && Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  const health = live ? await readHealth() : SAMPLE_HEALTH;
  return NextResponse.json({ ...health, sample: !live }, { headers: { "Cache-Control": "private, max-age=60" } });
}
