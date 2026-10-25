import { defineConfig } from "vite";
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        home: "index.html",
        docs: "docs.html",
        explorer: "explorer.html",
      },
    },
  },
});
