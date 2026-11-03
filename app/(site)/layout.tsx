import type { ReactNode } from "react";
import styles from "./site.module.css";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-chrome";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
