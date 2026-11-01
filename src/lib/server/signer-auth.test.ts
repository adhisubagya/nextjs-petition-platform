import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const createCustomToken = vi.fn(async (uid: string, claims: object) => JSON.stringify({ uid, claims }));
vi.mock("firebase-admin/auth", () => ({ getAuth: () => ({ verifyIdToken, createCustomToken }) }));
vi.mock("@/lib/firebase/admin", () => ({ adminDb: () => ({}) }));
vi.stubEnv("SIGNER_ID_SECRET", "test-secret");

const { customTokenFor, signerUid, uidFor } = await import("./signer-auth");
const req = (token?: string) => new Request("http://x", { headers: token ? { authorization: `Bearer ${token}` } : {} });

describe("signer auth", () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
  });

  it("derives a stable uid that is not the plain sha256 of the email", () => {
    const email = "signer@example.com";
    expect(uidFor(email)).toBe(uidFor(email));
    expect(uidFor(email)).toMatch(/^e_[0-9a-f]{64}$/);
    expect(uidFor(email)).not.toContain(createHash("sha256").update(email).digest("hex"));
  });

  it("mints tokens with the signer claim", async () => {
    expect(JSON.parse(await customTokenFor("a@b.co"))).toEqual({ uid: uidFor("a@b.co"), claims: { signer: true } });
  });

  it("accepts only tokens carrying the signer claim", async () => {
    verifyIdToken.mockResolvedValue({ uid: "e_1", signer: true });
    expect(await signerUid(req("t"))).toBe("e_1");
    verifyIdToken.mockResolvedValue({ uid: "password-signup-user" });
    expect(await signerUid(req("t"))).toBeNull();
  });

  it("rejects a missing or invalid token", async () => {
    expect(await signerUid(req())).toBeNull();
    verifyIdToken.mockImplementation(async () => {
      throw new Error("bad");
    });
    expect(await signerUid(req("t"))).toBeNull();
  });
});
