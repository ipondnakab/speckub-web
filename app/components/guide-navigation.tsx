"use client";

import { useEffect, useState } from "react";
import type { GuideSection } from "../../src/guide";

export function GuideNavigation({ sections }: { sections: GuideSection[] }) {
  const [current, setCurrent] = useState(sections[0]?.id);
  useEffect(() => {
    const headings = sections
      .map(({ id }) => document.getElementById(id))
      .filter((heading) => heading !== null);
    const markCurrent = () =>
      setCurrent(
        (
          headings.filter((h) => h.getBoundingClientRect().top < 140).at(-1) ??
          headings[0]
        )?.id,
      );
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        markCurrent();
        frame = 0;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    if (location.hash) {
      try {
        document
          .getElementById(decodeURIComponent(location.hash.slice(1)))
          ?.scrollIntoView();
      } catch {
        /* Malformed fragments leave the guide at its current position. */
      }
    }
    markCurrent();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [sections]);
  return (
    <nav aria-label="Documentation sections">
      {sections.map(({ id, title }) => (
        <a
          key={id}
          href={`#${id}`}
          aria-current={id === current ? "location" : undefined}
        >
          {title}
        </a>
      ))}
    </nav>
  );
}
