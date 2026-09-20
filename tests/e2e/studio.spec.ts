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
    for (const path of ["/", "/batch", "/contribute", "/privacy", "/terms"]) {
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
      const pageName = path === "/" ? "home" : path.slice(1);
      await page.screenshot({ path: testInfo.outputPath(`${pageName}-${width}.png`), fullPage: true });
    }
  }
});

test("public pages have no serious accessibility violations", async ({ page }) => {
  for (const path of ["/", "/contribute", "/privacy", "/terms"]) {
    await page.goto(path);
    await expect(page.getByRole("link", { name: "BgGone home" })).toBeVisible();
    await expect(page).toHaveTitle(/BgGone/);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((item) => ["critical", "serious"].includes(item.impact || ""))).toEqual([]);
  }
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

test("contribute page links to the public repository", async ({ page }) => {
  await page.goto("/contribute");
  await expect(page.getByRole("heading", { name: "BgGone is open source." })).toBeVisible();
  await expect(page.getByRole("link", { name: "View BgGone repository on GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/git-dariel/BgGone",
  );
});

test("header, contact section, and legal footer link to the requested destinations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "View BgGone on GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/git-dariel/BgGone",
  );
  const mainNavigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(mainNavigation.getByRole("link", { name: "Privacy Policy" })).toHaveCount(0);
  await expect(mainNavigation.getByRole("link", { name: "Terms of Use" })).toHaveCount(0);
  await expect(page.locator("main > section").last().getByRole("heading", { name: "Questions, feedback, or a good idea?" })).toBeVisible();
  await expect(page.getByRole("link", { name: "dariel.v.avila@gmail.com" })).toHaveAttribute(
    "href",
    "mailto:dariel.v.avila@gmail.com",
  );
  const footer = page.getByRole("contentinfo");
  await expect(footer).toContainText("© 2026 BgGone · Privacy Policy · Terms of Use");
  await expect(footer.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
  await expect(footer.getByRole("link", { name: "Terms of Use" })).toHaveAttribute("href", "/terms");
  await expect(footer.getByText("Contact")).toHaveCount(0);
});

test("privacy and terms pages include the required disclosures and contact", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
  await expect(page.getByText("BgGone has no user accounts", { exact: false })).toBeVisible();
  await expect(page.getByText("processed in memory", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "dariel.v.avila@gmail.com" })).toHaveAttribute(
    "href",
    "mailto:dariel.v.avila@gmail.com",
  );

  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "Terms of Use" })).toBeVisible();
  for (const heading of [
    "Acceptable use",
    "Intellectual property",
    "Availability and changes",
    "Provided as is",
    "Limitation of liability",
    "Third-party services",
    "Changes and contact",
  ]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
});

test("removed API and self-host routes return the missing page", async ({ page }) => {
  for (const path of ["/api", "/self-host"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "Nothing to cut out here." })).toBeVisible();
  }
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
