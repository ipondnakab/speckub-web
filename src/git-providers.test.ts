import { afterEach, expect, it, vi } from "vitest";
import { parseRemote, openRemote, loadRemote, remoteSourceUrl } from "./git-providers";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it("accepts GitHub shorthand and provider HTTPS URLs", () => {
  expect(parseRemote("owner/repo")).toEqual({ provider: "github", full: "owner/repo" });
  expect(parseRemote("https://github.com/owner/repo.git")).toEqual({ provider: "github", full: "owner/repo" });
  expect(parseRemote("https://gitlab.com/group/subgroup/repo")).toEqual({ provider: "gitlab", full: "group/subgroup/repo" });
  expect(parseRemote("bitbucket.org/team/repo")).toEqual({ provider: "bitbucket", full: "team/repo" });
});
it.each(["https://evil.com/a/b", "http://gitlab.com/a/b", "https://gitlab.com/a/b?token=secret", "https://gitlab.com/a/b#fragment", "https://user:pass@gitlab.com/a/b", "https://bitbucket.org/a/b/extra", "../repo", "https://github.com/a/%2Fetc"])("rejects unsafe repository input %s", input => {
  expect(() => parseRemote(input)).toThrow();
});
it("loads GitLab branches and immutable Markdown", async () => {
  const urls: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    urls.push(url);
    if (url.endsWith("/projects/group%2Frepo")) return Response.json({ path_with_namespace: "group/repo", default_branch: "main", visibility: "public" });
    if (url.includes("/repository/branches?")) return Response.json([{ name: "main" }]);
    if (url.includes("/repository/commits/")) return Response.json({ id: "abc123" });
    if (url.includes("/repository/tree?")) return Response.json([{ path: "api.md", type: "blob", mode: "100644" }]);
    return new Response("---\nspeckub: true\nspecVersion: 1\nid: users.get\nkind: http\nmethod: GET\npath: /users\nsummary: Users\n---\n");
  }));
  const signal = new AbortController().signal;
  const { repo, branches } = await openRemote("https://gitlab.com/group/repo", signal);
  expect(branches).toEqual(["main"]);
  const result = await loadRemote(repo, "main", signal, () => {});
  expect(result.sha).toBe("abc123");
  expect(result.specs).toHaveLength(1);
  expect(urls.at(-1)).toContain("ref=abc123");
  expect(remoteSourceUrl(repo, result.sha, "api.md")).toContain("/-/blob/abc123/api.md");
});
it("loads Bitbucket branches and immutable Markdown", async () => {
  const urls: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    urls.push(url);
    if (url.endsWith("/repositories/team/repo")) return Response.json({ full_name: "team/repo", mainbranch: { name: "main" }, is_private: false });
    if (url.includes("/refs/branches?")) return Response.json({ values: [{ name: "main" }] });
    if (url.includes("/commits/")) return Response.json({ hash: "deadbeef" });
    if (url.includes("/src/deadbeef/?")) return Response.json({ values: [{ path: "api.md", type: "commit_file", size: 100 }] });
    return new Response("---\nspeckub: true\nspecVersion: 1\nid: users.get\nkind: http\nmethod: GET\npath: /users\nsummary: Users\n---\n");
  }));
  const signal = new AbortController().signal;
  const { repo } = await openRemote("https://bitbucket.org/team/repo", signal);
  const result = await loadRemote(repo, "main", signal, () => {});
  expect(result.specs).toHaveLength(1);
  expect(urls.at(-1)).toContain("/src/deadbeef/api.md");
  expect(remoteSourceUrl(repo, result.sha, "api.md")).toContain("/src/deadbeef/api.md");
});
it("rejects private repositories", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ full_name: "team/repo", mainbranch: { name: "main" }, is_private: true })));
  await expect(openRemote("https://bitbucket.org/team/repo", new AbortController().signal)).rejects.toThrow("public");
});
