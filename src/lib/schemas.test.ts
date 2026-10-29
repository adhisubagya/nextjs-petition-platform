import { describe, expect, it } from "vitest";
import { commentRequestSchema, NAME_MAX } from "./schemas";

const valid = { name: "Signer", message: "I support this.", turnstileToken: "tok" };

describe("commentRequestSchema", () => {
  it("accepts a valid comment and defaults avatarUrl", () => {
    expect(commentRequestSchema.parse(valid)).toEqual({ ...valid, avatarUrl: null });
  });
  it("trims and rejects a blank comment", () => {
    expect(commentRequestSchema.safeParse({ ...valid, message: "   " }).success).toBe(false);
  });
  it("rejects an overlong name", () => {
    expect(commentRequestSchema.safeParse({ ...valid, name: "x".repeat(NAME_MAX + 1) }).success).toBe(false);
  });
  it("requires a Turnstile token", () => {
    expect(commentRequestSchema.safeParse({ ...valid, turnstileToken: "" }).success).toBe(false);
  });
  it("rejects a non-URL avatar", () => {
    expect(commentRequestSchema.safeParse({ ...valid, avatarUrl: "javascript:alert(1)" }).success).toBe(false);
  });
});
