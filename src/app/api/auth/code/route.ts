import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_MODE } from "@/lib/demo";
import { codeRequestSchema } from "@/lib/schemas";
import { issueCode } from "@/lib/server/otp";
import { allowCodeRequestByEmail, allowCodeRequestByIp } from "@/lib/server/ratelimit";
import { verifyTurnstile } from "@/lib/server/turnstile";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const parsed = codeRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { email, turnstileToken } = parsed.data;
  const emailKey = createHash("sha256").update(email).digest("hex");
  if (!(await allowCodeRequestByIp(ip)) || !(await allowCodeRequestByEmail(emailKey))) {
    return NextResponse.json({ error: "Too many codes requested. Try again later." }, { status: 429 });
  }
  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return NextResponse.json({ error: "Verification failed" }, { status: 403 });
  }

  // Live mode waits on the email provider decision (ADR 0003); never fall back to showing the code.
  if (!DEMO_MODE) return NextResponse.json({ error: "Email sign-in is not configured yet." }, { status: 501 });

  const code = await issueCode(email);
  // Demo Mode: no email is sent; the code goes back to the screen, labelled as a demo.
  return NextResponse.json({ sent: true, demo: true, demoCode: code });
}
