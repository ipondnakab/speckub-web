import MarkdownIt from "markdown-it";

export type GuideSection = { id: string; title: string };

/** Render bundled guide content with deterministic, unique heading anchors. */
export function renderGuide(source: string): {
  html: string;
  sections: GuideSection[];
} {
  const md = new MarkdownIt({ html: false });
  const used = new Set<string>();
  const sections: GuideSection[] = [];
  md.renderer.rules.heading_open = (tokens, index, options, _env, self) => {
    const inline = tokens[index + 1];
    const title =
      inline.children
        ?.filter(
          (token) => token.type === "text" || token.type === "code_inline",
        )
        .map((token) => token.content)
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
    tokens[index].attrSet("id", id);
    if (tokens[index].tag === "h2") sections.push({ id, title });
    return self.renderToken(tokens, index, options);
  };
  return { html: md.render(source), sections };
}
