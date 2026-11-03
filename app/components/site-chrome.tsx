import Link from "next/link";
import Image from "next/image";
export function Logo() {
  return (
    <Image
      src="/icon.svg"
      alt=""
      width={36}
      height={36}
      loading="eager"
      className="brand-logo"
      aria-hidden="true"
    />
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
