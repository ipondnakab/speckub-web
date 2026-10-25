export const logo = `<svg class="brand-logo" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#df0038" fill-rule="evenodd" d="M96 0h320a96 96 0 0 1 96 96v320a96 96 0 0 1-96 96H96a96 96 0 0 1-96-96V96A96 96 0 0 1 96 0Z M297 0h28L217 217l236-78-276 373 118-296-236 78Z"/></svg>`;
export function header(current: "home" | "docs") {
  return `<a class="skip-link" href="#main">Skip to content</a><header class="site-header"><a class="brand" href="/" aria-label="SpecKub home">${logo}SpecKub</a><nav aria-label="Main navigation"><a href="/" ${current === "home" ? 'aria-current="page"' : ""}>Overview</a><a href="/docs.html" ${current === "docs" ? 'aria-current="page"' : ""}>Docs</a><a href="/explorer.html">Explorer <span aria-hidden="true">↗</span></a><a class="site-github" href="https://github.com/ipondnakab/speckub" target="_blank" rel="noreferrer">GitHub ↗</a></nav></header>`;
}
export const footer = `<footer class="site-footer"><a class="brand" href="/">SpecKub<span class="footer-tagline">Built for humans. Ready for agents.</span></a><div><a href="/docs.html">Documentation</a><a href="/explorer.html">Public repository explorer ↗</a><a href="https://github.com/ipondnakab/speckub/blob/main/LICENSE">Apache-2.0</a></div></footer>`;
export function installCopyButtons(root: HTMLElement) {
  root.querySelectorAll("pre").forEach((pre) => {
    const code = pre.querySelector("code");
    if (!code) return;
    const button = document.createElement("button");
    button.className = "copy-code";
    button.type = "button";
    button.textContent = "Copy";
    button.setAttribute("aria-label", "Copy code example");
    button.onclick = async () => {
      try {
        await navigator.clipboard.writeText(code.textContent ?? "");
        button.textContent = "Copied";
      } catch {
        button.textContent = "Select to copy";
        const range = document.createRange();
        range.selectNodeContents(code);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
      setTimeout(() => (button.textContent = "Copy"), 2000);
    };
    pre.append(button);
  });
}
