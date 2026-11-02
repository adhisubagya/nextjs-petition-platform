import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
vi.mock("firebase-admin/auth", () => ({ getAuth: () => ({ verifyIdToken }) }));
vi.mock("@/lib/firebase/admin", () => ({ isFirebaseAdminConfigured: true, adminDb: () => ({}) }));
vi.stubEnv("ADMIN_EMAILS", "admin@demo.com, owner@example.com");

const { isAdmin, isDeveloper } = await import("./admin-auth");
const req = (token?: string) => new Request("http://x", { headers: token ? { authorization: `Bearer ${token}` } : {} });

describe("isAdmin", () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
  });

  it("accepts a verified token for a listed email", async () => {
    verifyIdToken.mockResolvedValue({ email: "Owner@Example.com" });
    expect(await isAdmin(req("t"))).toBe(true);
  });
  it("rejects a verified token for an unlisted email (open sign-up)", async () => {
    verifyIdToken.mockResolvedValue({ email: "stranger@example.com" });
    expect(await isAdmin(req("t"))).toBe(false);
  });
  it("rejects a missing or invalid token", async () => {
    expect(await isAdmin(req())).toBe(false);
    verifyIdToken.mockImplementation(async () => {
      throw new Error("bad");
    });
    expect(await isAdmin(req("t"))).toBe(false);
  });
  it("treats the developer claim as admin, even for an unlisted email", async () => {
    verifyIdToken.mockResolvedValue({ email: "dev@example.com", developer: true });
    expect(await isAdmin(req("t"))).toBe(true);
    expect(await isDeveloper(req("t"))).toBe(true);
  });
  it("needs the claim to be exactly true for developer access", async () => {
    verifyIdToken.mockResolvedValue({ email: "owner@example.com", developer: "true" });
    expect(await isAdmin(req("t"))).toBe(true);
    expect(await isDeveloper(req("t"))).toBe(false);
  });
});
