import "server-only";
import { createHash } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebase/admin";

// Stable per-email uid, so the same inbox always maps to the same signer and the email itself is not the key.
export const uidFor = (email: string) => `e_${createHash("sha256").update(email).digest("hex")}`;

const auth = () => {
  adminDb(); // ensures the Admin app is initialised
  return getAuth();
};

/** Live mode: minted after a correct email code; the browser exchanges it with signInWithCustomToken. */
export const customTokenFor = (email: string) => auth().createCustomToken(uidFor(email));

/** The signer's uid from `Authorization: Bearer <idToken>`, or null. */
export async function signerUid(req: Request): Promise<string | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return null;
  try {
    return (await auth().verifyIdToken(token)).uid;
  } catch {
    return null;
  }
}
