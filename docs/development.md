# Website development conventions

## Page and content boundaries

- `src/entry.ts` preserves legacy repository query links and selects the homepage or reader. `explorer.html` and `docs.html` are explicit build entrypoints.
- `src/home.ts` composes the introduction from readable markup in `src/home.html`; `content/guide.md` owns user documentation. Keep shell commands and agent prompts in separate fenced blocks with `sh` and `text` language labels.
- `src/guide.ts` renders bundled guide content. Keep parser state local to each call and produce stable, unique anchors. Plain navigation labels are inserted with `textContent`.
- `src/site.ts` owns the shared logo, page chrome, and code-example enhancement. Keep copy controls outside scrollable content. Enhancement must be safe to call twice, and clipboard failure must leave an accessible manual-copy path.
- `src/main.ts` owns reader interactions. GitHub loading/caching, Markdown rendering, discovery, and navigation preferences remain in their existing focused modules. Do not add repository network calls to overview or docs.

## Documentation examples

Recommend global CLI installation for people who need a documentation tool. Show project-local installation as an optional way for a team to manage the dependency. Use plain Yarn commands without a registry override. Do not mix global `speckub` and local `npx speckub` commands without explaining the difference.

Use agent prompts in `text` fences so they wrap. Preserve whitespace for shell commands, YAML, JSON, and Markdown. Copy the original code text, without toolbar labels or UI feedback. Keep user-visible commands aligned with the released CLI and distinguish structural checks from AI/source verification.

## Browser and data handling

Use DOM APIs for variable labels and controls. Raw HTML stays disabled in Markdown. Do not execute repository content. Reader downloads and cache behavior must continue to respect abort signals, source commit identity, and GitHub quotas. Share branding assets rather than duplicating SVG markup.

Use native buttons, links, inputs, and selects with visible focus. Announce asynchronous copy feedback. Prompts must remain readable on narrow screens, and horizontally scrolling code must not move its controls. Handle unknown/malformed URL anchors without throwing.

## Validation

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e` before review. Test user-visible behavior and meaningful state transitions: heading collisions, repeated rendering, legacy links, code copying, denied clipboard access, and filtering. Capture desktop/mobile views for visual changes. A unit test alone does not verify layout.

Avoid sweeping unrelated refactors or new dependencies for small presentation changes. Keep local lockfile/package-manager choices separate from a website content PR unless dependency management is explicitly in scope.
