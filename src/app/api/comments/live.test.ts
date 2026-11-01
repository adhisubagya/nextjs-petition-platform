import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

// Live mode: DEMO_MODE is read at import time, so set the env before importing the route.
vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
vi.stubEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "bucket");

// Minimal Firestore fake: docs keyed by path, transactions applied immediately.
const docs = new Map<string, unknown>();
const doc = (path: string) => ({
  path,
  id: path.split("/").at(-1)!,
  collection: (name: string) => ({ doc: (id = `c${docs.size}${Math.random().toString(36).slice(2, 8)}`) => doc(`${path}/${name}/${id}`) }),
});
vi.mock("@/lib/firebase/admin", () => ({
  adminDb: () => ({
    collection: (name: string) => ({ doc: (id: string) => doc(`${name}/${id}`) }),
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        get: async (ref: { path: string }) => ({ exists: docs.has(ref.path) }),
        create: (ref: { path: string }, data: unknown) => docs.set(ref.path, data),
        set: (ref: { path: string }, data: unknown) => docs.set(ref.path, data),
        update: () => undefined,
      }),
  }),
  isFirebaseAdminConfigured: true,
  petitionId: () => "default",
}));
vi.mock("@/lib/server/turnstile", () => ({ verifyTurnstile: async () => true }));
vi.mock("@/lib/server/signer-auth", () => ({
  signerUid: async (req: Request) => req.headers.get("authorization")?.replace(/^Bearer /, "") || null,
}));

const { POST } = await import("./route");
const post = (body: Record<string, unknown>, uid?: string) =>
  POST(
    new NextRequest("http://localhost/api/comments", {
      method: "POST",
      headers: uid ? { authorization: `Bearer ${uid}` } : {},
      body: JSON.stringify({ message: "Count me in", name: "", turnstileToken: "tok", ...body }),
    }),
  );

describe("POST /api/comments in live mode", () => {
  it("requires a signed-in signer", async () => {
    expect((await post({})).status).toBe(401);
  });

  it("allows one signature per account", async () => {
    const first = await post({}, "uid-1");
    expect(first.status).toBe(201);
    expect((await first.json()).demo).toBe(false);
    expect(docs.has("petitions/default/signers/uid-1")).toBe(true);
    expect((await post({}, "uid-1")).status).toBe(409);
    expect((await post({}, "uid-2")).status).toBe(201);
  });

  it("only accepts avatars from the signer's own folder in our bucket", async () => {
    const own = "https://firebasestorage.googleapis.com/v0/b/bucket/o/avatars%2Fuid-3%2Fa.webp?alt=media";
    expect((await post({ avatarUrl: own.replace("uid-3", "uid-9") }, "uid-3")).status).toBe(400);
    expect((await post({ avatarUrl: "https://evil.example/a.png" }, "uid-3")).status).toBe(400);
    expect((await post({ avatarUrl: own }, "uid-3")).status).toBe(201);
  });
});
