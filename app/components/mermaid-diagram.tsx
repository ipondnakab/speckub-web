"use client";

import Script from "next/script";
import { useEffect, useId, useState } from "react";
import { getMermaid } from "../../src/mermaid";

export function MermaidDiagram({ source }: { source: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [result, setResult] = useState<{
    source: string;
    svg?: string;
    error?: string;
  }>();
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    async function render() {
      try {
        const { svg } = await getMermaid().render(`diagram-${id}`, source);
        if (!cancelled) setResult({ source, svg });
      } catch {
        if (!cancelled)
          setResult({
            source,
            error: "Diagram could not be rendered. Source is shown below.",
          });
      }
    }
    void render();
    return () => {
      cancelled = true;
    };
  }, [source, id, ready]);
  const current = result?.source === source ? result : undefined;
  const code = <pre className="mermaid-source">{source}</pre>;
  return (
    <>
      <Script
        id="speckub-mermaid"
        src="/vendor/mermaid.tiny.js"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
        onError={() => setLoadFailed(true)}
      />
      {current?.svg ? (
        <>
          {/* Mermaid produces sanitized SVG in strict security mode. */}
          <div
            className="diagram"
            dangerouslySetInnerHTML={{ __html: current.svg }}
          />
          <details>
            <summary>Diagram source</summary>
            {code}
          </details>
        </>
      ) : (
        <>
          {loadFailed ? (
            <p>Diagram renderer unavailable. Sources are shown below.</p>
          ) : (
            current?.error && <p>{current.error}</p>
          )}
          {code}
        </>
      )}
    </>
  );
}
