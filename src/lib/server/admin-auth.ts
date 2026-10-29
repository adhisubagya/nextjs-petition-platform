import "server-only";
import { getAuth } from "firebase-admin/auth";
import { DEMO_MODE } from "@/lib/demo";
import { adminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";

const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

// Email/password sign-up is open by default in Firebase, so a valid token alone is not enough: the email must be listed.
export async function isAdmin(req: Request): Promise<boolean> {
  if (!isFirebaseAdminConfigured) return DEMO_MODE; // unconfigured demo deploy: sample data only, writes are refused anyway
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return false;
  try {
    adminDb(); // ensures the Admin app is initialised
    const { email } = await getAuth().verifyIdToken(token);
    return Boolean(email && adminEmails.includes(email.toLowerCase()));
  } catch {
    return false;
  }
}
