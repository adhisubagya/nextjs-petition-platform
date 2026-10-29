import { describe, expect, it } from "vitest";
import { commentInputSchema } from "@/lib/schemas";
import { seedComments, seedPetition } from "./seed";

describe("seed data", () => {
  it("has 10-20 comments that pass validation", () => {
    const comments = seedComments(0);
    expect(comments.length).toBeGreaterThanOrEqual(10);
    expect(comments.length).toBeLessThanOrEqual(20);
    for (const c of comments) expect(commentInputSchema.safeParse(c).success).toBe(true);
  });
  it("uses the demo signature count", () => {
    expect(seedPetition.signatureCount).toBe(8452);
  });
});
