import { beforeEach, afterEach, expect, it, vi } from "vitest";
beforeEach(() => {
  vi.resetModules();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("bounds the cache and keeps recent entries", async () => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => values.set(k, v),
  });
  const { cached, remember } = await import("./github-cache");
  const valid = (v: unknown): v is number => typeof v === "number";
  for (let i = 0; i < 25; i++) remember("item" + i, i, 60_000);
  expect(cached("item0", valid)).toBeUndefined();
  expect(cached("item24", valid)?.value).toBe(24);
  expect([...values.values()][0].length).toBeLessThanOrEqual(2_000_000);
  remember("large", "x".repeat(1_000_001), 60_000);
  expect(
    cached("large", (v: unknown): v is string => typeof v === "string"),
  ).toBeUndefined();
});
it("rejects malformed storage and functions without storage access", async () => {
  vi.stubGlobal("localStorage", {
    getItem: () => "{",
    setItem: () => {
      throw new Error("denied");
    },
  });
  const { cached, remember } = await import("./github-cache");
  const valid = (v: unknown): v is string => typeof v === "string";
  expect(cached("value", valid)).toBeUndefined();
  remember("value", "memory", 60_000);
  expect(cached("value", valid)?.value).toBe("memory");
});
it("expires normal reads, allows marked stale reads, and drops data after a day", async () => {
  let now = Date.now();
  vi.spyOn(Date, "now").mockImplementation(() => now);
  const { cached, remember } = await import("./github-cache");
  const valid = (v: unknown): v is number => typeof v === "number";
  remember("value", 1, 1000);
  now += 1001;
  expect(cached("value", valid)).toBeUndefined();
  expect(cached("value", valid, true)?.value).toBe(1);
  now += 24 * 3600_000;
  expect(cached("value", valid, true)).toBeUndefined();
});
