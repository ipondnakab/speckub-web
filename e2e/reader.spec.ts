import { test, expect } from "@playwright/test";
const text = (name: string) =>
  `---\nspeckub: true\nspecVersion: 1\nid: users.read\nkind: http\nmethod: GET\npath: /users/{id}\nsummary: ${name}\n---\n## Our custom contract\n\n| Field | Type |\n| --- | --- |\n| id | string |\n\n\`\`\`mermaid\nsequenceDiagram\nClient->>API: Get user\nAPI-->>Client: User\n\`\`\`\n`;
test("browse, render diagrams, switch branch, filter and deep-link", async ({
  page,
}, testInfo) => {
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
    path: testInfo.outputPath("landing.png"),
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
    path: testInfo.outputPath("reader.png"),
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
    path: testInfo.outputPath("mobile.png"),
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Feature users", exact: true }),
  ).toBeVisible();
});

test("path tree keeps parent routes, multiple methods and filtered matches accessible", async ({
  page,
}) => {
  const routes = [
    ["users.list", "GET", "/api/users"],
    ["users.create", "POST", "/api/users"],
    ["users.read", "GET", "/api/users/{id}"],
    ["orders.list", "GET", "/api/orders"],
  ];
  await page.route("https://api.github.com/**", async (route) => {
    const url = route.request().url();
    const json = url.includes("/branches?")
      ? [{ name: "main" }]
      : url.includes("/commits/")
        ? { sha: "tree-case", commit: { tree: { sha: "tree" } } }
        : url.includes("/git/trees/")
          ? {
              truncated: false,
              tree: routes.map(([id]) => ({
                path: `${id}.md`,
                type: "blob",
                mode: "100644",
              })),
            }
          : {
              owner: { login: "demo" },
              name: "tree",
              full_name: "demo/tree",
              default_branch: "main",
            };
    await route.fulfill({ json });
  });
  await page.route("https://raw.githubusercontent.com/**", (route) => {
    const id = route.request().url().split("/").at(-1)!.replace(".md", "");
    const [, method, path] = routes.find((r) => r[0] === id)!;
    return route.fulfill({
      body: `---\nspeckub: true\nspecVersion: 1\nid: ${id}\nkind: http\nmethod: ${method}\npath: ${path}\nsummary: ${id}\n---\n## Contract\nExample.`,
    });
  });
  await page.goto("/?repo=demo/tree");
  const api = page.locator('details[data-path="/api"]');
  const users = page.locator('details[data-path="/api/users"]');
  await expect(api).toBeVisible();
  await expect(users).toBeVisible();
  await expect(users.locator(".endpoint")).toHaveCount(3);
  await expect(users.locator(".path-count").first()).toHaveText("3");
  await users.locator("summary").first().click();
  await expect(users).not.toHaveAttribute("open");
  await page.getByRole("searchbox").fill("users.read");
  await expect(page.locator(".endpoint")).toHaveCount(1);
  await expect(page.locator(".endpoint")).toBeVisible();
  await page.getByRole("searchbox").fill("");
  await expect(
    page.locator('details[data-path="/api/users"]'),
  ).not.toHaveAttribute("open");
  await page.getByLabel("HTTP method", { exact: true }).selectOption("POST");
  await expect(page.locator(".endpoint")).toHaveCount(1);
  await expect(page.locator(".endpoint")).toContainText("POST");
  await page.getByLabel("HTTP method", { exact: true }).selectOption("");
  await page.locator('details[data-path="/api/users"] > summary').click();
  await page
    .getByRole("button", {
      name: "GET /api/users/{id} users.read",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "users.read", exact: true }),
  ).toBeVisible();
  await expect(page.locator('.endpoint[aria-current="true"]')).toBeVisible();
});
