import type Token from "markdown-it/lib/token.mjs";

export type MarkdownHeading = { id: string; title: string; level: number };

/** Assign stable, collision-free anchors without mutating rendered DOM. */
export function assignHeadings(tokens: Token[]): MarkdownHeading[] {
  const used = new Set<string>();
  const headings: MarkdownHeading[] = [];
  tokens.forEach((token, index) => {
    if (token.type !== "heading_open") return;
    const inline = tokens[index + 1];
    const title =
      inline.children
        ?.filter(
          (child) => child.type === "text" || child.type === "code_inline",
        )
        .map((child) => child.content)
        .join("") ?? inline.content;
    const base =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "section";
    let id = base;
    let suffix = 1;
    while (used.has(id)) id = `${base}-${suffix++}`;
    used.add(id);
    token.attrSet("id", id);
    headings.push({ id, title, level: Number(token.tag.slice(1)) });
  });
  return headings;
}
