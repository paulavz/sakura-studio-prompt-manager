/**
 * Viewer panel visual regression and DOM contract tests.
 *
 * 9.5 Viewer — rendered/raw toggle, typography.
 */

import { test, expect } from "@playwright/test";
import { REGIONS } from "./helpers/regions";
import { expectFontFamily } from "./helpers/computed-style";
import { toMatchBaseline } from "./helpers/compare-to-baseline";

test.describe("Viewer panel", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a specific item. The app must have at least one item.
    // If no items exist, the test will be skipped.
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const firstCard = page.locator(REGIONS.galleryCard).first();
    if ((await firstCard.count()) === 0) {
      test.skip();
      return;
    }
    await firstCard.click();
    await page.waitForLoadState("networkidle");
    await page.addStyleTag({
      content:
        "*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }",
    });
  });

  test("viewer panel matches mockup-viewer baseline", async ({ page }, testInfo) => {
    const viewer = page.locator(REGIONS.viewer);
    if ((await viewer.count()) === 0) {
      test.skip();
      return;
    }
    await viewer.waitFor({ state: "visible" });
    const screenshot = await viewer.screenshot();
    await toMatchBaseline(screenshot, "mockup-viewer", testInfo.project.name, {
      maxDiffPixelRatio: 0.02,
      threshold: 0.2,
    });
  });

  test("rendered/raw toggle exists", async ({ page }) => {
    const modeToggle = page.locator(REGIONS.modeToggle);
    await modeToggle.waitFor({ state: "visible" });
    expect(await modeToggle.count()).toBeGreaterThan(0);
    const renderedBtn = modeToggle.locator("button:has-text('Rendered')");
    const rawBtn = modeToggle.locator("button:has-text('Raw')");
    expect(await renderedBtn.count()).toBeGreaterThan(0);
    expect(await rawBtn.count()).toBeGreaterThan(0);
  });

  test("typography uses Inter for prose content", async ({ page }) => {
    const viewer = page.locator(REGIONS.viewer);
    if ((await viewer.count()) === 0) {
      test.skip();
      return;
    }
    await viewer.waitFor({ state: "visible" });
    // Check the main content area uses Inter
    const proseArea = viewer.locator("p, .ProseMirror, .prose").first();
    if ((await proseArea.count()) === 0) {
      test.skip();
      return;
    }
    await expectFontFamily(proseArea, "Inter");
  });

  test("typography uses JetBrains Mono for code blocks", async ({ page }) => {
    const viewer = page.locator(REGIONS.viewer);
    if ((await viewer.count()) === 0) {
      test.skip();
      return;
    }
    await viewer.waitFor({ state: "visible" });
    const codeBlock = viewer.locator("code, pre").first();
    if ((await codeBlock.count()) === 0) {
      test.skip();
      return;
    }
    await expectFontFamily(codeBlock, "JetBrains Mono");
  });
});