import { collect, eligible } from "./discovery";
import type { Repo } from "./github";

export type Provider = "github" | "gitlab" | "bitbucket";
export type RemoteRepo = Repo & { provider: Provider };
export type ParsedRemote = { provider: Provider; full: string };
export type RemoteSnapshot = { specs: ReturnType<typeof collect>["specs"]; issues: string[]; sha: string; filesRead: number; incomplete?: boolean; fromCache: boolean; checkedAt: number; warning?: string };

const validSegment = /^[a-zA-Z0-9_][a-zA-Z0-9_.-]*$/;
export function parseRemote(input: string): ParsedRemote {
  const raw = input.trim().replace(/\/+$/, "").replace(/\.git$/i, "");
  let provider: Provider = "github";
  let path = raw;
  if (/^https?:\/\//i.test(raw)) {
    let url: URL;
    try { url = new URL(raw); } catch { throw new Error("Invalid repository URL."); }
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash)
      throw new Error("Enter a public HTTPS repository URL without credentials or query parameters.");
    const hosts: Record<string, Provider> = { "github.com": "github", "gitlab.com": "gitlab", "bitbucket.org": "bitbucket" };
    if (!Object.hasOwn(hosts, url.hostname)) throw new Error("Supported providers: GitHub, GitLab, and Bitbucket.");
    provider = hosts[url.hostname];
    path = decodeURIComponent(url.pathname.slice(1));
  } else if (/^(?:github\.com|gitlab\.com|bitbucket\.org)\//i.test(raw)) {
    return parseRemote("https://" + raw);
  }
  const segments = path.split("/");
  if (segments.length < 2 || (provider !== "gitlab" && segments.length !== 2) ||
      segments.some(s => !validSegment.test(s) || s === "." || s === "..") ||
      path.includes("%") || path.includes("\\"))
    throw new Error("Enter a valid public GitHub, GitLab, or Bitbucket repository URL.");
  return { provider, full: path };
}
type Entry = { path: string; size?: number; symlink?: boolean };
type GitLabMeta = { path_with_namespace: string; default_branch: string; visibility: string };
type BitbucketMeta = { full_name: string; mainbranch?: { name: string }; is_private: boolean };
type GitLabCommit = { id: string };
type BitbucketCommit = { hash: string };
type GitLabTreeItem = { path: string; type: string; mode?: string };
type BitbucketItem = { name?: string; path: string; type: string; size?: number; attributes?: string[] };
type Adapter = {
  metadata(full: string, signal: AbortSignal): Promise<{ full: string; defaultBranch: string; private: boolean }>;
  branches(full: string, signal: AbortSignal): Promise<string[]>;
  revision(full: string, branch: string, signal: AbortSignal): Promise<string>;
  files(full: string, sha: string, signal: AbortSignal): Promise<Entry[]>;
  raw(full: string, sha: string, path: string): string;
  source(full: string, sha: string, path: string): string;
};
const enc = (s: string) => encodeURIComponent(s);
const filePath = (s: string) => s.split("/").map(enc).join("/");
async function json(url: string, signal: AbortSignal): Promise<any> {
  signal.throwIfAborted();
  const response = await fetch(url, { signal, credentials: "omit", headers: { Accept: "application/json" } });
  if (!response.ok) {
    if (response.status === 404) throw new Error("Public repository, branch, or file not found.");
    if (response.status === 401 || response.status === 403) throw new Error("Repository access denied. Only public repositories are supported.");
    if (response.status === 429) throw new Error("Provider rate limit reached. Try again later.");
    throw new Error(`Repository provider returned HTTP ${response.status}.`);
  }
  return response.json();
}
async function pages<T>(url: (page: number) => string, signal: AbortSignal, limit = 10): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; page <= limit; page++) {
    const items = await json(url(page), signal) as T[];
    if (!Array.isArray(items)) throw new Error("Unexpected provider response.");
    all.push(...items);
    if (items.length < 100) return all;
  }
  throw new Error("Repository exceeds the supported listing limit.");
}
const gitlab: Adapter = {
  async metadata(full, signal) {
    const d = await json(`https://gitlab.com/api/v4/projects/${enc(full)}`, signal) as GitLabMeta;
    return { full: d.path_with_namespace, defaultBranch: d.default_branch, private: d.visibility !== "public" };
  },
  async branches(full, signal) {
    const items = await pages<{ name: string }>(p => `https://gitlab.com/api/v4/projects/${enc(full)}/repository/branches?per_page=100&page=${p}`, signal);
    return items.map(x => x.name);
  },
  async revision(full, branch, signal) {
    const d = await json(`https://gitlab.com/api/v4/projects/${enc(full)}/repository/commits/${enc(branch)}`, signal) as GitLabCommit;
    return d.id;
  },
  async files(full, sha, signal) {
    const items = await pages<GitLabTreeItem>(p => `https://gitlab.com/api/v4/projects/${enc(full)}/repository/tree?recursive=true&per_page=100&page=${p}&ref=${enc(sha)}`, signal, 50);
    return items.filter(x => x.type === "blob").map(x => ({ path: x.path, symlink: x.mode === "120000" }));
  },
  raw(full, sha, path) { return `https://gitlab.com/api/v4/projects/${enc(full)}/repository/files/${enc(path)}/raw?ref=${enc(sha)}`; },
  source(full, sha, path) { return `https://gitlab.com/${full}/-/blob/${enc(sha)}/${filePath(path)}`; },
};
const bitbucket: Adapter = {
  async metadata(full, signal) {
    const d = await json(`https://api.bitbucket.org/2.0/repositories/${full}`, signal) as BitbucketMeta;
    return { full: d.full_name, defaultBranch: d.mainbranch?.name, private: d.is_private };
  },
  async branches(full, signal) {
    return (await bbPages(`https://api.bitbucket.org/2.0/repositories/${full}/refs/branches?pagelen=100`, signal)).map(x => x.name);
  },
  async revision(full, branch, signal) {
    const d = await json(`https://api.bitbucket.org/2.0/repositories/${full}/commits/${enc(branch)}`, signal) as BitbucketCommit;
    return d.hash;
  },
  async files(full, sha, signal) {
    const entries = await bbPages(`https://api.bitbucket.org/2.0/repositories/${full}/src/${enc(sha)}/?pagelen=100&max_depth=100`, signal);
    return entries.filter(x => x.type === "commit_file").map(x => ({ path: x.path, size: x.size, symlink: x.attributes?.includes("link") }));
  },
  raw(full, sha, path) { return `https://api.bitbucket.org/2.0/repositories/${full}/src/${enc(sha)}/${filePath(path)}`; },
  source(full, sha, path) { return `https://bitbucket.org/${full}/src/${enc(sha)}/${filePath(path)}`; },
};
async function bbPages(url: string, signal: AbortSignal): Promise<BitbucketItem[]> {
  const result: BitbucketItem[] = [];
  for (let page = 0; url && page < 50; page++) {
    const d = await json(url, signal) as { values: BitbucketItem[]; next?: string };
    if (!Array.isArray(d.values)) throw new Error("Unexpected Bitbucket response.");
    result.push(...d.values);
    if (!d.next) return result;
    const next = new URL(d.next);
    if (next.protocol !== "https:" || next.hostname !== "api.bitbucket.org") throw new Error("Unsafe pagination URL.");
    url = next.href;
  }
  throw new Error("Repository exceeds the supported listing limit.");
}
const adapters = { gitlab, bitbucket };
export async function openRemote(input: string, signal: AbortSignal): Promise<{ repo: RemoteRepo; branches: string[] }> {
  const parsed = parseRemote(input);
  if (parsed.provider === "github") throw new Error("Use the GitHub adapter.");
  const adapter = adapters[parsed.provider];
  const meta = await adapter.metadata(parsed.full, signal);
  if (meta.private) throw new Error("Only public repositories are supported.");
  if (!meta.defaultBranch) throw new Error("Repository has no default branch.");
  const branches = await adapter.branches(parsed.full, signal);
  const parts = meta.full.split("/");
  return { repo: { provider: parsed.provider, full: meta.full, owner: parts.slice(0, -1).join("/"), name: parts.at(-1)!, defaultBranch: meta.defaultBranch }, branches };
}
export async function loadRemote(repo: RemoteRepo, branch: string, signal: AbortSignal, onProgress: (message: string) => void): Promise<RemoteSnapshot> {
  if (repo.provider === "github") throw new Error("Use the GitHub adapter.");
  const adapter = adapters[repo.provider];
  onProgress("Resolving branch…");
  const sha = await adapter.revision(repo.full, branch, signal);
  onProgress("Finding Markdown across the repository…");
  const files = (await adapter.files(repo.full, sha, signal)).filter(x => !x.symlink && eligible(x.path));
  if (files.length > 500) throw new Error("More than 500 Markdown files. Use the SpecKub CLI.");
  let next = 0, done = 0, total = 0;
  const documents: { file: string; text: string }[] = [];
  const issues: string[] = [];
  await Promise.all(Array.from({ length: Math.min(6, files.length) }, async () => {
    while (next < files.length) {
      signal.throwIfAborted();
      const file = files[next++];
      if ((file.size ?? 0) > 512000 || total >= 20_000_000) { issues.push(`${file.path}: download limit exceeded`); done++; continue; }
      try {
        const response = await fetch(adapter.raw(repo.full, sha, file.path), { signal, credentials: "omit" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Missing response body");
        const chunks: Uint8Array[] = [];
        let size = 0;
        try {
          while (true) {
            const part = await reader.read();
            if (part.done) break;
            size += part.value.length;
            total += part.value.length;
            if (size > 512000 || total > 20_000_000) throw new Error("Download size limit exceeded");
            chunks.push(part.value);
          }
        } finally { await reader.cancel(); }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
        documents.push({ file: file.path, text: new TextDecoder().decode(bytes) });
      } catch (e) {
        signal.throwIfAborted();
        issues.push(`${file.path}: ${e instanceof Error ? e.message : "Could not read file"}`);
      }
      done++;
      onProgress(`Reading Markdown ${done} / ${files.length}…`);
    }
  }));
  const result = collect(documents);
  return { ...result, issues: [...issues, ...result.issues], sha, filesRead: documents.length, incomplete: issues.length > 0, fromCache: false, checkedAt: Date.now() };
}
export function remoteSourceUrl(repo: RemoteRepo, sha: string, path: string): string {
  if (repo.provider === "github") return `https://github.com/${repo.full}/blob/${enc(sha)}/${filePath(path)}`;
  return adapters[repo.provider].source(repo.full, sha, path);
}
