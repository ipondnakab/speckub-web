import { describe, expect, it } from "vitest";
import { renderGuide } from "./guide";

describe("bundled documentation rendering", () => {
  it("generates unique anchors and readable navigation from rich headings", () => {
    const result = renderGuide(
      "# Guide\n## **Setup** and `init`\n## Setup and init\n## Setup and init-1\n## 日本語",
    );
    expect(result.sections).toEqual([
      { id: "setup-and-init", title: "Setup and init" },
      { id: "setup-and-init-1", title: "Setup and init" },
      { id: "setup-and-init-1-1", title: "Setup and init-1" },
      { id: "section", title: "日本語" },
    ]);
    expect(result.html).toContain('<h2 id="setup-and-init-1-1">');
  });
  it("does not leak heading state between renders and keeps raw HTML inert", () => {
    const source =
      "## Setup\n<script>alert(1)</script>\n\n```text\n$skill Keep the entire prompt.\n```";
    expect(renderGuide(source)).toEqual(renderGuide(source));
    const result = renderGuide(source);
    expect(result.html).not.toContain("<script>");
    expect(result.html).toContain("&lt;script&gt;");
    expect(result.html).toContain('class="language-text"');
  });
});
