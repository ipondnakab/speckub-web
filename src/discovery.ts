import { parse } from "yaml";
import { endpointSchema, type EndpointSpec } from "./contract";
export type Spec = EndpointSpec & { file: string; body: string };
export type Discovery = { spec?: Spec; error?: string };
const excluded = new Set([
  ".git",
  "node_modules",
  ".pnpm-store",
  "dist",
  "build",
  "coverage",
  ".next",
  ".nuxt",
  ".turbo",
  ".cache",
  "vendor",
  ".venv",
  "venv",
  ".speckub",
  ".agents",
  ".claude",
  ".cursor",
  ".codex",
]);
export function eligible(path: string): boolean {
  return (
    /\.md$/i.test(path) &&
    !path
      .split("/")
      .slice(0, -1)
      .some((p) => excluded.has(p))
  );
}
export function discover(markdown: string, file: string): Discovery {
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(markdown);
  if (!/^---\r?\n/.test(markdown)) return {};
  const header = match?.[1] ?? markdown.slice(markdown.indexOf("\n") + 1);
  const candidate =
    /^(?:speckub|["']speckub["'])\s*:/m.test(header) ||
    (/^specVersion\s*:/m.test(header) && /^kind\s*:\s*http\s*$/m.test(header));
  try {
    if (!match) {
      if (candidate) return { error: "Unclosed YAML frontmatter" };
      return {};
    }
    const data = parse(header, { maxAliasCount: 50 });
    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data) ||
      data.speckub === false
    )
      return {};
    if (
      !Object.hasOwn(data, "speckub") &&
      !(Object.hasOwn(data, "specVersion") && data.kind === "http")
    )
      return {};
    const result = endpointSchema.safeParse(data);
    if (!result.success)
      return {
        error: result.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      };
    return {
      spec: { ...result.data, file, body: markdown.slice(match[0].length) },
    };
  } catch {
    return candidate ? { error: "Invalid YAML frontmatter" } : {};
  }
}
export function collect(files: { file: string; text: string }[]): {
  specs: Spec[];
  issues: string[];
} {
  const specs: Spec[] = [];
  const issues: string[] = [];
  const seen = new Set<string>();
  for (const { file, text } of [...files].sort((a, b) =>
    a.file.localeCompare(b.file),
  )) {
    const { spec, error } = discover(text, file);
    if (error) issues.push(`${file}: ${error}`);
    if (spec) {
      if (seen.has(spec.id))
        issues.push(`${file}: duplicate endpoint ID ${spec.id}`);
      else {
        seen.add(spec.id);
        specs.push(spec);
      }
    }
  }
  return { specs, issues };
}
