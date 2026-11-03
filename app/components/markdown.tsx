import { createElement, type ReactNode } from "react";
import type Token from "markdown-it/lib/token.mjs";
import { CodeBlock } from "./code-block";
import { MermaidDiagram } from "./mermaid-diagram";

/** Render Markdown tokens as React elements. Raw HTML and remote images stay inert. */
export function Markdown({
  tokens,
  codeExamples = false,
}: {
  tokens: Token[];
  codeExamples?: boolean;
}) {
  function render(sequence: Token[], prefix: string): ReactNode[] {
    let index = 0;
    function children(): ReactNode[] {
      const result: ReactNode[] = [];
      while (index < sequence.length) {
        const token = sequence[index++];
        if (token.nesting === -1) break;
        const key = `${prefix}-${index}`;
        if (token.type === "inline") {
          result.push(...render(token.children ?? [], key));
          continue;
        }
        if (
          token.type === "text" ||
          token.type === "html_inline" ||
          token.type === "html_block"
        ) {
          result.push(token.content);
          continue;
        }
        if (token.type === "softbreak") {
          result.push("\n");
          continue;
        }
        if (token.type === "hardbreak") {
          result.push(<br key={key} />);
          continue;
        }
        if (token.type === "image") {
          result.push(
            <span key={key} className="image-placeholder">
              [Image: {token.content}]
            </span>,
          );
          continue;
        }
        if (token.type === "fence" || token.type === "code_block") {
          const language = token.info.trim().split(/\s+/)[0];
          if (language === "mermaid" && !codeExamples)
            result.push(<MermaidDiagram key={key} source={token.content} />);
          else if (codeExamples)
            result.push(
              <CodeBlock
                key={key}
                language={language || "code"}
                code={token.content}
              />,
            );
          else
            result.push(
              <pre key={key}>
                <code className={language ? `language-${language}` : undefined}>
                  {token.content}
                </code>
              </pre>,
            );
          continue;
        }
        const nested = token.nesting === 1 ? children() : undefined;
        if (token.hidden) {
          if (nested) result.push(...nested);
          continue;
        }
        if (token.type === "code_inline") {
          result.push(<code key={key}>{token.content}</code>);
          continue;
        }
        const props: Record<string, unknown> = { key };
        for (const [name, value] of token.attrs ?? []) {
          if (name === "style") {
            // markdown-it only emits text alignment styles for table cells.
            const align = /^text-align:(left|right|center)$/.exec(value)?.[1];
            if (align) props.style = { textAlign: align };
          } else if (
            ["id", "href", "title", "target", "rel", "start"].includes(name)
          )
            props[name] = value;
        }
        const element = createElement(token.tag, props, ...(nested ?? []));
        result.push(
          token.tag === "table" ? (
            <div
              key={key}
              className="table-scroll"
              role="region"
              aria-label="Scrollable data table"
              tabIndex={0}
            >
              {element}
            </div>
          ) : (
            element
          ),
        );
      }
      return result;
    }
    return children();
  }
  return <>{render(tokens, "md")}</>;
}
