let initialized = false;

/** Called after next/script has loaded the locally hosted browser bundle. */
export function getMermaid(): Mermaid {
  const mermaid = window.mermaid;
  if (!initialized) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "neutral",
      suppressErrorRendering: true,
      maxTextSize: 50000,
      flowchart: { htmlLabels: false },
      secure: [
        "securityLevel",
        "startOnLoad",
        "maxTextSize",
        "suppressErrorRendering",
      ],
    });
    initialized = true;
  }
  return mermaid;
}
