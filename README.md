# SpecKub — introduction, docs, and explorer

[Open the reader](https://speckub-web.vercel.app) · [Try the SpecKub repository](https://speckub-web.vercel.app/explorer?repo=ipondnakab%2Fspeckub&branch=feat%2Fcrud-deep-path-playground&endpoint=projects.list)

A Next.js App Router website for [SpecKub](https://github.com/ipondnakab/speckub), with a product introduction, practical documentation, and an API reference explorer.

## Site pages

- `/`: introduction, workflow, use cases, and quickstart.
- `/docs` (legacy `/docs.html` redirects here): complete user guide: setup, agent skills, templates, metadata, JSON examples, validation, private/public readers, CLI reference, and troubleshooting.
- `/explorer` (legacy `/explorer.html` redirects here): the public GitHub repository reader.

Existing `/?repo=owner/repo&branch=main&endpoint=ID` links redirect to the explorer with all query parameters preserved. The homepage and docs render their bundled content on the server; viewing them does not call GitHub APIs. Edit `app/components/home.tsx` for the introduction and `content/guide.md` for the guide. The guide is prerendered at build time with heading anchors and section navigation; no external CMS is required. All page shells and reader controls use React components under one App Router root layout. Internal links use Next.js navigation; page styles use CSS Modules. Markdown is parsed into React elements, including accessible tables, copyable code examples, and diagram components.

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

Requires Node.js 24.x.

```sh
yarn install --frozen-lockfile
yarn dev
```

```sh
yarn lint
yarn typecheck
yarn test
yarn build
yarn start

# Browser integration tests (install browser once)
yarn playwright install chromium
yarn test:e2e
```

`yarn dev` serves at `http://127.0.0.1:3000`. `yarn start` and `yarn preview` serve the production build; run `yarn build` first. Playwright tests use that production build. `predev` and `prebuild` copy the installed Mermaid browser bundle to `public/vendor/`; it is generated locally and is not committed.

## Deploy to Vercel

Import `ipondnakab/speckub-web` in Vercel. Use the **Next.js** preset and repository root. Use `yarn install --frozen-lockfile` to install and `yarn build` to build; the tracked `vercel.json` explicitly sets the output directory to `.next`, overriding any saved Vite `dist` setting. Set the project Node.js version to **24.x**, matching `package.json` and CI. No environment variables or secrets are required at this stage. Connect the GitHub repository for automatic deployments and PR previews.

Next.js handles routing, server rendering, legacy URL redirects, and basic security headers. The explorer still requests public GitHub data directly from the browser; authentication and private repository creation are a separate next step. No GitHub tokens are stored. Mermaid is self-hosted and loaded through `next/script`; reader query parameters use `next/navigation`. A Node.js runtime is required; this project does not use Next.js static export.

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
