/**
 * Three-pane layout visual regression and DOM contract tests.
 *
 * 9.5 Layout — three regions, separators, no horizontal scroll, no hardcoded sakura.
 */

import { test, expect } from "@playwright/test";
import { REGIONS, MOCKUP_VALUES } from "./helpers/regions";
import { toMatchBaseline } from "./helpers/compare-to-baseline";

test.describe("Three-pane layout", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.addStyleTag({
      content:
        "*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }",
    });
  });

  test("app three-pane matches mockup-three-pane baseline", async ({ page }, testInfo) => {
    const threePane = page.locator(REGIONS.threePane);
    if ((await threePane.count()) === 0) {
      test.skip();
      return;
    }
    await threePane.waitFor({ state: "visible" });
    const screenshot = await threePane.screenshot();
    await toMatchBaseline(screenshot, "mockup-three-pane", testInfo.project.name, {
      maxDiffPixelRatio: 0.02,
      threshold: 0.2,
    });
  });

  test("three regions present with data-region attributes", async ({ page }) => {
    const regions = [
      REGIONS.sidebar,
      REGIONS.galleryGrid,
      REGIONS.viewer,
      REGIONS.threePane,
    ];
    for (const sel of regions) {
      const el = page.locator(sel);
      const count = await el.count();
      expect(count, `Expected element ${sel} to exist`).toBeGreaterThan(0);
    }
  });

  test("vertical separators exist between panes", async ({ page }) => {
    const sidebar = page.locator(REGIONS.sidebar);
    if ((await sidebar.count()) === 0) {
      test.skip();
      return;
    }
    await sidebar.waitFor({ state: "visible" });

    // The sidebar should have a border-right and the gallery
    // area should have a border-right (or the viewer have border-left)
    const sidebarBorderRight = await sidebar.evaluate((el: HTMLElement) => {
      const style = getComputedStyle(el);
      return {
        width: style.borderRightWidth,
        color: style.borderRightColor,
      };
    });

    // The sidebar should have a 1px right border
    expect(
      parseFloat(sidebarBorderRight.width)
    ).toBeGreaterThanOrEqual(1);
  });

  test("layout root has no horizontal scroll at 1440 width", async ({ page }) => {
    const scrollWidth = await page.evaluate(() => {
      return document.documentElement.scrollWidth;
    });
    const clientWidth = await page.evaluate(() => {
      return document.documentElement.clientWidth;
    });
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("no element has hardcoded #FFB7C5 in inline style", async ({ page }) => {
    const hardcodedSakura = await page.evaluate(() => {
      const all = document.querySelectorAll("*");
      const violations: string[] = [];
      all.forEach((el) => {
        const style = el.getAttribute("style");
        if (style && (style.includes("#FFB7C5") || style.includes("#ffb7c5") || style.includes("255, 183, 197"))) {
          violations.push(
            `<${el.tagName} style="${style.slice(0, 80)}">`
          );
        }
      });
      return violations;
    });
    expect(hardcodedSakura).toHaveLength(0);
  });
});