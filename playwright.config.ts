import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "e2e",
  use: {
    baseURL: "http://127.0.0.1:3000",
    launchOptions: { executablePath: process.env.CHROME_PATH },
  },
  webServer: {
    command: "yarn start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
  },
  reporter: "list",
});
