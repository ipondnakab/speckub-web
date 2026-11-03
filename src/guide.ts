import MarkdownIt from "markdown-it";
import { assignHeadings } from "./markdown-headings";

export type GuideSection = { id: string; title: string };
const md = new MarkdownIt({ html: false });

export function parseGuide(source: string) {
  const tokens = md.parse(source, {});
  const sections: GuideSection[] = assignHeadings(tokens)
    .filter(({ level }) => level === 2)
    .map(({ id, title }) => ({ id, title }));
  return { tokens, sections };
}
