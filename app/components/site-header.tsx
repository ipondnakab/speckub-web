"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./site-chrome";

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="SpecKub home">
          <Logo />
          SpecKub
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>
            Overview
          </Link>
          <Link
            href="/docs"
            aria-current={pathname === "/docs" ? "page" : undefined}
          >
            Docs
          </Link>
          <Link
            href="/explorer"
            aria-current={pathname === "/explorer" ? "page" : undefined}
          >
            Explorer <span aria-hidden="true">↗</span>
          </Link>
          <a
            className="site-github"
            href="https://github.com/ipondnakab/speckub"
            target="_blank"
            rel="noreferrer"
          >
            GitHub ↗
          </a>
        </nav>
      </header>
    </>
  );
}
