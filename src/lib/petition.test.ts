import { describe, expect, it } from "vitest";
import { getComments, PAGE_SIZE } from "./petition";

describe("getComments (seed fallback)", () => {
  it("pages through all comments without overlap", async () => {
    const first = await getComments();
    expect(first.comments).toHaveLength(PAGE_SIZE);
    expect(first.comments[0].pinned).toBe(true);
    expect(first.nextCursor).not.toBeNull();

    const second = await getComments(first.nextCursor);
    expect(second.comments.length).toBeGreaterThan(0);
    expect(second.nextCursor).toBeNull();
    const ids = new Set([...first.comments, ...second.comments].map((c) => c.id));
    expect(ids.size).toBe(first.comments.length + second.comments.length);
  });
});
