import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: () => {
    throw new Error("Demo Mode must not touch Firestore");
  },
  isFirebaseAdminConfigured: false,
  petitionId: () => "default",
}));

const { POST } = await import("./route");

const post = (body: unknown) =>
  POST(new NextRequest("http://localhost/api/comments", { method: "POST", body: JSON.stringify(body) }));

describe("POST /api/comments in Demo Mode", () => {
  it("returns the new comment without writing", async () => {
    const res = await post({ name: " Signer ", message: "Count me in", turnstileToken: "tok" });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.demo).toBe(true);
    expect(body.comment).toMatchObject({ name: "Signer", message: "Count me in", pinned: false });
  });

  it("rejects a blank comment", async () => {
    const res = await post({ name: "Signer", message: "  ", turnstileToken: "tok" });
    expect(res.status).toBe(400);
    expect((await res.json()).issues.message).toBeDefined();
  });

  it("rejects malformed JSON", async () => {
    const res = await POST(new NextRequest("http://localhost/api/comments", { method: "POST", body: "{" }));
    expect(res.status).toBe(400);
  });
});
