import type { ReactNode } from "react";
import styles from "./reader.module.css";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-chrome";

export default function ReaderLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <SiteHeader />
      {children}
      <SiteFooter explorer />
    </div>
  );
}
