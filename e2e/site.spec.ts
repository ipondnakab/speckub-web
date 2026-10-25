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
    "npm install --global @speckub/cli\nspeckub init --agent codex",
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

test("long prompts wrap and copy controls remain outside code scrolling", async ({
  page,
  context,
}, testInfo) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/docs.html#custom-templates");
    const prompt = page
      .locator(".code-block--prompt")
      .filter({ hasText: "$speckub-template" });
    await expect(prompt).toBeInViewport();
    expect(
      await prompt
        .locator("pre")
        .evaluate((pre) => pre.scrollWidth <= pre.clientWidth),
    ).toBe(true);
    await prompt.getByRole("button", { name: "Copy code example" }).click();
    await expect(prompt.getByRole("button")).toHaveText("Copied");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      await prompt.locator("code").textContent(),
    );
    await page.screenshot({
      path: testInfo.outputPath(`template-prompt-${width}.png`),
    });
    const example = page
      .locator(".code-block")
      .filter({ has: page.locator(".language-markdown") })
      .first();
    await example.scrollIntoViewIfNeeded();
    const copy = example.getByRole("button", { name: "Copy code example" });
    const before = await copy.boundingBox();
    await example.locator("pre").evaluate((pre) => {
      pre.scrollLeft = pre.scrollWidth;
    });
    expect(await copy.boundingBox()).toEqual(before);
    await expect(copy).toBeVisible();
  }
});

test("clipboard denial selects only the example and malformed anchors do not break docs", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(navigator.clipboard, "writeText", {
      value: () => Promise.reject(new Error("Clipboard denied")),
    });
  });
  await page.goto("/docs.html#%ZZ");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Copy code example" }).first().click();
  await expect(
    page.getByRole("button", { name: "Copy code example" }).first(),
  ).toHaveText("Select to copy");
  expect(
    (await page.evaluate(() => window.getSelection()?.toString()))?.trimEnd(),
  ).toBe("npm install --global @speckub/cli\nspeckub init --agent codex");
  expect(errors).toEqual([]);
});

test("all pages share the same navbar with the correct active destination", async ({
  page,
}, testInfo) => {
  // Keep layout comparison independent of third-party font network availability.
  await page.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ body: "", contentType: "text/css" }),
  );
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    let reference: unknown;
    for (const [url, active] of [
      ["/", "Overview"],
      ["/docs.html", "Docs"],
      ["/explorer.html", "Explorer"],
    ]) {
      await page.goto(url);
      const header = page.locator(".site-header");
      await expect(header).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const nav = page.getByRole("navigation", { name: "Main navigation" });
      await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
      await expect(nav.locator('[aria-current="page"]')).toContainText(active);
      const layout = await header.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const brand = element.querySelector(".brand")!.getBoundingClientRect();
        return {
          x: box.x,
          width: box.width,
          height: box.height,
          brandX: brand.x,
          brandWidth: brand.width,
          links: [...element.querySelectorAll("nav a")].map((a) => ({
            text: a.textContent,
            href: a.getAttribute("href"),
          })),
        };
      });
      if (reference) expect(layout).toEqual(reference);
      else reference = layout;
      if (active === "Explorer")
        await page.screenshot({
          path: testInfo.outputPath(`shared-navbar-${width}.png`),
        });
    }
  }
});
