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
  await page.getByLabel("View", { exact: true }).selectOption("tree");
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

test("header logo and favicon have a transparent lightning cutout", async ({
  page,
}) => {
  await page.goto("/");
  const colors = await page.evaluate(async () => {
    const logo = document.querySelector<SVGSVGElement>(".brand-logo")!;
    logo.setAttribute("width", "512");
    logo.setAttribute("height", "512");
    const sources = [
      `data:image/svg+xml,${encodeURIComponent(new XMLSerializer().serializeToString(logo))}`,
      document.querySelector<HTMLLinkElement>('link[rel="icon"]')!.href,
    ];
    return Promise.all(
      sources.map(async (src) => {
        const image = new Image();
        image.src = src;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 512;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(image, 0, 0, 512, 512);
        return {
          cutout: [...ctx.getImageData(250, 100, 1, 1).data],
          red: [...ctx.getImageData(50, 250, 1, 1).data],
        };
      }),
    );
  });
  for (const pixels of colors) {
    expect(pixels.cutout[3]).toBe(0);
    expect(pixels.red).toEqual([223, 0, 56, 255]);
  }
});

test("list/tree switching caps visible layers without losing routes or selection", async ({
  page,
}, testInfo) => {
  const routes = [
    ["root.get", "GET", "/"],
    ["users.list", "GET", "/api/users"],
    ["users.create", "POST", "/api/users"],
    [
      "tasks.get",
      "GET",
      "/api/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}",
    ],
    [
      "tasks.update",
      "PATCH",
      "/api/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}",
    ],
    [
      "comments.get",
      "GET",
      "/api/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/comments/{commentId}",
    ],
  ];
  await page.route("https://api.github.com/**", async (route) => {
    const url = route.request().url();
    await route.fulfill({
      json: url.includes("/branches?")
        ? [{ name: "main" }]
        : url.includes("/commits/")
          ? { sha: "mode-case", commit: { tree: { sha: "tree" } } }
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
                name: "modes",
                full_name: "demo/modes",
                default_branch: "main",
              },
    });
  });
  await page.route("https://raw.githubusercontent.com/**", (route) => {
    const id = route.request().url().split("/").at(-1)!.replace(".md", "");
    const [, method, path] = routes.find((r) => r[0] === id)!;
    return route.fulfill({
      body: `---\nspeckub: true\nspecVersion: 1\nid: ${id}\nkind: http\nmethod: ${method}\npath: ${path}\nsummary: ${id}\n---\n## Contract\nExample.`,
    });
  });
  await page.goto("/?repo=demo/modes&endpoint=tasks.get");
  await expect(page.locator(".endpoint")).toHaveCount(6);
  const view = page.getByLabel("View", { exact: true });
  const depth = page.getByLabel("Max tree layers", { exact: true });
  await expect(view).toHaveValue("list");
  await expect(depth).toBeHidden();
  await expect(page.locator(".path-group")).toHaveCount(0);
  await expect(page.locator("#document > h2")).toHaveText("tasks.get");
  await page.screenshot({
    path: testInfo.outputPath("list-mode.png"),
    fullPage: true,
  });
  await view.selectOption("tree");
  await expect(depth).toHaveValue("2");
  for (const limit of [1, 2, 4, 12]) {
    await depth.fill(String(limit));
    await depth.press("Tab");
    const layers = await page
      .locator(".path-group")
      .evaluateAll((groups) =>
        groups.map((g) => Number((g as HTMLElement).dataset.depth)),
      );
    expect(Math.max(...layers)).toBeLessThanOrEqual(limit);
    await expect(page.locator(".endpoint")).toHaveCount(6);
    await expect(page.locator('.endpoint[aria-current="true"]')).toBeVisible();
  }
  await depth.fill("2");
  await depth.press("Tab");
  await expect(
    page.locator('.endpoint[aria-current="true"] strong'),
  ).toHaveText("…/tasks/{taskId}");
  await expect(page.locator('.endpoint[aria-current="true"]')).toHaveAttribute(
    "title",
    "GET " + routes[3][2],
  );
  await page.getByLabel("HTTP method", { exact: true }).selectOption("GET");
  await expect(page.locator(".endpoint")).toHaveCount(4);
  await view.selectOption("list");
  await expect(page.locator(".path-group")).toHaveCount(0);
  await expect(page.locator(".endpoint")).toHaveCount(4);
  await page.getByRole("searchbox").fill("comments.get");
  await expect(page.locator(".endpoint")).toHaveCount(1);
  await page.locator(".endpoint").click();
  await expect(page.locator("#document > h2")).toHaveText("comments.get");
  await view.selectOption("tree");
  await expect(page.locator('.endpoint[aria-current="true"]')).toBeVisible();
  await page.getByRole("searchbox").fill("");
  await page.getByLabel("HTTP method", { exact: true }).selectOption("");
  await page.screenshot({
    path: testInfo.outputPath("tree-mode-2-layers.png"),
    fullPage: true,
  });
  await page.reload();
  await expect(view).toHaveValue("tree");
  await expect(depth).toHaveValue("2");
  await expect(page.locator("#document > h2")).toHaveText("comments.get");
  await expect(page.locator('.endpoint[aria-current="true"]')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: testInfo.outputPath("tree-mode-mobile.png"),
    fullPage: true,
  });
});

test("saved docs survive rate-limited refresh and reload without more API calls", async ({
  page,
}, testInfo) => {
  let limited = false,
    calls = 0;
  await page.clock.install();
  await page.route("https://api.github.com/**", async (route) => {
    calls++;
    const url = route.request().url();
    if (limited)
      return route.fulfill({
        status: 403,
        headers: {
          "access-control-expose-headers":
            "X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After",
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": String(
            Math.floor((Date.now() + 3600_000) / 1000),
          ),
        },
        json: { message: "API rate limit exceeded" },
      });
    return route.fulfill({
      json: url.includes("/branches?")
        ? [{ name: "main" }]
        : url.includes("/commits/")
          ? { sha: "cached-browser", commit: { tree: { sha: "tree" } } }
          : url.includes("/git/trees/")
            ? {
                truncated: false,
                tree: [{ path: "api.md", type: "blob", mode: "100644" }],
              }
            : {
                owner: { login: "demo" },
                name: "cached",
                full_name: "demo/cached",
                default_branch: "main",
              },
    });
  });
  await page.route("https://raw.githubusercontent.com/**", (route) =>
    route.fulfill({ body: text("Saved user contract") }),
  );
  await page.goto("/?repo=demo/cached");
  await expect(page.locator("#document > h2")).toHaveText(
    "Saved user contract",
  );
  expect(calls).toBe(4);
  await page.reload();
  await expect(page.locator("#document > h2")).toHaveText(
    "Saved user contract",
  );
  expect(calls).toBe(4);
  await page.clock.fastForward(6 * 60_000);
  limited = true;
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.locator("#status")).toContainText("Showing saved data");
  await expect(page.locator("#status")).toHaveClass("warning");
  expect(calls).toBe(5);
  await expect(page.locator("#document > h2")).toHaveText(
    "Saved user contract",
  );
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Refresh", exact: true }),
  ).toBeEnabled();
  expect(calls).toBe(5);
  await page.reload();
  await expect(page.locator("#document > h2")).toHaveText(
    "Saved user contract",
  );
  await expect(page.locator("#status")).toContainText("out of date");
  expect(calls).toBe(5);
  await expect(page.locator("#snapshot")).toContainText("cached");
  await page.screenshot({
    path: testInfo.outputPath("cached-during-rate-limit.png"),
    fullPage: true,
  });
});

test("failed new branch and repository loads preserve the displayed snapshot identity", async ({
  page,
}) => {
  let limited = false;
  await page.route("https://api.github.com/**", async (route) => {
    const url = route.request().url();
    if (limited)
      return route.fulfill({
        status: 429,
        headers: {
          "retry-after": "120",
          "access-control-expose-headers": "Retry-After",
        },
        json: { message: "Rate limit exceeded" },
      });
    return route.fulfill({
      json: url.includes("/branches?")
        ? [{ name: "main" }, { name: "feature" }]
        : url.includes("/commits/")
          ? { sha: "previous-browser", commit: { tree: { sha: "tree" } } }
          : url.includes("/git/trees/")
            ? {
                truncated: false,
                tree: [{ path: "api.md", type: "blob", mode: "100644" }],
              }
            : {
                owner: { login: "demo" },
                name: "previous",
                full_name: "demo/previous",
                default_branch: "main",
              },
    });
  });
  await page.route("https://raw.githubusercontent.com/**", (route) =>
    route.fulfill({ body: text("Previously loaded contract") }),
  );
  await page.goto("/?repo=demo/previous");
  await expect(page.locator("#document > h2")).toHaveText(
    "Previously loaded contract",
  );
  limited = true;
  await page.getByLabel("Branch", { exact: true }).selectOption("feature");
  await expect(page.locator("#status")).toContainText(
    "Still showing demo/previous on branch main",
  );
  await expect(page.getByLabel("Branch", { exact: true })).toHaveValue("main");
  await expect(page).toHaveURL(/branch=main/);
  await expect(page.locator("#document > h2")).toHaveText(
    "Previously loaded contract",
  );
  await page
    .getByRole("textbox", { name: "Public GitHub repository" })
    .fill("demo/another");
  await page.getByRole("button", { name: "Open repository" }).click();
  await expect(page.locator("#status")).toContainText(
    "previously loaded documentation is still available",
  );
  await expect(page.locator("#workspace")).toBeVisible();
  await expect(page.locator("#repo-name")).toHaveText("demo/previous");
  await expect(page.locator("#document > h2")).toHaveText(
    "Previously loaded contract",
  );
});
