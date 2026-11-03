import { mkdir, copyFile } from "node:fs/promises";
import { createRequire } from "node:module";

// Serve the packaged browser build locally without Vite-specific URL imports.
const require = createRequire(import.meta.url);
const target = new URL("../public/vendor/", import.meta.url);
await mkdir(target, { recursive: true });
await copyFile(
  require.resolve("@mermaid-js/tiny/dist/mermaid.tiny.js"),
  new URL("mermaid.tiny.js", target),
);
