import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const image = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAJUlEQVR4nGPcEqXxn4ECwESJ5lEDIICJgULANGoAw2gYMFAeBgA3CwJVU3uHiQAAAABJRU5ErkJggg==",
  "base64",
);
const file = { name: "sample.png", mimeType: "image/png", buffer: image };

test("studio uploads, edits, previews a mask, and downloads", async ({ page }) => {
  let replaceHadCutout = false;
  await page.route("**/v1/background/remove", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      body: image,
      headers: { "Access-Control-Allow-Origin": "*", "X-Processing-Duration-Ms": "42" },
    }),
  );
  await page.route("**/v1/background/replace", (route) => {
    replaceHadCutout = route.request().postData()?.includes('name="cutout"') ?? false;
    return route.fulfill({
      status: 200,
      contentType: "image/png",
      body: image,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  });
  await page.route("**/v1/mask", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      body: image,
      headers: { "Access-Control-Allow-Origin": "*" },
    }),
  );
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", /^(light|dark)$/);
  await page.getByLabel("Select an image").setInputFiles(file);
  await expect(page.getByText("Every detail, intact.")).toBeVisible();
  await expect(page.getByText("16 × 16 px").first()).toBeVisible();
  await page.getByRole("button", { name: "Color" }).click();
  await page.getByRole("button", { name: "Apply background" }).click();
  await expect(page.getByText("Background updated.")).toBeVisible();
  expect(replaceHadCutout).toBe(true);
  await page.getByRole("tab", { name: "Edges" }).click();
  await page.getByRole("button", { name: "Preview mask" }).click();
  await expect(page.getByAltText("Grayscale subject mask")).toBeVisible();
  await page.getByRole("button", { name: "Apply mask to image" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download image" }).click();
  expect((await download).suggestedFilename()).toBe("sample-cutout.png");
});

test("batch page shows a coming soon message", async ({ page }) => {
  await page.goto("/batch");
  await expect(page.getByRole("heading", { name: "Coming soon." })).toBeVisible();
  await expect(page.getByText("Batch background removal is on its way.", { exact: false })).toBeVisible();
  await expect(page.getByLabel("Select images")).toHaveCount(0);
});

test("responsive pages have no horizontal overflow", async ({ page }, testInfo) => {
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/batch", "/api", "/self-host"]) {
      await page.goto(path);
      await expect(page.locator("main").first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      const outside = overflow
        ? await page.evaluate(() =>
            [...document.querySelectorAll("*")]
              .filter((element) => element.getBoundingClientRect().right > innerWidth + 1)
              .slice(0, 8)
              .map(
                (element) =>
                  `${element.tagName}.${element.className} @${Math.round(element.getBoundingClientRect().right)}`,
              ),
          )
        : [];
      expect(overflow, `${path} at ${width}px: ${outside.join(", ")}`).toBe(false);
      if (path === "/") await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`), fullPage: true });
    }
  }
});

test("home page has no serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "BgGone home" })).toBeVisible();
  await expect(page).toHaveTitle(/BgGone/);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ["critical", "serious"].includes(item.impact || ""))).toEqual([]);
});

test("API errors show a retry action and can recover", async ({ page }) => {
  let attempts = 0;
  await page.route("**/v1/background/remove", (route) => {
    attempts += 1;
    if (attempts === 1)
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "model_unavailable", message: "Model is warming up" } }),
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    return route.fulfill({
      status: 200,
      contentType: "image/png",
      body: image,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", /^(light|dark)$/);
  await page.getByLabel("Select an image").setInputFiles(file);
  await expect(page.getByRole("alert").filter({ hasText: "Model is warming up" })).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("Every detail, intact.")).toBeVisible();
  expect(attempts).toBe(2);
});

test("key desk creates, checks, and revokes a key", async ({ page }) => {
  await page.route("**/v1/keys", (route) =>
    route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ id: "key-1", api_key: "rb-secret" }),
      headers: { "Access-Control-Allow-Origin": "*" },
    }),
  );
  await page.route("**/v1/keys/key-1/usage", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "key-1",
        month: "2026-09",
        used: 3,
        monthly_quota: 10000,
        created_at: "2026-09-01",
        revoked_at: null,
      }),
      headers: { "Access-Control-Allow-Origin": "*" },
    }),
  );
  await page.route("**/v1/keys/key-1", (route) =>
    route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": "*" } }),
  );
  await page.goto("/api");
  await page.getByLabel("Admin token").fill("admin-test");
  await page.getByRole("button", { name: "Generate API key" }).click();
  await expect(page.getByRole("dialog", { name: "Your new API key" })).toContainText("rb-secret");
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: /View usage/ }).click();
  await expect(page.getByText(/3\s*\/\s*10,000/)).toBeVisible();
  await page.getByRole("button", { name: "Revoke", exact: true }).click();
  await page.getByRole("dialog", { name: "Revoke this API key?" }).getByRole("button", { name: "Revoke key" }).click();
  await expect(page.getByText("Revoked", { exact: true })).toBeVisible();
});

test("dark theme and mobile navigation remain accessible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Use dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ["critical", "serious"].includes(item.impact || ""))).toEqual([]);
});
