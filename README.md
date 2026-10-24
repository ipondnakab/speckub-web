# SpecKub Web

[Open the reader](https://speckub-web.vercel.app) · [Try the SpecKub repository](https://speckub-web.vercel.app/?repo=ipondnakab%2Fspeckub)

A public API reference reader for [SpecKub](https://github.com/ipondnakab/speckub).

Paste a public GitHub repository URL, choose a branch, and browse its Markdown API specifications. Specs remain in their original repository; no upload or account is required.

## User flow

1. Open the website and enter `owner/repository` or `https://github.com/owner/repository`.
2. The default branch opens automatically. Select another branch to inspect its specs.
3. Search by endpoint ID, route, summary, or document contents; filter by HTTP method.
4. Read custom sections, tables, and Mermaid diagrams. Source links point to the exact loaded commit.
5. Click **Copy link** to share the repository, branch, and selected endpoint. Shared links follow the branch when reopened; source links are pinned to the loaded commit.

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
- Up to 500 eligible Markdown files, 500 KB per file, and a 20 MB download budget. Six concurrent reads; up to five commit snapshots cached in memory.
- Truncated GitHub trees are rejected rather than silently presented as complete.
- Remote images and raw HTML are disabled. Mermaid uses strict security mode and a text size limit; unsupported diagrams retain their source.
- Google Fonts is used for typography with system fallbacks. The app fetches GitHub metadata and raw files, but never executes repository code.
- The browser contract is adapted from `@speckub/schema@0.1.3` to avoid Node-only parsing dependencies. Tests compare behavior with the released package.

Apache-2.0. Contract derived from SpecKub, copyright its contributors.
