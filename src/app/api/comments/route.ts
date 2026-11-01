import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_MODE } from "@/lib/demo";
import { adminDb, petitionId } from "@/lib/firebase/admin";
import { getComments } from "@/lib/petition";
import { commentRequestSchema } from "@/lib/schemas";
import { allowComment, allowCommentRead } from "@/lib/server/ratelimit";
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
  const { turnstileToken, ...input } = parsed.data;

  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return NextResponse.json({ error: "Verification failed" }, { status: 403 });
  }

  const createdAt = new Date();
  const comment: Omit<Comment, "id"> = { ...input, pinned: false, createdAt: createdAt.toISOString() };

  // Demo Mode: behave exactly like a successful write, but never touch Firestore.
  if (DEMO_MODE) {
    return NextResponse.json({ comment: { id: `demo-${crypto.randomUUID()}`, ...comment }, demo: true }, { status: 201 });
  }

  const db = adminDb();
  const petition = db.collection("petitions").doc(petitionId());
  const ref = petition.collection("comments").doc();
  const batch = db.batch();
  batch.set(ref, { ...comment, createdAt: Timestamp.fromDate(createdAt) });
  batch.update(petition, { signatureCount: FieldValue.increment(1) });
  await batch.commit();
  return NextResponse.json({ comment: { id: ref.id, ...comment }, demo: false }, { status: 201 });
}
