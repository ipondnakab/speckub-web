import Link from "next/link";
export function Logo() {
  return (
    <svg
      className="brand-logo"
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
    >
      <path
        fill="#df0038"
        fillRule="evenodd"
        d="M96 0h320a96 96 0 0 1 96 96v320a96 96 0 0 1-96 96H96a96 96 0 0 1-96-96V96A96 96 0 0 1 96 0Z M297 0h28L217 217l236-78-276 373 118-296-236 78Z"
      />
    </svg>
  );
}

export function SiteFooter({ explorer = false }: { explorer?: boolean }) {
  if (explorer)
    return (
      <footer>
        <span>SpecKub / Open-source API documentation</span>
        <span>Built for humans. Ready for agents.</span>
      </footer>
    );
  return (
    <footer className="site-footer">
      <Link className="brand" href="/">
        SpecKub
        <span className="footer-tagline">
          Built for humans. Ready for agents.
        </span>
      </Link>
      <div>
        <Link href="/docs">Documentation</Link>
        <Link href="/explorer">Public repository explorer ↗</Link>
        <a href="https://github.com/ipondnakab/speckub/blob/main/LICENSE">
          Apache-2.0
        </a>
      </div>
    </footer>
  );
}
