import "server-only";
import { getAuth } from "firebase-admin/auth";
import { NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo";
import { adminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { blocked, type Capability } from "@/lib/settings";
import { getSettings } from "./settings";

const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export type Caller = { admin: boolean; developer: boolean };
const NOBODY: Caller = { admin: false, developer: false };

/**
 * Who sent the request. Email/password sign-up is open by default in Firebase, so a valid token alone is not enough:
 * the email must be listed, or the account must carry the `developer` custom claim (settable only with the Admin SDK,
 * see scripts/developer.ts). A developer is always an admin.
 */
export async function caller(req: Request): Promise<Caller> {
  if (!isFirebaseAdminConfigured) return { admin: DEMO_MODE, developer: false }; // unconfigured demo deploy: sample data only, writes are refused anyway
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return NOBODY;
  try {
    adminDb(); // ensures the Admin app is initialised
    const { email, developer } = await getAuth().verifyIdToken(token);
    const dev = developer === true;
    return { admin: dev || Boolean(email && adminEmails.includes(email.toLowerCase())), developer: dev };
  } catch {
    return NOBODY;
  }
}

export const isAdmin = async (req: Request) => (await caller(req)).admin;
export const isDeveloper = async (req: Request) => (await caller(req)).developer;

/** Admin route gate: 401 for non-admins, 403 when the capability is switched off or not in this mode, else null. */
export async function guard(req: Request, cap: Capability): Promise<NextResponse | null> {
  const who = await caller(req);
  if (!who.admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const why = blocked(await getSettings(), cap, who.developer);
  return why ? NextResponse.json({ error: why }, { status: 403 }) : null;
}
