import "server-only";
import { DEMO_MODE } from "@/lib/demo";

export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  // Demo Mode writes nothing, so an unconfigured demo deploy may skip verification; live mode never may.
  if (!secret) return DEMO_MODE;
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret, response: token, remoteip: ip }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { success: boolean };
  return data.success;
}
