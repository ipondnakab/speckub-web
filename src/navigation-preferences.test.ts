import { afterEach, expect, it, vi } from "vitest";
import {
  loadNavigation,
  normalizeNavigation,
  saveNavigation,
} from "./navigation-preferences";
afterEach(() => vi.unstubAllGlobals());
it("keeps valid saved settings and recovers from malformed or unsupported preferences", () => {
  for (const input of [
    null,
    "tree",
    { view: "unknown", depth: 0 },
    { depth: 99 },
    { depth: 2.5 },
  ])
    expect(normalizeNavigation(input)).toEqual({ view: "list", depth: 2 });
  expect(normalizeNavigation({ view: "tree", depth: 7 })).toEqual({
    view: "tree",
    depth: 7,
  });
  vi.stubGlobal("localStorage", { getItem: () => "{" });
  expect(loadNavigation()).toEqual({ view: "list", depth: 2 });
});
it("navigation remains usable when browser storage is denied", () => {
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw new Error("denied");
    },
    setItem: () => {
      throw new Error("denied");
    },
  });
  expect(loadNavigation()).toEqual({ view: "list", depth: 2 });
  expect(() => saveNavigation({ view: "tree", depth: 3 })).not.toThrow();
});
