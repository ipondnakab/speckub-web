import { describe, expect, it } from "vitest";
import { parseGuide } from "./guide";

describe("bundled documentation rendering", () => {
  it("generates unique anchors and readable navigation from rich headings", () => {
    const result = parseGuide(
      "# Guide\n## **Setup** and `init`\n## Setup and init\n## Setup and init-1\n## 日本語",
    );
    expect(result.sections).toEqual([
      { id: "setup-and-init", title: "Setup and init" },
      { id: "setup-and-init-1", title: "Setup and init" },
      { id: "setup-and-init-1-1", title: "Setup and init-1" },
      { id: "section", title: "日本語" },
    ]);
    expect(
      result.tokens
        .filter((token) => token.type === "heading_open")
        .map((token) => token.attrGet("id")),
    ).toContain("setup-and-init-1-1");
  });
  it("does not leak heading state between renders and keeps raw HTML inert", () => {
    const source =
      "## Setup\n<script>alert(1)</script>\n\n```text\n$skill Keep the entire prompt.\n```";
    expect(parseGuide(source)).toEqual(parseGuide(source));
    const result = parseGuide(source);
    expect(result.tokens.some((token) => token.type.startsWith("html"))).toBe(
      false,
    );
    expect(result.tokens.find((token) => token.type === "fence")?.info).toBe(
      "text",
    );
    expect(result.tokens.find((token) => token.type === "fence")?.content).toBe(
      "$skill Keep the entire prompt.\n",
    );
  });
});
