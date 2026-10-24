import { test, expect } from "@playwright/test";
const text = (name: string) =>
  `---\nspeckub: true\nspecVersion: 1\nid: users.read\nkind: http\nmethod: GET\npath: /users/{id}\nsummary: ${name}\n---\n## Our custom contract\n\n| Field | Type |\n| --- | --- |\n| id | string |\n\n\`\`\`mermaid\nsequenceDiagram\nClient->>API: Get user\nAPI-->>Client: User\n\`\`\`\n`;
test("browse, render diagrams, switch branch, filter and deep-link", async ({
  page,
}) => {
  await page.route("https://api.github.com/**", async (route) => {
    const url = route.request().url();
    let data: unknown = {};
    if (url.includes("/branches?"))
      data = [{ name: "main" }, { name: "feature/custom" }];
    else if (url.includes("/commits/"))
      data = {
        sha: url.includes("feature") ? "feature-sha" : "main-sha",
        commit: { tree: { sha: "tree" } },
      };
    else if (url.includes("/git/trees/"))
      data = {
        truncated: false,
        tree: [
          { path: "services/users/custom.md", type: "blob", mode: "100644" },
        ],
      };
    else
      data = {
        owner: { login: "demo" },
        name: "api",
        full_name: "demo/api",
        default_branch: "main",
      };
    await route.fulfill({ json: data });
  });
  await page.route("https://raw.githubusercontent.com/**", (route) =>
    route.fulfill({
      body: text(
        route.request().url().includes("feature-sha")
          ? "Feature users"
          : "Read user",
      ),
    }),
  );
  await page.goto("/");
  await page.screenshot({
    path: "/private/tmp/speckub-web-landing.png",
    fullPage: true,
  });
  await page
    .getByRole("textbox", { name: "Public GitHub repository" })
    .fill("demo/api");
  await page.getByRole("button", { name: "Open repository" }).click();
  await expect(
    page.getByRole("heading", { name: "Read user", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".diagram svg")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Our custom contract" }),
  ).toBeVisible();
  await page
    .getByLabel("Branch", { exact: true })
    .selectOption("feature/custom");
  await expect(
    page.getByRole("heading", { name: "Feature users", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/branch=feature%2Fcustom/);
  await expect(page.locator(".file-link")).toHaveAttribute(
    "href",
    /feature-sha/,
  );
  await page.getByRole("searchbox").fill("missing");
  await expect(page.locator("#endpoints")).toHaveText("No matching endpoints.");
  await page.getByRole("searchbox").fill("");
  await expect(page.locator(".diagram svg")).toBeVisible();
  await page.screenshot({
    path: "/private/tmp/speckub-web-reader.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Feature users", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "/private/tmp/speckub-web-mobile.png",
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Feature users", exact: true }),
  ).toBeVisible();
});
