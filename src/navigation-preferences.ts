export type NavigationPreferences = { view: "list" | "tree"; depth: number };
const key = "speckub-reader-navigation";
export function normalizeNavigation(value: unknown): NavigationPreferences {
  const input =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return {
    view: input.view === "tree" ? "tree" : "list",
    depth:
      typeof input.depth === "number" &&
      Number.isInteger(input.depth) &&
      input.depth >= 1 &&
      input.depth <= 12
        ? input.depth
        : 2,
  };
}
export function loadNavigation(): NavigationPreferences {
  try {
    return normalizeNavigation(JSON.parse(localStorage.getItem(key) ?? "null"));
  } catch {
    return normalizeNavigation(null);
  }
}
export function saveNavigation(value: NavigationPreferences): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage can be unavailable for file exports or in private browsing. */
  }
}
