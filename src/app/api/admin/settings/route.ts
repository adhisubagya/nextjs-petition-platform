import { NextResponse } from "next/server";
import { caller } from "@/lib/server/admin-auth";
import { getSettings, saveSettings } from "@/lib/server/settings";
import { settingsSchema } from "@/lib/settings";

/** Current settings for any admin (the UI hides what is off), plus whether the caller is a developer. */
export async function GET(req: Request) {
  const who = await caller(req);
  if (!who.admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ settings: await getSettings(), developer: who.developer }, { headers: { "Cache-Control": "no-store" } });
}

// Allowed in Demo Mode: only a developer (custom claim, Admin SDK only) can write this one config doc.
export async function PUT(req: Request) {
  if (!(await caller(req)).developer) return NextResponse.json({ error: "Master account only." }, { status: 403 });
  const parsed = settingsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
  await saveSettings(parsed.data);
  return NextResponse.json({ settings: parsed.data });
}
