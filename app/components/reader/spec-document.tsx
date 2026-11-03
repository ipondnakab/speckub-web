"use client";

import { useMemo, useState } from "react";
import type { Spec } from "../../../src/discovery";
import { sourceUrl } from "../../../src/github";
import { parseMarkdown } from "../../../src/markdown";
import type { ReaderSnapshot } from "./use-reader";
import { Markdown } from "../markdown";

export function SpecDocument({
  snapshot,
  spec,
}: {
  snapshot: ReaderSnapshot;
  spec?: Spec;
}) {
  const [copyLabel, setCopyLabel] = useState("Copy link");
  const model = useMemo(
    () =>
      spec
        ? parseMarkdown(spec.body, snapshot.repo, snapshot.sha, spec.file)
        : null,
    [spec, snapshot.repo, snapshot.sha],
  );
  if (!spec || !model)
    return (
      <article id="document">
        <div className="empty">
          <span className="eyebrow">START WITH A SPEC</span>
          <h2>No API specs on this branch yet.</h2>
          <p>
            Add Markdown with <code>speckub: true</code> and valid SpecKub
            frontmatter anywhere in the repository. Templates and generated
            folders are excluded.
          </p>
          <a
            href="https://github.com/ipondnakab/speckub"
            target="_blank"
            rel="noreferrer"
          >
            Create your first spec ↗
          </a>
        </div>
      </article>
    );
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(location.href);
      setCopyLabel("Copied");
    } catch {
      setCopyLabel("Copy URL from address bar");
    }
  }
  return (
    <article id="document">
      <div className="doc-top">
        <span className="eyebrow">{spec.id}</span>
        <button className="secondary" type="button" onClick={copyLink}>
          {copyLabel}
        </button>
      </div>
      <h2>{spec.summary}</h2>
      <div className="route">
        <span className={`method ${spec.method}`}>{spec.method}</span>
        <code>{spec.path}</code>
      </div>
      <a
        className="file-link"
        href={sourceUrl(snapshot.repo, snapshot.sha, spec.file)}
        target="_blank"
        rel="noreferrer"
      >
        {spec.file} ↗
      </a>
      {model.headings.length > 0 && (
        <nav className="toc" aria-label="On this page">
          {model.headings.map(({ id, title }) => (
            <button
              key={id}
              type="button"
              onClick={() =>
                document
                  .getElementById(id)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            >
              {title}
            </button>
          ))}
        </nav>
      )}
      <div className="prose">
        <Markdown tokens={model.tokens} />
      </div>
      {Boolean(spec.source?.length) && (
        <div className="sources">
          <h3>Source references</h3>
          {spec.source!.map((path, index) => (
            <a
              key={`${path}-${index}`}
              href={sourceUrl(snapshot.repo, snapshot.sha, path)}
              target="_blank"
              rel="noreferrer"
            >
              {path} ↗
            </a>
          ))}
        </div>
      )}
    </article>
  );
}
