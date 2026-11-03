import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "SpecKub — API documentation that lives with your code.",
  description:
    "Discover, document, and read your HTTP APIs with SpecKub. An agent-driven Markdown workflow for any language, with custom templates and a standalone reader.",
};

export const viewport = { themeColor: "#df0038" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div id="app">{children}</div>
      </body>
    </html>
  );
}
