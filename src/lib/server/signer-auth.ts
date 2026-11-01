import "server-only";
import { createHmac } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebase/admin";

// Keyed, so a public avatar path (avatars/{uid}/…) can't be matched to a guessed email. Never rotate after launch:
// a new secret gives every signer a new uid, so they could sign again.
export function uidFor(email: string): string {
  const secret = process.env.SIGNER_ID_SECRET;
  if (!secret) throw new Error("SIGNER_ID_SECRET is not set");
  return `e_${createHmac("sha256", secret).update(email).digest("hex")}`;
}

const auth = () => {
  adminDb(); // ensures the Admin app is initialised
  return getAuth();
};

/** Live mode: minted after a correct email code; the browser exchanges it with signInWithCustomToken. */
export const customTokenFor = (email: string) => auth().createCustomToken(uidFor(email), { signer: true });

/** The signer's uid from `Authorization: Bearer <idToken>`, or null. Only tokens minted by customTokenFor count. */
export async function signerUid(req: Request): Promise<string | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return null;
  try {
    const decoded = await auth().verifyIdToken(token);
    // Accounts from Firebase sign-up (email/password, anonymous) have no claim, so they can't skip the email code.
    return decoded.signer === true ? decoded.uid : null;
  } catch {
    return null;
  }
}
