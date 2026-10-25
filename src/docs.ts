import "./site.css";
import { renderGuide } from "./guide";
import guide from "../content/guide.md?raw";
import { header, footer, installCopyButtons } from "./site";
const { html: content, sections } = renderGuide(guide);
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `${header("docs")}<main id="main" class="docs-layout"><aside class="docs-sidebar"><p class="site-eyebrow">DOCUMENTATION</p><nav aria-label="Documentation sections"></nav><a class="docs-explorer-link" href="/explorer.html">Open the explorer ↗</a></aside><article class="docs-content"><p class="site-eyebrow">THE SPECKUB GUIDE</p>${content}</article></main>${footer}`;
const navigation = app.querySelector<HTMLElement>(".docs-sidebar nav")!;
for (const { id, title } of sections) {
  const link = document.createElement("a");
  link.href = `#${id}`;
  link.textContent = title;
  navigation.append(link);
}
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
let scheduled = false;
window.addEventListener(
  "scroll",
  () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      markCurrent();
      scheduled = false;
    });
  },
  { passive: true },
);
markCurrent();
if (location.hash) {
  // Ignore malformed URL fragments instead of breaking the entire guide.
  try {
    document
      .getElementById(decodeURIComponent(location.hash.slice(1)))
      ?.scrollIntoView();
  } catch {
    /* Unknown or malformed fragments leave the document at its current position. */
  }
}
