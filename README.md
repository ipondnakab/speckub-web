# SpecKub — introduction, docs, and explorer

[Open the reader](https://speckub-web.vercel.app) · [Try the SpecKub repository](https://speckub-web.vercel.app/?repo=ipondnakab%2Fspeckub)

The public website for [SpecKub](https://github.com/ipondnakab/speckub), with a product introduction, practical documentation, and an API reference explorer.

## Site pages

- `/`: introduction, workflow, use cases, and quickstart.
- `/docs.html`: complete user guide: setup, agent skills, templates, metadata, JSON examples, validation, private/public readers, CLI reference, and troubleshooting.
- `/explorer.html`: the public GitHub repository reader.

Existing `/?repo=owner/repo&branch=main&endpoint=ID` links continue to open the reader. Introduction and docs are bundled static content; viewing them does not call GitHub APIs. Edit `content/guide.md` to update the guide. Heading anchors and the section navigation are generated at build/runtime from this bundled Markdown; no external CMS is required.

Paste a public GitHub repository URL, choose a branch, and browse its Markdown API specifications. Specs remain in their original repository; no upload or account is required.

## User flow

1. Open the website and enter `owner/repository` or `https://github.com/owner/repository`.
2. The default branch opens automatically. Select another branch to inspect its specs.
3. Search by endpoint ID, route, summary, or document contents; filter by HTTP method.
4. Read custom sections, tables, and Mermaid diagrams. Source links point to the exact loaded commit.
5. Click **Copy link** to share the repository, branch, and selected endpoint. Shared links follow the branch when reopened; source links are pinned to the loaded commit.

Use **View** in the sidebar to switch between **List** (default) and **Tree**.
Tree view starts at **2** folder layers. Set **Max tree layers** to **1–12**;
deeper routes remain visible as entries under the last folder. Long labels
abbreviate middle segments while preserving the full path in the document,
accessible name, and tooltip. Filters and selection work in either mode.
View and depth are saved in this browser when storage is available; denied or
malformed storage falls back to List with a tree depth of 2.

The reader does not generate API documentation. Use SpecKub's agent skills to scan APIs and create Markdown first. It works with documented APIs in any framework/language.

## Discovery and custom templates

Eligible `.md` files are read throughout the selected branch, including nested service directories. A document is a candidate when its YAML frontmatter contains `speckub` or legacy `specVersion` plus `kind: http`.

```yaml
---
speckub: true
specVersion: 1
id: users.read
kind: http
method: GET
path: /users/{id}
summary: Read a user
source:
  - api/users.ts
---
```

The Markdown body may use any custom headings, order, tables, code examples, and Mermaid diagrams. `speckub: false` opts templates/examples out. Dependencies, build outputs, `.speckub`, and agent configuration directories are excluded, matching SpecKub 0.1.3. Symlinks and submodules are not followed.

Invalid candidates, duplicate IDs, failed downloads, and oversized files are reported visibly; the first duplicate by sorted file path is retained. Ordinary Markdown is ignored. Structural validation does not prove that the implementation matches a spec.

See [development conventions](docs/development.md) for page boundaries, documentation examples, accessibility, and validation patterns.

## Local development

Requires Node.js 22.12+.

```sh
npm ci
npm run dev
```

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run preview

# Browser integration tests (install browser once)
npx playwright install chromium
npm run test:e2e
```

## Deploy to Vercel

Import `ipondnakab/speckub-web` in Vercel. Use the **Vite** preset, repository root, build command `npm run build`, output `dist`. No environment variables or secrets are required. Connect the GitHub repository for automatic deployments and PR previews.

The application is static. Requests go directly from the browser to GitHub; there is no server proxy and no stored GitHub token. The Vercel config adds basic security headers. Query parameters support deep links without SPA path rewrites.

## Limits and privacy

- Public GitHub repositories only. Do not enter credentials or private repository tokens.
- GitHub's unauthenticated API quota applies (typically 60 requests/hour/IP). Branch lists paginate up to 1,000 branches.
- Up to 500 eligible Markdown files, 500 KB per file, and a 20 MB download budget. Six concurrent Markdown reads.
- Repository/branch lists are cached for 5 minutes; branch-to-commit checks for 1 minute; immutable commit snapshots for up to 24 hours. **Refresh** rechecks the branch without re-downloading unchanged successful snapshots.
- A bounded browser cache survives reloads (20 entries, 2,000,000 serialized characters total, 1,000,000 per entry). Larger snapshots may not fit. Storage denial/corruption falls back to memory/network behavior.
- During quota errors or temporary network/server failures, saved data may be shown with its timestamp and a warning that it can be out of date. Failed repo/branch loads keep the previous document and its original identity visible. Permission/404 errors are not silently treated as successful cached reads.
- Rate-limit responses honor GitHub's reset/Retry-After headers and prevent further API requests during cooldown. Caching reduces repeated requests; it does not raise the anonymous quota. A first uncached visit can still require waiting until reset.
- Truncated GitHub trees are rejected rather than silently presented as complete.
- Remote images and raw HTML are disabled. Mermaid uses strict security mode and a text size limit; unsupported diagrams retain their source.
- Google Fonts is used for typography with system fallbacks. The app fetches GitHub metadata and raw files, but never executes repository code.
- The browser contract is adapted from `@speckub/schema@0.1.3` to avoid Node-only parsing dependencies. Tests compare behavior with the released package.

Apache-2.0. Contract derived from SpecKub, copyright its contributors.
