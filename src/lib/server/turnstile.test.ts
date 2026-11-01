import { afterEach, describe, expect, it, vi } from "vitest";
import { isTestSecret, verifyTurnstile } from "./turnstile";

afterEach(() => vi.unstubAllEnvs());

describe("verifyTurnstile", () => {
  it("recognises Cloudflare's test secrets", () => {
    expect(isTestSecret("1x0000000000000000000000000000000AA")).toBe(true);
    expect(isTestSecret("2x0000000000000000000000000000000AA")).toBe(true);
    expect(isTestSecret("0x4AAAAAAABkMYinukE8nzYS")).toBe(false);
  });

  it("refuses a missing or test secret in live mode, allows them in Demo Mode", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect(await verifyTurnstile("tok", "1.1.1.1", false)).toBe(false);
    expect(await verifyTurnstile("tok", "1.1.1.1", true)).toBe(true);
    vi.stubEnv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA");
    expect(await verifyTurnstile("tok", "1.1.1.1", false)).toBe(false);
  });
});
