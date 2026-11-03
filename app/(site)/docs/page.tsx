import Link from "next/link";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseGuide } from "../../../src/guide";
import { GuideNavigation } from "../../components/guide-navigation";
import { Markdown } from "../../components/markdown";

export const metadata = {
  title: "SpecKub Docs — From source code to API documentation.",
  description:
    "Learn how to install SpecKub, scan APIs, map relationships, create custom Markdown specs, validate references, and share a standalone reader.",
};

export default async function Docs() {
  const guide = await readFile(join(process.cwd(), "content/guide.md"), "utf8");
  const { tokens, sections } = parseGuide(guide);
  return (
    <>
      <main id="main" className="docs-layout">
        <aside className="docs-sidebar">
          <p className="site-eyebrow">DOCUMENTATION</p>
          <GuideNavigation sections={sections} />
          <Link className="docs-explorer-link" href="/explorer">
            Open the explorer ↗
          </Link>
        </aside>
        <article className="docs-content">
          <p className="site-eyebrow">THE SPECKUB GUIDE</p>
          <Markdown tokens={tokens} codeExamples />
        </article>
      </main>
    </>
  );
}
