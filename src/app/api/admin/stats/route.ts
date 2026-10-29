import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/server/admin-auth";
import { getStats } from "@/lib/server/posthog";

export async function GET(req: Request) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getStats(), { headers: { "Cache-Control": "private, no-store" } });
}
