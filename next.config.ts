import type { NextConfig } from "next";

const config: NextConfig = {
  async redirects() {
    return [
      { source: "/docs.html", destination: "/docs", permanent: true },
      { source: "/explorer.html", destination: "/explorer", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default config;
