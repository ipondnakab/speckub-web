import { assignHeadings } from "./markdown-headings";
import MarkdownIt from "markdown-it";
import type { Repo } from "./github";
import { sourceUrl } from "./github";
const md = new MarkdownIt({ html: false, linkify: false });
export function parseMarkdown(
  body: string,
  repo: Repo,
  sha: string,
  file: string,
) {
  const tokens = md.parse(body, {});
  for (const block of tokens) {
    for (const token of block.children ?? []) {
      if (token.type !== "link_open") continue;
      const href = token.attrGet("href") ?? "";
      if (href && !/^(?:https?:|mailto:|#)/i.test(href)) {
        const parts = file.split("/");
        parts.pop();
        for (const part of href.split("/")) {
          if (part === "..") parts.pop();
          else if (part !== ".") parts.push(part);
        }
        token.attrSet("href", sourceUrl(repo, sha, parts.join("/")));
      }
      token.attrSet("rel", "noopener noreferrer");
      if (!href.startsWith("#")) token.attrSet("target", "_blank");
    }
  }
  return {
    tokens,
    headings: assignHeadings(tokens).filter(({ level }) => level <= 3),
  };
}
