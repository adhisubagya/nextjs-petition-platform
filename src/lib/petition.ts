import "server-only";
import type { DocumentSnapshot } from "firebase-admin/firestore";
import { seedComments, seedPetition } from "@/data/seed";
import { adminDb, isFirebaseAdminConfigured, petitionId } from "@/lib/firebase/admin";
import type { Comment, Petition } from "@/lib/types";

export const PAGE_SIZE = 10;

export type CommentPage = { comments: Comment[]; nextCursor: string | null };

// Without Firebase credentials (local dev, CI, forks) the app serves the seed data.
const fallbackComments: Comment[] = seedComments().map((c, i) => ({ ...c, id: `seed-${i}` }));

function toComment(doc: DocumentSnapshot): Comment {
  const d = doc.data()!;
  return {
    id: doc.id,
    name: d.name,
    message: d.message,
    avatarUrl: d.avatarUrl ?? null,
    pinned: Boolean(d.pinned),
    createdAt: d.createdAt.toDate().toISOString(),
  };
}

export async function getPetition(): Promise<Petition> {
  if (!isFirebaseAdminConfigured) return { id: petitionId(), ...seedPetition };
  const doc = await adminDb().collection("petitions").doc(petitionId()).get();
  return { id: doc.id, ...seedPetition, ...doc.data() } as Petition;
}

export async function getComments(cursor: string | null = null): Promise<CommentPage> {
  if (!isFirebaseAdminConfigured) {
    const start = cursor ? fallbackComments.findIndex((c) => c.id === cursor) + 1 : 0;
    const comments = fallbackComments.slice(start, start + PAGE_SIZE);
    const more = start + PAGE_SIZE < fallbackComments.length;
    return { comments, nextCursor: more ? comments.at(-1)!.id : null };
  }

  const col = adminDb().collection("petitions").doc(petitionId()).collection("comments");
  let query = col.orderBy("pinned", "desc").orderBy("createdAt", "desc").limit(PAGE_SIZE + 1);
  if (cursor) {
    const last = await col.doc(cursor).get();
    if (last.exists) query = query.startAfter(last);
  }
  const docs = (await query.get()).docs;
  const comments = docs.slice(0, PAGE_SIZE).map(toComment);
  return { comments, nextCursor: docs.length > PAGE_SIZE ? comments.at(-1)!.id : null };
}
