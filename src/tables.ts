import type MarkdownIt from "markdown-it";

/** Keep table semantics while providing a keyboard-accessible overflow region. */
export function configureTables(md: MarkdownIt) {
  md.renderer.rules.table_open = () =>
    '<div class="table-scroll" role="region" aria-label="Scrollable data table" tabindex="0"><table>\n';
  md.renderer.rules.table_close = () => "</table></div>\n";
}
