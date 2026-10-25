import "./site.css";
import MarkdownIt from "markdown-it";
import guide from "../content/guide.md?raw";
import { header, footer, installCopyButtons } from "./site";
const md = new MarkdownIt({ html: false });
const ids = new Map<string, number>();
const sections: { id: string; title: string }[] = [];
const slug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
md.renderer.rules.heading_open = (tokens, index, options, _env, self) => {
  const title = tokens[index + 1].content;
  const base = slug(title);
  const count = ids.get(base) ?? 0;
  ids.set(base, count + 1);
  const id = count ? `${base}-${count}` : base;
  tokens[index].attrSet("id", id);
  if (tokens[index].tag === "h2") sections.push({ id, title });
  return self.renderToken(tokens, index, options);
};
const content = md.render(guide);
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `${header("docs")}<main id="main" class="docs-layout"><aside class="docs-sidebar"><p class="site-eyebrow">DOCUMENTATION</p><nav aria-label="Documentation sections">${sections.map(({ id, title }) => `<a href="#${id}">${md.utils.escapeHtml(title)}</a>`).join("")}</nav><a class="docs-explorer-link" href="/explorer.html">Open the explorer ↗</a></aside><article class="docs-content"><p class="site-eyebrow">THE SPECKUB GUIDE</p>${content}</article></main>${footer}`;
installCopyButtons(app);
const links = [
  ...app.querySelectorAll<HTMLAnchorElement>(".docs-sidebar nav a"),
];
const headings = [...app.querySelectorAll<HTMLElement>(".docs-content h2")];
function markCurrent() {
  const heading =
    headings
      .filter((element) => element.getBoundingClientRect().top < 140)
      .at(-1) ?? headings[0];
  for (const link of links) {
    if (link.hash === `#${heading?.id}`)
      link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
}
window.addEventListener("scroll", markCurrent, { passive: true });
markCurrent();
if (location.hash)
  document
    .getElementById(decodeURIComponent(location.hash.slice(1)))
    ?.scrollIntoView();
