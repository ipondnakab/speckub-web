import { test, expect } from "@playwright/test";

test("all pages render without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL,
  });
  try {
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Your source of truth.",
    );
    await page.getByRole("link", { name: "Start documenting" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "From source code to API documentation",
    );
    await expect(
      page
        .getByRole("navigation", { name: "Documentation sections" })
        .getByRole("link", { name: "Custom templates", exact: true }),
    ).toBeVisible();
    await page.goto("/explorer");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Your APIs,",
    );
    await expect(
      page.getByRole("textbox", { name: "Public GitHub repository" }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

test("Next.js routes and legacy URLs serve the expected pages and security headers", async ({
  page,
}) => {
  for (const url of ["/docs", "/docs.html"]) {
    const response = await page.goto(url);
    expect(response?.status()).toBe(200);
    expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
    expect(response?.headers()["x-frame-options"]).toBe("DENY");
    await expect(page).toHaveTitle(
      "SpecKub Docs — From source code to API documentation.",
    );
  }
  for (const url of ["/explorer", "/explorer.html"]) {
    await page.goto(url);
    await expect(
      page.getByRole("textbox", { name: "Public GitHub repository" }),
    ).toBeVisible();
    await expect(page).toHaveTitle(
      "SpecKub Explorer — Read public repository API specs.",
    );
  }
});

test("Next.js links preserve the document and isolate styles across all routes", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    Object.assign(window, { nextNavigationMarker: "preserved" });
  });
  const original = await page
    .getByRole("heading", { level: 1 })
    .evaluate((element) => ({
      fontSize: getComputedStyle(element).fontSize,
      color: getComputedStyle(element).color,
    }));
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  for (const [name, path] of [
    ["Docs", "/docs"],
    ["Explorer", "/explorer"],
    ["Overview", "/"],
  ]) {
    await navigation
      .getByRole("link", { name, exact: name !== "Explorer" })
      .click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    expect(
      await page.evaluate(() => Reflect.get(window, "nextNavigationMarker")),
    ).toBe("preserved");
    await expect(navigation.locator('[aria-current="page"]')).toContainText(
      name,
    );
  }
  const restored = await page
    .getByRole("heading", { level: 1 })
    .evaluate((element) => ({
      fontSize: getComputedStyle(element).fontSize,
      color: getComputedStyle(element).color,
    }));
  expect(restored).toEqual(original);
});

test("legacy URLs permanently redirect with query parameters intact", async ({
  request,
}) => {
  for (const [legacy, canonical] of [
    ["/docs.html", "/docs"],
    ["/explorer.html", "/explorer"],
  ]) {
    const response = await request.get(
      `${legacy}?repo=demo%2Fapi&branch=feature%2Fdocs&endpoint=users.read`,
      { maxRedirects: 0 },
    );
    expect(response.status()).toBe(308);
    expect(response.headers().location).toBe(
      `${canonical}?repo=demo%2Fapi&branch=feature%2Fdocs&endpoint=users.read`,
    );
  }
});
