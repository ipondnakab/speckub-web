import { test, expect } from "@playwright/test";

test("introduction leads to docs and reader without fetching repository data", async ({
  page,
}) => {
  let githubCalls = 0;
  await page.route("https://api.github.com/**", async (route) => {
    githubCalls++;
    await route.abort();
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Your source of truth.",
  );
  await page.getByRole("link", { name: "Start documenting" }).click();
  await expect(page).toHaveURL(/docs\.html$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "From source code to API documentation",
  );
  await page
    .getByRole("navigation", { name: "Documentation sections" })
    .getByRole("link", { name: "Custom templates", exact: true })
    .click();
  await expect(page).toHaveURL(/#custom-templates$/);
  await expect(page.locator("#custom-templates")).toBeInViewport();
  await expect(page.locator(".docs-content")).toContainText("$speckub-scan");
  await expect(page.locator(".docs-content")).toContainText("/speckub.scan");
  await expect(page.locator(".docs-content")).toContainText(
    "Semantic validation remains skipped",
  );
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Explorer" })
    .click();
  await expect(page).toHaveURL(/explorer\.html$/);
  await expect(
    page.getByRole("textbox", { name: "Public GitHub repository" }),
  ).toBeVisible();
  expect(githubCalls).toBe(0);
});

test("docs deep links and code copying work", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/docs.html#quickstart");
  await expect(page.locator("#quickstart")).toBeInViewport();
  await page
    .getByRole("button", { name: "Copy code example", exact: true })
    .first()
    .click();
  await expect(
    page
      .getByRole("button", { name: "Copy code example", exact: true })
      .first(),
  ).toHaveText("Copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "npx speckub init --agent codex",
  );
  const broken = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')]
      .filter((a) => !document.getElementById(a.hash.slice(1)))
      .map((a) => a.hash),
  );
  expect(broken).toEqual([]);
});

test("home and documentation remain readable on a narrow screen", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [url, name] of [
    ["/", "introduction-mobile"],
    ["/docs.html", "docs-mobile"],
  ]) {
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`${name}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.screenshot({
    path: testInfo.outputPath("introduction-desktop.png"),
    fullPage: true,
  });
  await page.goto("/docs.html");
  await page.screenshot({
    path: testInfo.outputPath("docs-desktop.png"),
    fullPage: true,
  });
});
