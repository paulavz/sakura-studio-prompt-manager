import { test, expect } from "@playwright/test";
import { seed, cleanup } from "../visual/helpers/seed";

test.describe("Settings navigation", () => {
  test.beforeAll(async () => { await seed(); });
  test.afterAll(async () => { await cleanup(); });

  test("can navigate to Settings from gallery sidebar", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const settingsLink = page.locator('aside a[href="/settings/tags"]');
    await expect(settingsLink).toBeVisible();
    await expect(settingsLink).toContainText("Settings");

    await settingsLink.click();
    await page.waitForLoadState("networkidle");

    // Should be on settings page
    await expect(page.locator('[data-testid="settings-tags-page"]')).toBeVisible();
    await expect(page.locator('h2:has-text("Tags")')).toBeVisible();
  });

  test("can navigate back to gallery from Settings", async ({ page }) => {
    await page.goto("/settings/tags");
    await page.waitForLoadState("networkidle");

    const backLink = page.locator('header a:has-text("Back to gallery")');
    await expect(backLink).toBeVisible();

    await backLink.click();
    await page.waitForLoadState("networkidle");

    // Should be back on gallery
    await expect(page.locator('[data-region="gallery"]')).toBeVisible();
  });

  test("Settings tags page loads with seed data", async ({ page }) => {
    await page.goto("/settings/tags");
    await page.waitForLoadState("networkidle");

    // Should show seed tags (there may be other pre-existing tags)
    const tagList = page.locator('[data-testid="tag-list"]');
    await expect(tagList).toBeVisible();

    // Check specific seed tags exist
    await expect(page.locator('text=visual_test')).toBeVisible();
    await expect(page.locator('text=template_test')).toBeVisible();
    await expect(page.locator('text=code_review')).toBeVisible();
  });
});
