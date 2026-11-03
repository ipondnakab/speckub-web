# Website development conventions

## Page and content boundaries

- `app/(site)/page.tsx` renders the homepage and redirects legacy repository query links to the explorer, preserving query parameters. `app/(site)/docs/page.tsx` and `app/(reader)/explorer/page.tsx` own the other routes. `next.config.ts` preserves `/docs.html` and `/explorer.html` through permanent redirects to the canonical Next.js routes.
- `app/components/home.tsx` owns the homepage JSX; `content/guide.md` owns user documentation. Both render on the server. `app/components/code-block.tsx` handles copy controls, and `guide-navigation.tsx` tracks the current guide section. Keep shell commands and agent prompts in separate fenced blocks with `sh` and `text` language labels.
- `src/guide.ts` parses bundled guide content; `src/markdown.ts` parses repository Markdown and pins relative links to the loaded commit. `src/markdown-headings.ts` assigns unique anchors before rendering. `app/components/markdown.tsx` maps these tokens to React elements, including accessible tables, code blocks, and Mermaid diagrams. Keep raw HTML and remote images inert.
- `app/components/site-chrome.tsx` owns the shared logo, header, and footers. All pages use the same header component and `src/header.css` styles. Keep copy controls outside scrollable content; clipboard failure must leave an accessible manual-copy path.
- `app/layout.tsx` owns the single root document and metadata. The `(site)` and `(reader)` nested layouts compose the shared header/footer and scoped CSS Modules. Internal navigation uses `next/link`; `site-header.tsx` derives the active destination from `usePathname`. Scope page styles with zero-specificity `:where(.page)` so shared header/table styles retain their original cascade.
- `app/components/explorer.tsx` composes the reader. `reader/use-reader.ts` owns abortable requests and commits a successful repository/branch/snapshot together; failures retain the displayed identity. `reader/endpoint-navigation.tsx` owns the list/tree controls, and `reader/spec-document.tsx` renders the selected spec. The reader observes URL changes through `useSearchParams` and writes share URLs with `useRouter`. `reader/use-navigation-preferences.ts` subscribes to browser navigation preferences with `useSyncExternalStore`, with a memory fallback if storage is unavailable. GitHub loading/caching and discovery remain in focused `src/` modules. Do not add repository network calls to overview or docs.

## Documentation examples

Recommend global CLI installation for people who need a documentation tool. Show project-local installation as an optional way for a team to manage the dependency. Use plain Yarn commands without a registry override. Do not mix global `speckub` and local `npx speckub` commands without explaining the difference.

Use agent prompts in `text` fences so they wrap. Preserve whitespace for shell commands, YAML, JSON, and Markdown. Copy the original code text, without toolbar labels or UI feedback. Keep user-visible commands aligned with the released CLI and distinguish structural checks from AI/source verification.

## Browser and data handling

Render labels and controls through JSX and React state. Use DOM APIs only for browser effects such as scrolling, clipboard selection, and the Mermaid library. Load Mermaid with `next/script`; keep the only raw markup insertion limited to its strict-mode SVG output. Raw HTML stays disabled in Markdown. Do not execute repository content. Reader downloads and cache behavior must continue to respect abort signals, source commit identity, and GitHub quotas. Share branding assets rather than duplicating SVG markup.

Use native buttons, links, inputs, and selects with visible focus. Announce asynchronous copy feedback. Prompts must remain readable on narrow screens, and horizontally scrolling code must not move its controls. Handle unknown/malformed URL anchors without throwing.

## Validation

Run `yarn lint`, `yarn typecheck`, `yarn test`, `yarn build`, and `yarn test:e2e` before review. Browser tests start the production build on port 3000. Lint uses the Next.js Core Web Vitals and TypeScript configurations. Vite remains a development dependency for Vitest only. Test user-visible behavior and meaningful state transitions: heading collisions, repeated rendering, legacy links, code copying, denied clipboard access, and filtering. Capture desktop/mobile views for visual changes. A unit test alone does not verify layout.

Avoid sweeping unrelated refactors or new dependencies for small presentation changes. Keep local lockfile/package-manager choices separate from a website content PR unless dependency management is explicitly in scope.
