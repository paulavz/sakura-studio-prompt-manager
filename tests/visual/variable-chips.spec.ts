/**
 * Variable chips visual regression and DOM contract tests.
 *
 * 9.4 Variable chips — sakura at 20%/50% alpha, CSS custom property verification.
 * Skipped if Phase 5 (variables drawer) has not landed.
 */

import { test, expect } from "@playwright/test";
import { REGIONS } from "./helpers/regions";
import { expectColorToken } from "./helpers/computed-style";
import { toMatchBaseline } from "./helpers/compare-to-baseline";

test.describe("Variable chips", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.addStyleTag({
      content:
        "*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }",
    });
  });

  test("variable chip matches mockup-variable-chip baseline", async ({ page }, testInfo) => {
    const chip = page.locator(REGIONS.variableChip).first();
    const chipCount = await chip.count();
    test.skip(chipCount === 0, "Phase 5 (variables drawer) not yet implemented — variable chips not present in DOM");
    await chip.waitFor({ state: "visible" });
    const screenshot = await chip.screenshot();
    await toMatchBaseline(screenshot, "mockup-variable-chip", testInfo.project.name, {
      maxDiffPixelRatio: 0.02,
      threshold: 0.2,
    });
  });

  test("variable chip background equals sakura at 20% alpha", async ({ page }) => {
    const chip = page.locator(REGIONS.variableChip).first();
    const chipCount = await chip.count();
    test.skip(chipCount === 0, "Phase 5 (variables drawer) not yet implemented — variable chips not present in DOM");
    await chip.waitFor({ state: "visible" });
    await expectColorToken(chip, "background-color", "rgba(255, 183, 197, 0.2)");
  });

  test("variable chip border equals sakura at 50% alpha", async ({ page }) => {
    const chip = page.locator(REGIONS.variableChip).first();
    const chipCount = await chip.count();
    test.skip(chipCount === 0, "Phase 5 (variables drawer) not yet implemented — variable chips not present in DOM");
    await chip.waitFor({ state: "visible" });
    await expectColorToken(chip, "border-color", "rgba(255, 183, 197, 0.5)");
  });

  test("variable chip uses --color-sakura custom property resolving to #FFB7C5", async ({
    page,
  }) => {
    const chip = page.locator(REGIONS.variableChip).first();
    const chipCount = await chip.count();
    test.skip(chipCount === 0, "Phase 5 (variables drawer) not yet implemented — variable chips not present in DOM");
    await chip.waitFor({ state: "visible" });
    const sakuraValue = await chip.evaluate((el: HTMLElement) => {
      return getComputedStyle(el).getPropertyValue("--color-sakura").trim();
    });
    expect(sakuraValue.toLowerCase()).toBe("#ffb7c5");
  });
});