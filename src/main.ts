import { injectSpeedInsights } from "@vercel/speed-insights";
import { header } from "./site";
import { loadNavigation, saveNavigation } from "./navigation-preferences";
import {
  pathTree,
  branchEndpoints,
  navigationLabel,
  type PathBranch,
} from "./path-tree";
import "./style.css";
import mermaidUrl from "@mermaid-js/tiny/dist/mermaid.tiny.js?url";

injectSpeedInsights();
let renderer: Promise<Mermaid> | undefined;
function loadMermaid(): Promise<Mermaid> {
  return (renderer ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = mermaidUrl;
    script.onload = () => resolve(window.mermaid);
    script.onerror = () => {
      renderer = undefined;
      script.remove();
      reject(new Error("Could not load diagram renderer"));
    };
    document.head.append(script);
  }));
}
import type { Spec } from "./discovery";
import { openRepo, loadBranch, sourceUrl, type Repo } from "./github";
import { parseRemote } from "./git-providers";
import { renderMarkdown } from "./markdown";
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `${header("explorer")}
<main id="main"><section class="hero"><div class="eyebrow"><span class="dot"></span> YOUR CODE. YOUR SPECS. EVERY BRANCH.</div><h1>Your APIs,<br><span>an open book.</span></h1><p>Turn a public repository into a readable API reference.<br>Choose a branch. Explore the specs. Stay close to the code.</p>
<form id="repo-form"><label for="repo-input">PUBLIC GIT REPOSITORY</label><div class="input-row"><span aria-hidden="true">⌘</span><input id="repo-input" placeholder="github.com/owner/repo or gitlab.com/group/repo" autocomplete="off" required aria-label="Public GitHub, GitLab, or Bitbucket repository"><button type="submit">Open repository <span>↗</span></button></div></form>
<div class="try">Try it with <a id="example" href="/explorer.html?repo=ipondnakab%2Fspeckub&amp;branch=feat%2Fcrud-deep-path-playground&amp;endpoint=projects.list">Playground · projects.list ↗</a><span>Public repos · No sign-in needed</span></div></section>
<div id="status" role="status" aria-live="polite"></div><section id="workspace" hidden><div class="repo-bar"><div><span class="eyebrow">REPOSITORY</span><h2 id="repo-name"></h2></div><div class="branch-control"><label for="branch">Branch</label><select id="branch"></select><button id="refresh" class="secondary">Refresh</button></div></div><div id="snapshot"></div><details id="issues" hidden><summary></summary><ul></ul></details>
<div class="reader"><aside><label class="eyebrow" for="search">API REFERENCE</label><input id="search" type="search" placeholder="Search endpoints…"><label class="sr-only" for="method">HTTP method</label><select id="method"><option value="">All methods</option></select><div class="navigation-settings">
  <div><label for="navigation-view">View</label><select id="navigation-view"><option value="list">List</option><option value="tree">Tree</option></select></div>
  <div id="tree-depth-setting" hidden><label for="tree-depth">Max tree layers</label><input id="tree-depth" type="number" min="1" max="12" step="1" value="2" title="Maximum visible folder levels (1–12)"></div>
</div><div id="count"></div><nav id="endpoints" aria-label="Endpoints"></nav></aside><article id="document"></article></div></section>
<section id="intro" class="intro"><div><span class="step">01 / CONNECT</span><h3>One link. Every endpoint.</h3><p>Discover SpecKub Markdown across your repository, wherever your team keeps it.</p></div><div><span class="step">02 / EXPLORE</span><h3>Follow the right branch.</h3><p>Read contracts, service relationships, and sequence diagrams for a specific revision.</p></div><div><span class="step">03 / SHARE</span><h3>Keep everyone in sync.</h3><p>Share a link to an endpoint. Your Markdown stays in Git, alongside the code.</p></div></section></main><footer><span>SpecKub / Open-source API documentation</span><span>Built for humans. Ready for agents.</span></footer>`;
function el<T extends HTMLElement = HTMLElement>(id: string) {
  return document.getElementById(id)! as T;
}
let repo: Repo | undefined,
  specs: Spec[] = [],
  sha = "",
  selected = "",
  controller = new AbortController(),
  generation = 0;
const params = new URLSearchParams(location.search);
const input = el<HTMLInputElement>("repo-input");
input.value = params.get("repo") ?? "";
function status(message: string, error = false) {
  el("status").textContent = message;
  el("status").className = error ? "error" : "loading";
}
function share() {
  if (!repo) return;
  const p = new URLSearchParams({
    repo: repo.provider && repo.provider !== "github" ? `https://${repo.provider === "gitlab" ? "gitlab.com" : "bitbucket.org"}/${repo.full}` : repo.full,
    branch: el<HTMLSelectElement>("branch").value,
  });
  if (selected) p.set("endpoint", selected);
  history.replaceState(null, "", `?${p}`);
}
function start() {
  controller.abort();
  controller = new AbortController();
  generation++;
  return controller.signal;
}
let availableBranches: string[] = [];
let activeBranch = "";
type LoadTarget = {
  repo: Repo;
  branches: string[];
  branch: string;
  selected: string;
  warning?: string;
};
function busy(value: boolean) {
  el<HTMLButtonElement>("refresh").disabled = value;
  el<HTMLFormElement>("repo-form").querySelector<HTMLButtonElement>(
    "button",
  )!.disabled = value;
}
async function connect() {
  const signal = start();
  busy(true);
  status("Opening repository…");
  try {
    const result = await openRepo(
      input.value,
      signal,
    );
    signal.throwIfAborted();
    const requested =
      result.repo.full === repo?.full && result.repo.provider === repo?.provider
        ? activeBranch
        : (params.get("repo") ? (() => { try { const p = parseRemote(params.get("repo")!); return p.full === result.repo.full && p.provider === (result.repo.provider ?? "github"); } catch { return false; } })() : false)
          ? params.get("branch")
          : null;
    const branch =
      requested && result.branches.includes(requested)
        ? requested
        : result.repo.defaultBranch;
    await readBranch({
      repo: result.repo,
      branches: result.branches,
      branch,
      selected:
        result.repo.full === repo?.full && result.repo.provider === repo?.provider
          ? selected
          : params.get("repo") === result.repo.full
            ? (params.get("endpoint") ?? "")
            : "",
      warning: result.warning,
    });
  } catch (error) {
    if (!signal.aborted)
      status(
        `${error instanceof Error ? error.message : "Unable to open repository."}${repo ? " Your previously loaded documentation is still available." : ""}`,
        true,
      );
  } finally {
    if (controller.signal === signal) busy(false);
  }
}
async function readBranch(target?: LoadTarget, refresh = false) {
  if (!target && !repo) return;
  const request = target ?? {
    repo: repo!,
    branches: availableBranches,
    branch: el<HTMLSelectElement>("branch").value,
    selected,
  };
  const signal = start();
  busy(true);
  status(`Loading ${request.branch}…`);
  try {
    const result = await loadBranch(
      request.repo,
      request.branch,
      signal,
      (t) => status(t),
      { refresh },
    );
    signal.throwIfAborted();
    // Commit the repository, branch, and snapshot together only after a successful read.
    repo = request.repo;
    availableBranches = request.branches;
    activeBranch = request.branch;
    specs = result.specs;
    const methodFilter = el<HTMLSelectElement>("method");
    const previousMethod = methodFilter.value;
    const methods = [...new Set(specs.map((spec) => spec.method))].sort();
    methodFilter.replaceChildren(
      new Option("All methods", ""),
      ...methods.map((method) => new Option(method, method)),
    );
    methodFilter.value = methods.some((method) => method === previousMethod)
      ? previousMethod
      : "";
    sha = result.sha;
    el("repo-name").textContent = repo.full;
    const branch = el<HTMLSelectElement>("branch");
    branch.replaceChildren(
      ...availableBranches.map((name) => new Option(name, name)),
    );
    branch.value = activeBranch;
    el("workspace").hidden = false;
    el("intro").hidden = true;
    document.body.classList.add("has-repo");
    el("snapshot").textContent =
      `${specs.length} endpoints · ${result.filesRead} Markdown files read · commit ${sha.slice(0, 7)} · branch ${activeBranch} · ${result.fromCache ? "cached, " : ""}checked ${new Date(result.checkedAt).toLocaleTimeString()}`;
    el("issues").hidden = !result.issues.length;
    if (result.issues.length) {
      el("issues").querySelector("summary")!.textContent =
        `${result.issues.length} discovery issues — results may be incomplete`;
      el("issues")
        .querySelector("ul")!
        .replaceChildren(
          ...result.issues.map((text) => {
            const li = document.createElement("li");
            li.textContent = text;
            return li;
          }),
        );
    }
    selected = specs.some((s) => s.id === request.selected)
      ? request.selected
      : (specs[0]?.id ?? "");
    const notice = result.warning || request.warning || "";
    status(notice);
    if (notice) el("status").className = "warning";
    share();
    renderList(true);
    renderDoc();
  } catch (error) {
    if (!signal.aborted) {
      el<HTMLSelectElement>("branch").value = activeBranch;
      status(
        `${error instanceof Error ? error.message : "Could not load branch."}${repo ? ` Still showing ${repo.full} on branch ${activeBranch}.` : ""}`,
        true,
      );
    }
  } finally {
    if (controller.signal === signal) busy(false);
  }
}
let preferences = loadNavigation();
const navigationView = el<HTMLSelectElement>("navigation-view");
const treeDepth = el<HTMLInputElement>("tree-depth");
navigationView.value = preferences.view;
treeDepth.value = String(preferences.depth);
function updateNavigation() {
  preferences = {
    view: navigationView.value === "tree" ? "tree" : "list",
    depth: Math.min(12, Math.max(1, Math.trunc(Number(treeDepth.value)) || 2)),
  };
  treeDepth.value = String(preferences.depth);
  saveNavigation(preferences);
  renderList(true);
}
const collapsedPaths = new Set<string>();
let treeFiltered = false;
function renderList(revealSelected = false) {
  el("tree-depth-setting").hidden = preferences.view !== "tree";
  const q = el<HTMLInputElement>("search").value.trim().toLowerCase();
  const method = el<HTMLSelectElement>("method").value;
  const filtered = specs.filter(
    (s) =>
      (!method || s.method === method) &&
      `${s.id} ${s.path} ${s.summary} ${s.body}`.toLowerCase().includes(q),
  );
  el("count").textContent = `${filtered.length} endpoints`;
  const nav = el("endpoints");
  nav.dataset.view = preferences.view;
  if (!treeFiltered) {
    for (const group of nav.querySelectorAll<HTMLDetailsElement>(
      "details[data-path]",
    )) {
      if (group.open) collapsedPaths.delete(group.dataset.path!);
      else collapsedPaths.add(group.dataset.path!);
    }
  }
  treeFiltered = Boolean(q || method);
  nav.replaceChildren();
  const selectedPath = specs.find((s) => s.id === selected)?.path;
  function renderEndpoint(s: Spec, container: HTMLElement, prefix = "") {
    const b = document.createElement("button");
    b.className = `endpoint ${s.id === selected ? "active" : ""}`;
    b.setAttribute("aria-current", s.id === selected ? "true" : "false");
    const badge = document.createElement("span");
    badge.className = `method ${s.method}`;
    badge.textContent = s.method;
    const path = document.createElement("strong");
    path.textContent = navigationLabel(s.path, prefix);
    const title = document.createElement("small");
    title.textContent = s.summary;
    b.append(badge, path, title);
    b.onclick = () => {
      selected = s.id;
      share();
      renderList(true);
      renderDoc();
    };
    b.title = `${s.method} ${s.path}`;
    b.setAttribute("aria-label", `${s.method} ${s.path} ${s.summary}`);
    container.append(b);
  }
  function renderBranch(
    branch: PathBranch<Spec>,
    container: HTMLElement,
    level = 0,
  ) {
    if (level >= preferences.depth) {
      for (const endpoint of branchEndpoints(branch))
        renderEndpoint(endpoint, container, branch.path);
      return;
    }
    for (const endpoint of branch.endpoints)
      renderEndpoint(endpoint, container, branch.path);
    for (const child of branch.children.values()) {
      if (!child.children.size) {
        for (const endpoint of child.endpoints)
          renderEndpoint(endpoint, container, branch.path);
        continue;
      }
      if (
        revealSelected &&
        (selectedPath === child.path ||
          selectedPath?.startsWith(child.path + "/"))
      ) {
        collapsedPaths.delete(child.path);
      }
      const group = document.createElement("details");
      group.className = "path-group";
      group.dataset.path = child.path;
      group.dataset.depth = String(level + 1);
      group.open = Boolean(q || method) || !collapsedPaths.has(child.path);
      const label = document.createElement("summary");
      label.className = "path-group-label";
      label.title = child.path;
      const segment = document.createElement("span");
      segment.className = "path-segment";
      segment.textContent = child.segment || "/";
      const count = document.createElement("span");
      count.className = "path-count";
      count.textContent = String(child.count);
      label.append(segment, count);
      const children = document.createElement("div");
      children.className = "path-children";
      renderBranch(child, children, level + 1);
      group.append(label, children);
      container.append(group);
    }
  }
  const tree = pathTree(filtered);
  if (preferences.view === "tree") renderBranch(tree, nav);
  else
    for (const endpoint of branchEndpoints(tree)) renderEndpoint(endpoint, nav);
  if (!filtered.length)
    el("endpoints").textContent = specs.length
      ? "No matching endpoints."
      : "No specs discovered.";
}
async function renderDoc() {
  const version = ++generation;
  const doc = el("document");
  const spec = specs.find((s) => s.id === selected);
  doc.replaceChildren();
  if (!spec || !repo) {
    doc.innerHTML =
      '<div class="empty"><span class="eyebrow">START WITH A SPEC</span><h2>No API specs on this branch yet.</h2><p>Add Markdown with <code>speckub: true</code> and valid SpecKub frontmatter anywhere in the repository. Templates and generated folders are excluded.</p><a href="https://github.com/ipondnakab/speckub" target="_blank" rel="noreferrer">Create your first spec ↗</a></div>';
    return;
  }
  const top = document.createElement("div");
  top.className = "doc-top";
  const identity = document.createElement("span");
  identity.className = "eyebrow";
  identity.textContent = spec.id;
  const copy = document.createElement("button");
  copy.className = "secondary";
  copy.textContent = "Copy link";
  copy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      copy.textContent = "Copied";
    } catch {
      copy.textContent = "Copy URL from address bar";
    }
  };
  top.append(identity, copy);
  const title = document.createElement("h2");
  title.textContent = spec.summary;
  const route = document.createElement("div");
  route.className = "route";
  const method = document.createElement("span");
  method.className = `method ${spec.method}`;
  method.textContent = spec.method;
  const path = document.createElement("code");
  path.textContent = spec.path;
  route.append(method, path);
  const file = document.createElement("a");
  file.href = sourceUrl(repo, sha, spec.file);
  file.textContent = `${spec.file} ↗`;
  file.target = "_blank";
  file.rel = "noreferrer";
  file.className = "file-link";
  const prose = document.createElement("div");
  prose.className = "prose";
  prose.innerHTML = renderMarkdown(spec.body, repo, sha, spec.file);
  doc.append(top, title, route, file, prose);
  const headings = [...prose.querySelectorAll<HTMLElement>("h1,h2,h3")];
  const toc = document.createElement("nav");
  toc.className = "toc";
  toc.setAttribute("aria-label", "On this page");
  const anchors = new Map<string, number>();
  headings.forEach((h) => {
    const base =
      (h.textContent ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "section";
    const n = anchors.get(base) ?? 0;
    anchors.set(base, n + 1);
    h.id = n ? `${base}-${n}` : base;
    const button = document.createElement("button");
    button.textContent = h.textContent;
    button.onclick = () =>
      h.scrollIntoView({ behavior: "smooth", block: "start" });
    toc.append(button);
  });
  if (headings.length) doc.insertBefore(toc, prose);
  if (spec.source?.length) {
    const sources = document.createElement("div");
    sources.className = "sources";
    const label = document.createElement("h3");
    label.textContent = "Source references";
    sources.append(label);
    for (const p of spec.source) {
      const a = document.createElement("a");
      a.href = sourceUrl(repo, sha, p);
      a.textContent = p + " ↗";
      a.target = "_blank";
      a.rel = "noreferrer";
      sources.append(a);
    }
    doc.append(sources);
  }
  const diagrams = [...prose.querySelectorAll<HTMLElement>(".mermaid-source")];
  if (!diagrams.length) return;
  try {
    const mermaid = await loadMermaid();
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "neutral",
      suppressErrorRendering: true,
      maxTextSize: 50000,
      flowchart: { htmlLabels: false },
      secure: [
        "securityLevel",
        "startOnLoad",
        "maxTextSize",
        "suppressErrorRendering",
      ],
    });
    for (let i = 0; i < diagrams.length; i++) {
      if (version !== generation) return;
      const block = diagrams[i];
      try {
        const result = await mermaid.render(
          `diagram-${version}-${i}`,
          block.textContent ?? "",
        );
        if (version !== generation) return;
        const view = document.createElement("div");
        view.className = "diagram";
        view.innerHTML = result.svg;
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        summary.textContent = "Diagram source";
        details.append(summary);
        block.replaceWith(view, details);
        details.append(block);
      } catch {
        const label = document.createElement("p");
        label.textContent =
          "Diagram could not be rendered. Source is shown below.";
        block.before(label);
      }
    }
  } catch {
    const label = document.createElement("p");
    label.textContent =
      "Diagram renderer unavailable. Sources are shown below.";
    prose.prepend(label);
  }
}
el("repo-form").onsubmit = (e) => {
  e.preventDefault();
  void connect();
};
el("branch").onchange = () => {
  void readBranch();
};
el("refresh").onclick = () => void readBranch(undefined, true);
navigationView.onchange = updateNavigation;
treeDepth.onchange = updateNavigation;
el("search").oninput = () => renderList();
el("method").onchange = () => renderList();
if (input.value) void connect();
