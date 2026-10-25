import { collect, eligible, type Spec } from "./discovery";
import { endpointSchema } from "./contract";
import { cached, remember } from "./github-cache";
const minute = 60_000;
type RepoInfo = { repo: Repo; branches: string[] };
export class TemporaryGitHubError extends Error {}
function isRepoInfo(value: unknown): value is RepoInfo {
  if (!value || typeof value !== "object") return false;
  const item = value as RepoInfo;
  return Boolean(
    item.repo &&
      typeof item.repo.owner === "string" &&
      typeof item.repo.name === "string" &&
      item.repo.full === `${item.repo.owner}/${item.repo.name}` &&
      typeof item.repo.defaultBranch === "string" &&
      Array.isArray(item.branches) &&
      item.branches.length <= 1000 &&
      item.branches.every((name) => typeof name === "string"),
  );
}
function retryMessage(until: number): string {
  return `GitHub's anonymous request limit has been reached. Retry after ${new Date(until).toLocaleTimeString()}. This limit is shared by apps on your IP address; reloading will not reset it.`;
}
function temporary(error: unknown): boolean {
  return error instanceof TemporaryGitHubError || error instanceof TypeError;
}
function savedNotice(error: unknown, at: number): string {
  return `${error instanceof Error ? error.message : "GitHub is unavailable."} Showing saved data from ${new Date(at).toLocaleString()}; it may be out of date.`;
}
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
  signal.throwIfAborted();
  const blocked = cached(
    "cooldown",
    (v: unknown): v is number => typeof v === "number" && Number.isFinite(v),
  );
  if (blocked && blocked.value > Date.now())
    throw new TemporaryGitHubError(retryMessage(blocked.value));
  const res = await fetch(`https://api.github.com/repos/${path}`, {
    signal,
    credentials: "omit",
    cache: "no-cache",
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) {
    if (res.status === 403 || res.status === 429) {
      const detail = (await res.json().catch(() => ({ message: "" }))) as {
        message?: string;
      };
      if (
        res.status === 429 ||
        res.headers.get("x-ratelimit-remaining") === "0" ||
        /rate limit/i.test(detail.message ?? "")
      ) {
        const retry = res.headers.get("retry-after");
        const delay = retry
          ? Number.isFinite(Number(retry))
            ? Date.now() + Number(retry) * 1000
            : Date.parse(retry)
          : 0;
        const reset =
          res.headers.get("x-ratelimit-remaining") === "0"
            ? Number(res.headers.get("x-ratelimit-reset")) * 1000
            : 0;
        const until = Math.max(
          Number.isFinite(delay) ? delay : 0,
          Number.isFinite(reset) ? reset : 0,
          Date.now() + minute,
        );
        remember("cooldown", until, until - Date.now());
        throw new TemporaryGitHubError(retryMessage(until));
      }
      throw new Error(
        "GitHub denied access to this repository. Confirm it is public.",
      );
    }
    if (res.status === 404)
      throw new Error(
        "Repository or branch not found. Only public GitHub repositories are supported.",
      );
    if (res.status >= 500)
      throw new TemporaryGitHubError(
        `GitHub is temporarily unavailable (HTTP ${res.status}). Please retry later.`,
      );
    throw new Error(`GitHub returned ${res.status}. Please retry.`);
  }
  return res.json();
}
export async function openRepo(
  input: string,
  signal: AbortSignal,
): Promise<RepoInfo & { warning?: string }> {
  signal.throwIfAborted();
  const full = parseRepo(input);
  const key = `repo:${full.toLowerCase()}`;
  const hit = cached(key, isRepoInfo);
  if (hit) return hit.value;
  const saved = cached(key, isRepoInfo, true);
  try {
    const data = await api(full, signal);
    if (data.private)
      throw new Error("Only public repositories are supported.");
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
    const result = {
      repo: {
        owner: data.owner.login,
        name: data.name,
        full: data.full_name,
        defaultBranch: data.default_branch,
      },
      branches,
    };
    remember(key, result, 5 * minute);
    return result;
  } catch (error) {
    signal.throwIfAborted();
    if (saved && temporary(error))
      return { ...saved.value, warning: savedNotice(error, saved.at) };
    throw error;
  }
}
type TreeEntry = { path: string; type: string; mode: string; size?: number };
type Snapshot = {
  specs: Spec[];
  issues: string[];
  sha: string;
  filesRead: number;
  incomplete?: boolean;
};
type BranchRef = { sha: string };
function isRef(value: unknown): value is BranchRef {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as BranchRef).sha === "string",
  );
}
function isSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== "object") return false;
  const s = value as Snapshot;
  return (
    typeof s.sha === "string" &&
    Number.isInteger(s.filesRead) &&
    s.filesRead >= 0 &&
    s.filesRead <= 500 &&
    Array.isArray(s.issues) &&
    s.issues.every((i) => typeof i === "string") &&
    Array.isArray(s.specs) &&
    s.specs.length <= 500 &&
    s.specs.every(
      (spec) =>
        spec &&
        typeof spec.file === "string" &&
        typeof spec.body === "string" &&
        endpointSchema.safeParse(spec).success,
    )
  );
}
export async function loadBranch(
  repo: Repo,
  branch: string,
  signal: AbortSignal,
  onProgress: (text: string) => void,
  options: { refresh?: boolean } = {},
) {
  signal.throwIfAborted();
  const repoKey = repo.full.toLowerCase(),
    refKey = `branch:${repoKey}:${branch}`;
  const ref = cached(refKey, isRef, true);
  const freshRef = cached(refKey, isRef);
  const saved = ref
    ? cached(`snapshot:${repoKey}@${ref.value.sha}`, isSnapshot, true)
    : undefined;
  if (!options.refresh && freshRef && saved)
    return {
      ...saved.value,
      fromCache: true,
      checkedAt: freshRef.at,
      warning: undefined as string | undefined,
    };
  onProgress("Resolving branch…");
  try {
    const commit = await api(
      `${repo.full}/commits/${encodeURIComponent(branch)}`,
      signal,
    );
    const key = `snapshot:${repoKey}@${commit.sha}`;
    const stored = cached(key, isSnapshot, true);
    const hit = stored?.value.sha === commit.sha ? stored : undefined;
    const reuse = Boolean(
      hit &&
        (!hit.value.incomplete || Date.now() - hit.at < minute) &&
        !(options.refresh && hit.value.issues.length),
    );
    const result = reuse
      ? hit!.value
      : await readSnapshot(
          repo,
          commit.sha,
          commit.commit.tree.sha,
          signal,
          onProgress,
        );
    signal.throwIfAborted();
    remember(key, result, 24 * 60 * minute);
    remember(refKey, { sha: commit.sha }, minute);
    return {
      ...result,
      fromCache: reuse,
      checkedAt: Date.now(),
      warning: undefined as string | undefined,
    };
  } catch (error) {
    signal.throwIfAborted();
    if (saved && temporary(error))
      return {
        ...saved.value,
        fromCache: true,
        checkedAt: ref!.at,
        warning: savedNotice(error, ref!.at),
      };
    throw error;
  }
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
    incomplete: failures.length > 0,
  };
}
export function sourceUrl(repo: Repo, sha: string, path: string): string {
  return `https://github.com/${repo.full}/blob/${sha}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
