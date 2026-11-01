import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_MODE } from "@/lib/demo";
import { adminDb, petitionId } from "@/lib/firebase/admin";
import { getComments } from "@/lib/petition";
import { commentRequestSchema } from "@/lib/schemas";
import { allowComment, allowCommentRead } from "@/lib/server/ratelimit";
import { signerUid } from "@/lib/server/signer-auth";
import { verifyTurnstile } from "@/lib/server/turnstile";
import type { Comment } from "@/lib/types";

// Firestore auto-IDs, or the in-memory seed IDs used without Firebase credentials.
const CURSOR = /^(?:[A-Za-z0-9]{20}|seed-\d{1,3})$/;

const clientIp = (req: NextRequest) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

export async function GET(req: NextRequest) {
  const cursor = req.nextUrl.searchParams.get("cursor");
  if (cursor !== null && !CURSOR.test(cursor)) {
    return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
  }
  if (!(await allowCommentRead(clientIp(req)))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const page = await getComments(cursor);
  // Cached at the edge for 24h so pagination costs no Firestore reads for most visitors.
  return NextResponse.json(page, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" },
  });
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!(await allowComment(ip))) {
    return NextResponse.json({ error: "Too many comments. Try again in a minute." }, { status: 429 });
  }

  const parsed = commentRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { turnstileToken, website, ...input } = parsed.data;

  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return NextResponse.json({ error: "Verification failed" }, { status: 403 });
  }

  const createdAt = new Date();
  const comment: Omit<Comment, "id"> = { ...input, pinned: false, createdAt: createdAt.toISOString() };

  // Honeypot filled: answer like a success so the bot learns nothing, and write nothing.
  if (website) {
    return NextResponse.json({ comment: { id: `demo-${crypto.randomUUID()}`, ...comment }, demo: true }, { status: 201 });
  }

  // Demo Mode: behave exactly like a successful write, but never touch Firestore.
  if (DEMO_MODE) {
    return NextResponse.json({ comment: { id: `demo-${crypto.randomUUID()}`, ...comment }, demo: true }, { status: 201 });
  }

  // Live mode: one signature per signed-in email. The uid comes from a verified Firebase ID token.
  const uid = await signerUid(req);
  if (!uid) return NextResponse.json({ error: "Sign in with your email first." }, { status: 401 });
  // Avatars must be the signer's own upload in our bucket (storage.rules: avatars/{uid}/...).
  const avatarPrefix = `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/avatars%2F${uid}%2F`;
  if (comment.avatarUrl && !comment.avatarUrl.startsWith(avatarPrefix)) {
    return NextResponse.json({ error: "Invalid avatar" }, { status: 400 });
  }

  const db = adminDb();
  const petition = db.collection("petitions").doc(petitionId());
  const ref = petition.collection("comments").doc();
  // Private, rules-denied doc keyed by uid: created in the same transaction, so a second signature can't slip in.
  const signer = petition.collection("signers").doc(uid);
  const signed = await db.runTransaction(async (tx) => {
    if ((await tx.get(signer)).exists) return false;
    tx.create(signer, { commentId: ref.id, createdAt: Timestamp.fromDate(createdAt) });
    tx.set(ref, { ...comment, createdAt: Timestamp.fromDate(createdAt) });
    tx.update(petition, { signatureCount: FieldValue.increment(1) });
    return true;
  });
  if (!signed) return NextResponse.json({ error: "You have already signed this petition." }, { status: 409 });
  return NextResponse.json({ comment: { id: ref.id, ...comment }, demo: false }, { status: 201 });
}
