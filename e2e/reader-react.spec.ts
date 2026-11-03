import { test, expect } from "@playwright/test";

test("a slow branch request cannot replace the latest selected snapshot", async ({
  page,
}) => {
  let releaseSlow!: () => void;
  let slowStarted!: () => void;
  const slowGate = new Promise<void>((resolve) => {
    releaseSlow = resolve;
  });
  const started = new Promise<void>((resolve) => {
    slowStarted = resolve;
  });
  await page.route("https://api.github.com/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/commits/slow")) {
      slowStarted();
      await slowGate;
    }
    const json = url.includes("/branches?")
      ? [{ name: "main" }, { name: "slow" }, { name: "latest" }]
      : url.includes("/commits/")
        ? { sha: url.split("/").at(-1), commit: { tree: { sha: "tree" } } }
        : url.includes("/git/trees/")
          ? {
              truncated: false,
              tree: [{ path: "api.md", type: "blob", mode: "100644" }],
            }
          : {
              owner: { login: "demo" },
              name: "race",
              full_name: "demo/race",
              default_branch: "main",
            };
    await route.fulfill({ json }).catch(() => {
      /* The slow request is intentionally aborted. */
    });
  });
  await page.route("https://raw.githubusercontent.com/**", (route) => {
    const sha = route.request().url().split("/").at(-2);
    return route.fulfill({
      body: `---\nspeckub: true\nspecVersion: 1\nid: users.read\nkind: http\nmethod: GET\npath: /users\nsummary: Contract on ${sha}\n---\n## Contract\nRead users.`,
    });
  });
  try {
    await page.goto("/explorer?repo=demo/race");
    await expect(page.locator("#document > h2")).toHaveText("Contract on main");
    await page.getByLabel("Branch", { exact: true }).selectOption("slow");
    await started;
    const aborted = page.waitForEvent("requestfailed", (request) =>
      request.url().includes("/commits/slow"),
    );
    await page.getByLabel("Branch", { exact: true }).selectOption("latest");
    await aborted;
    await expect(page.locator("#document > h2")).toHaveText(
      "Contract on latest",
    );
    releaseSlow();
    await expect(page.getByLabel("Branch", { exact: true })).toHaveValue(
      "latest",
    );
    await expect(page.locator("#snapshot")).toContainText("branch latest");
    await expect(page).toHaveURL(/branch=latest/);
  } finally {
    releaseSlow();
  }
});
