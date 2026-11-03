"use client";

import { useEffect, useRef, useState } from "react";

export function CodeBlock({
  code,
  language = "code",
}: {
  code: string;
  language?: string;
}) {
  const element = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [state, setState] = useState<"idle" | "copying" | "copied" | "denied">(
    "idle",
  );
  useEffect(() => () => clearTimeout(timer.current), []);
  const label =
    (
      {
        text: "Agent chat",
        sh: "Terminal",
        bash: "Terminal",
        json: "JSON",
        yaml: "YAML",
        markdown: "Markdown",
      } as Record<string, string>
    )[language] ?? "Code";
  async function copy() {
    clearTimeout(timer.current);
    setState("copying");
    try {
      await navigator.clipboard.writeText(code);
      setState("copied");
    } catch {
      const range = document.createRange();
      range.selectNodeContents(element.current!);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      setState("denied");
    }
    timer.current = setTimeout(() => setState("idle"), 2000);
  }
  return (
    <div
      className={`code-block${language === "text" ? " code-block--prompt" : ""}`}
    >
      <div className="code-toolbar">
        <span>{label}</span>
        <span className="copy-feedback" role="status">
          {state === "copied"
            ? "Copied to clipboard"
            : state === "denied"
              ? "Clipboard unavailable. Example selected; copy it manually."
              : ""}
        </span>
        <button
          className="copy-code"
          type="button"
          aria-label="Copy code example"
          disabled={state === "copying"}
          onClick={copy}
        >
          {state === "copied"
            ? "Copied"
            : state === "denied"
              ? "Select to copy"
              : "Copy"}
        </button>
      </div>
      <pre tabIndex={0} aria-label={`${label} example`}>
        <code ref={element} className={`language-${language}`}>
          {code}
        </code>
      </pre>
    </div>
  );
}
