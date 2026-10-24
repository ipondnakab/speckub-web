import { collect, eligible } from "./discovery";
export type Repo = {
  owner: string;
  name: string;
  full: string;
  defaultBranch: string;
};
export function parseRepo(input: string): string {
  const value = input.trim().replace(/\/$/, "");
  const match =
    /^(?:https:\/\/github\.com\/)?([\w-]+)\/([\w.-]+?)(?:\.git)?$/.exec(value);
  if (!match || match[2] === "." || match[2] === "..")
    throw new Error(
      "Enter owner/repository or a public GitHub repository URL. Select the branch after opening it.",
    );
  return `${match[1]}/${match[2]}`;
}
async function api(path: string, signal: AbortSignal) {
  const res = await fetch(`https://api.github.com/repos/${path}`, {
    signal,
    credentials: "omit",
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) {
    if (res.status === 403 || res.status === 429) {
      const reset = Number(res.headers.get("x-ratelimit-reset"));
      throw new Error(
        `GitHub rate limit or access restriction.${reset ? ` Retry after ${new Date(reset * 1000).toLocaleTimeString()}.` : " Please try again later."}`,
      );
    }
    if (res.status === 404)
      throw new Error(
        "Repository or branch not found. Only public GitHub repositories are supported.",
      );
    throw new Error(`GitHub returned ${res.status}. Please retry.`);
  }
  return res.json();
}
export async function openRepo(
  input: string,
  signal: AbortSignal,
): Promise<{ repo: Repo; branches: string[] }> {
  const full = parseRepo(input);
  const data = await api(full, signal);
  if (data.private) throw new Error("Only public repositories are supported.");
  const branches: string[] = [];
  for (let page = 1; page <= 10; page++) {
    const items = (await api(
      `${full}/branches?per_page=100&page=${page}`,
      signal,
    )) as { name: string }[];
    branches.push(...items.map((b) => b.name));
    if (items.length < 100) break;
    if (page === 10)
      throw new Error(
        "This repository has too many branches to list (limit: 1,000).",
      );
  }
  return {
    repo: {
      owner: data.owner.login,
      name: data.name,
      full: data.full_name,
      defaultBranch: data.default_branch,
    },
    branches,
  };
}
type TreeEntry = { path: string; type: string; mode: string; size?: number };
const cache = new Map<string, Awaited<ReturnType<typeof readSnapshot>>>();
export async function loadBranch(
  repo: Repo,
  branch: string,
  signal: AbortSignal,
  onProgress: (text: string) => void,
) {
  onProgress("Resolving branch…");
  const commit = await api(
    `${repo.full}/commits/${encodeURIComponent(branch)}`,
    signal,
  );
  const key = `${repo.full}@${commit.sha}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const result = await readSnapshot(
    repo,
    commit.sha,
    commit.commit.tree.sha,
    signal,
    onProgress,
  );
  if (cache.size >= 5) cache.delete(cache.keys().next().value!);
  cache.set(key, result);
  return result;
}
async function readSnapshot(
  repo: Repo,
  sha: string,
  treeSha: string,
  signal: AbortSignal,
  onProgress: (text: string) => void,
) {
  onProgress("Finding Markdown across the repository…");
  const tree = await api(
    `${repo.full}/git/trees/${treeSha}?recursive=1`,
    signal,
  );
  if (tree.truncated)
    throw new Error(
      "GitHub truncated this repository tree. Discovery cannot be complete. Use the SpecKub CLI locally for this repository.",
    );
  const files = (tree.tree as TreeEntry[]).filter(
    (f) => f.type === "blob" && f.mode !== "120000" && eligible(f.path),
  );
  if (files.length > 500)
    throw new Error(
      "This repository contains over 500 eligible Markdown files. Use the local CLI for larger repositories.",
    );
  let next = 0,
    done = 0,
    totalBytes = 0;
  const documents: { file: string; text: string }[] = [];
  const failures: string[] = [];
  await Promise.all(
    Array.from({ length: Math.min(6, files.length) }, async () => {
      while (next < files.length) {
        signal.throwIfAborted();
        const file = files[next++];
        if (totalBytes > 20_000_000) {
          failures.push(
            `${file.path}: not read (repository download budget exceeded)`,
          );
          continue;
        }
        if ((file.size ?? 0) > 512_000) {
          failures.push(`${file.path}: skipped (over 500 KB)`);
          continue;
        }
        try {
          const url = `https://raw.githubusercontent.com/${repo.full}/${sha}/${file.path.split("/").map(encodeURIComponent).join("/")}`;
          const response = await fetch(url, { signal, credentials: "omit" });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const reader = response.body!.getReader();
          const chunks: Uint8Array[] = [];
          let bytes = 0;
          try {
            while (true) {
              const part = await reader.read();
              if (part.done) break;
              bytes += part.value.length;
              totalBytes += part.value.length;
              if (bytes > 512_000 || totalBytes > 20_000_000)
                throw new Error("Download size limit exceeded");
              chunks.push(part.value);
            }
          } finally {
            await reader.cancel();
          }
          const data = new Uint8Array(bytes);
          let offset = 0;
          for (const chunk of chunks) {
            data.set(chunk, offset);
            offset += chunk.length;
          }
          documents.push({
            file: file.path,
            text: new TextDecoder().decode(data),
          });
        } catch (error) {
          signal.throwIfAborted();
          failures.push(
            `${file.path}: ${error instanceof Error ? error.message : "Could not read file"}`,
          );
        }
        done++;
        onProgress(`Reading Markdown ${done} / ${files.length}…`);
      }
    }),
  );
  const result = collect(documents);
  return {
    ...result,
    issues: [...failures, ...result.issues],
    sha,
    filesRead: documents.length,
  };
}
export function sourceUrl(repo: Repo, sha: string, path: string): string {
  return `https://github.com/${repo.full}/blob/${sha}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
