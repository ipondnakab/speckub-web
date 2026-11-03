import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Markdown } from "../app/components/markdown";
import { parseMarkdown } from "./markdown";
import { parseGuide } from "./guide";

const repo = { owner: "a", name: "b", full: "a/b", defaultBranch: "main" };

describe("React Markdown components", () => {
  it("keeps repository HTML, script links and remote images inert while pinning source links", () => {
    const { tokens } = parseMarkdown(
      "<script>alert(1)</script>\n\n[x](javascript:alert(1))\n\n![tracking](https://evil.com/pixel)\n\n[code](../api.ts)",
      repo,
      "commit-123",
      "docs/spec.md",
    );
    const html = renderToStaticMarkup(createElement(Markdown, { tokens }));
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<img");
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain("[Image: tracking]");
    expect(html).toContain(
      'href="https://github.com/a/b/blob/commit-123/api.ts"',
    );
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("renders nested lists, aligned accessible tables, unique headings and copyable code without JavaScript", () => {
    const { tokens, sections } = parseGuide(
      "## Setup\n## Setup\n\n- **One**\n  - `Nested`\n\n| Name | Value |\n| :--- | ---: |\n| a | b |\n\n```text\n$skill Keep this exact prompt.\n```",
    );
    const html = renderToStaticMarkup(
      createElement(Markdown, { tokens, codeExamples: true }),
    );
    expect(sections.map((section) => section.id)).toEqual(["setup", "setup-1"]);
    expect(html).toContain('<h2 id="setup-1">');
    expect(html).toContain("<strong>One</strong>");
    expect(html).toContain("<code>Nested</code>");
    expect(html).toContain(
      'role="region" aria-label="Scrollable data table" tabindex="0"',
    );
    expect(html).toContain('style="text-align:right"');
    expect(html).toContain("code-block--prompt");
    expect(html).toContain('aria-label="Copy code example"');
    expect(html).toContain("$skill Keep this exact prompt.\n");
  });

  it("assigns collision-free document headings and renders diagram sources before hydration", () => {
    const { tokens, headings } = parseMarkdown(
      "## Contract\n## Contract\n## Contract-1\n\n```mermaid\nsequenceDiagram\nClient->>API: Get user\n```",
      repo,
      "sha",
      "api.md",
    );
    expect(headings.map((heading) => heading.id)).toEqual([
      "contract",
      "contract-1",
      "contract-1-1",
    ]);
    const html = renderToStaticMarkup(createElement(Markdown, { tokens }));
    expect(html).toContain('class="mermaid-source"');
    expect(html).toContain("Client-&gt;&gt;API: Get user");
  });
});
