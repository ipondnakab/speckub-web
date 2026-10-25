// Only public GitHub metadata/specs are stored, never credentials.
const key = "speckub-github-cache-v1";
const maxAge = 24 * 60 * 60 * 1000;
const maxSize = 2_000_000;
type Entry = { at: number; ttl: number; value: unknown };
let entries: Record<string, Entry> | undefined;
function all(): Record<string, Entry> {
  if (entries) return entries;
  entries = {};
  try {
    const text = localStorage.getItem(key);
    if (!text || text.length > maxSize) return entries;
    const saved: unknown = JSON.parse(text);
    if (!saved || typeof saved !== "object" || Array.isArray(saved))
      return entries;
    for (const [name, item] of Object.entries(saved).slice(-20)) {
      if (!item || typeof item !== "object") continue;
      const e = item as Entry;
      if (
        Number.isFinite(e.at) &&
        Number.isFinite(e.ttl) &&
        e.ttl > 0 &&
        e.at <= Date.now() &&
        Date.now() - e.at < maxAge
      ) {
        Object.defineProperty(entries, name, {
          value: e,
          enumerable: true,
          configurable: true,
          writable: true,
        });
      }
    }
  } catch {
    /* Browser storage may be blocked or malformed. */
  }
  return entries;
}
export function cached<T>(
  name: string,
  valid: (value: unknown) => value is T,
  stale = false,
): { value: T; at: number } | undefined {
  const entry = all()[name];
  if (
    !entry ||
    Date.now() - entry.at >= maxAge ||
    (!stale && Date.now() - entry.at >= entry.ttl)
  )
    return;
  if (!valid(entry.value)) return;
  return { value: entry.value, at: entry.at };
}
export function remember(name: string, value: unknown, ttl: number): void {
  const store = all();
  try {
    if (JSON.stringify(value).length > 1_000_000) return;
    Object.defineProperty(store, name, {
      value: { at: Date.now(), ttl, value },
      enumerable: true,
      configurable: true,
      writable: true,
    });
    const names = Object.keys(store).sort((a, b) => store[a].at - store[b].at);
    while (names.length > 20 || JSON.stringify(store).length > maxSize)
      delete store[names.shift()!];
    try {
      localStorage.setItem(key, JSON.stringify(store));
    } catch {
      /* Memory cache remains usable. */
    }
  } catch {
    /* A cache failure must never prevent reading documentation. */
  }
}
