import { beforeEach, afterEach, expect, it, vi } from "vitest";
let openRepo: typeof import("./github").openRepo;
let loadBranch: typeof import("./github").loadBranch;
beforeEach(async () => {
  vi.resetModules();
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  ({ openRepo, loadBranch } = await import("./github"));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
const repo = { owner: "a", name: "b", full: "a/b", defaultBranch: "main" };
it("paginates branches", async () => {
  let pages = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (!url.includes("/branches"))
        return Response.json({
          owner: { login: "a" },
          name: "b",
          full_name: "a/b",
          default_branch: "main",
        });
      pages++;
      return Response.json(
        pages === 1
          ? Array.from({ length: 100 }, (_, i) => ({ name: `b${i}` }))
          : [{ name: "feature/x" }],
      );
    }),
  );
  const result = await openRepo("a/b", new AbortController().signal);
  expect(result.branches).toHaveLength(101);
  expect(pages).toBe(2);
});
it("reads all files from one immutable commit, excludes symlinks, and reports bad metadata", async () => {
  const urls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      urls.push(url);
      if (url.includes("/commits/"))
        return Response.json({
          sha: "immutable-test",
          commit: { tree: { sha: "tree" } },
        });
      if (url.includes("/git/trees/"))
        return Response.json({
          truncated: false,
          tree: [
            { path: "custom/api.md", mode: "100644", type: "blob" },
            { path: "link.md", mode: "120000", type: "blob" },
          ],
        });
      return new Response("---\nspeckub: true\n---\n");
    }),
  );
  const result = await loadBranch(
    repo,
    "feature/x",
    new AbortController().signal,
    () => {},
  );
  expect(urls[0]).toContain("feature%2Fx");
  expect(urls.at(-1)).toBe(
    "https://raw.githubusercontent.com/a/b/immutable-test/custom/api.md",
  );
  expect(urls).toHaveLength(3);
  expect(result.issues).toHaveLength(1);
});
it("never presents a truncated tree as complete", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      Response.json(
        url.includes("/commits/")
          ? { sha: "truncated-test", commit: { tree: { sha: "t" } } }
          : { truncated: true, tree: [] },
      ),
    ),
  );
  await expect(
    loadBranch(repo, "main", new AbortController().signal, () => {}),
  ).rejects.toThrow("truncated");
});
it("explains rate limits", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("", { status: 429 })),
  );
  await expect(openRepo("a/b", new AbortController().signal)).rejects.toThrow(
    "request limit",
  );
});

function successFetch(url: string): Response {
  if (url.includes("/branches?"))
    return Response.json([{ name: "main" }, { name: "feature" }]);
  if (url.includes("/commits/"))
    return Response.json({
      sha: "saved-sha",
      commit: { tree: { sha: "tree" } },
    });
  if (url.includes("/git/trees/"))
    return Response.json({ truncated: false, tree: [] });
  return Response.json({
    owner: { login: "a" },
    name: "b",
    full_name: "a/b",
    default_branch: "main",
  });
}
it("reuses repo, branch and immutable caches across repeat opens and page reloads", async () => {
  const fetcher = vi.fn(async (url: string) => successFetch(url));
  vi.stubGlobal("fetch", fetcher);
  const signal = new AbortController().signal;
  await openRepo("a/b", signal);
  await loadBranch(repo, "main", signal, () => {});
  expect(fetcher).toHaveBeenCalledTimes(4);
  await openRepo("A/B", signal);
  const again = await loadBranch(repo, "main", signal, () => {});
  expect(again.fromCache).toBe(true);
  expect(fetcher).toHaveBeenCalledTimes(4);
  vi.resetModules();
  const restored = await import("./github");
  await restored.openRepo("a/b", signal);
  const result = await restored.loadBranch(repo, "main", signal, () => {});
  expect(result.sha).toBe("saved-sha");
  expect(result.fromCache).toBe(true);
  expect(fetcher).toHaveBeenCalledTimes(4);
  await restored.loadBranch(repo, "main", signal, () => {}, { refresh: true });
  expect(fetcher).toHaveBeenCalledTimes(5);
  expect(fetcher.mock.calls.at(-1)![0]).toContain("/commits/");
});
it("uses a saved snapshot during rate limits and makes no further calls until cooldown ends", async () => {
  let now = Date.now();
  vi.spyOn(Date, "now").mockImplementation(() => now);
  const fetcher = vi.fn(async (url: string) => successFetch(url));
  vi.stubGlobal("fetch", fetcher);
  const signal = new AbortController().signal;
  await loadBranch(repo, "main", signal, () => {});
  now += 61_000;
  fetcher.mockImplementation(
    async () =>
      new Response("{}", {
        status: 403,
        headers: {
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": String(Math.floor((now + 3600_000) / 1000)),
        },
      }),
  );
  const saved = await loadBranch(repo, "main", signal, () => {});
  expect(saved.sha).toBe("saved-sha");
  expect(saved.warning).toContain("Showing saved data");
  const count = fetcher.mock.calls.length;
  await loadBranch(repo, "main", signal, () => {}, { refresh: true });
  expect(fetcher).toHaveBeenCalledTimes(count);
  await expect(loadBranch(repo, "feature", signal, () => {})).rejects.toThrow(
    "anonymous request limit",
  );
  expect(fetcher).toHaveBeenCalledTimes(count);
  now += 3601_000;
  fetcher.mockImplementation(async (url: string) => successFetch(url));
  await loadBranch(repo, "main", signal, () => {}, { refresh: true });
  expect(fetcher.mock.calls.length).toBe(count + 1);
});
it("honors Retry-After and does not label an ordinary 403 as a quota error", async () => {
  const fetcher = vi.fn(
    async () =>
      new Response("{}", {
        status: 403,
        headers: {
          "x-ratelimit-remaining": "10",
          "x-ratelimit-reset": "9999999999",
        },
      }),
  );
  vi.stubGlobal("fetch", fetcher);
  await expect(openRepo("a/b", new AbortController().signal)).rejects.toThrow(
    "denied access",
  );
  fetcher.mockImplementation(
    async () =>
      new Response("{}", { status: 429, headers: { "retry-after": "120" } }),
  );
  await expect(openRepo("a/b", new AbortController().signal)).rejects.toThrow(
    "anonymous request limit",
  );
  const count = fetcher.mock.calls.length;
  await expect(openRepo("a/b", new AbortController().signal)).rejects.toThrow(
    "anonymous request limit",
  );
  expect(fetcher).toHaveBeenCalledTimes(count);
});
it("falls back to old repo metadata on network failure, but never hides a missing repository", async () => {
  let now = Date.now();
  vi.spyOn(Date, "now").mockImplementation(() => now);
  const fetcher = vi.fn(async (url: string) => successFetch(url));
  vi.stubGlobal("fetch", fetcher);
  await openRepo("a/b", new AbortController().signal);
  now += 6 * 60_000;
  fetcher.mockImplementation(async () => {
    throw new TypeError("Offline");
  });
  const saved = await openRepo("a/b", new AbortController().signal);
  expect(saved.repo.full).toBe("a/b");
  expect(saved.warning).toContain("out of date");
  fetcher.mockImplementation(async () => new Response("{}", { status: 404 }));
  await expect(openRepo("a/b", new AbortController().signal)).rejects.toThrow(
    "not found",
  );
});
it("expired branch refs recheck the commit without downloading unchanged files", async () => {
  let now = Date.now();
  vi.spyOn(Date, "now").mockImplementation(() => now);
  const fetcher = vi.fn(async (url: string) => successFetch(url));
  vi.stubGlobal("fetch", fetcher);
  const signal = new AbortController().signal;
  await loadBranch(repo, "main", signal, () => {});
  now += 61_000;
  await loadBranch(repo, "main", signal, () => {});
  expect(fetcher).toHaveBeenCalledTimes(3);
  const controller = new AbortController();
  controller.abort();
  await expect(
    loadBranch(repo, "main", controller.signal, () => {}),
  ).rejects.toBeDefined();
  expect(fetcher).toHaveBeenCalledTimes(3);
});

it("retries incomplete downloads when the branch cache expires instead of keeping partial data all day", async () => {
  let now = Date.now();
  vi.spyOn(Date, "now").mockImplementation(() => now);
  let fail = true;
  const fetcher = vi.fn(async (url: string) => {
    if (url.includes("/commits/"))
      return Response.json({
        sha: "partial-sha",
        commit: { tree: { sha: "tree" } },
      });
    if (url.includes("/git/trees/"))
      return Response.json({
        truncated: false,
        tree: [{ path: "api.md", mode: "100644", type: "blob" }],
      });
    return fail
      ? new Response("", { status: 503 })
      : new Response(
          "---\nspeckub: true\nspecVersion: 1\nid: users.get\nkind: http\nmethod: GET\npath: /users\nsummary: Users\n---\n",
        );
  });
  vi.stubGlobal("fetch", fetcher);
  const signal = new AbortController().signal;
  const partial = await loadBranch(repo, "main", signal, () => {});
  expect(partial.issues).toHaveLength(1);
  now += 61_000;
  fail = false;
  const recovered = await loadBranch(repo, "main", signal, () => {});
  expect(recovered.specs).toHaveLength(1);
  expect(recovered.issues).toHaveLength(0);
  expect(recovered.fromCache).toBe(false);
  expect(fetcher).toHaveBeenCalledTimes(6);
});
