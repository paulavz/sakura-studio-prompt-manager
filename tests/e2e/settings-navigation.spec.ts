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
    await expect(page.locator('[data-testid="tags-title"]')).toBeVisible();
  });

  test("can navigate back to gallery from Settings via sidebar", async ({ page }) => {
    await page.goto("/settings/tags");
    await page.waitForLoadState("networkidle");

    // Click "All Prompts" in the sidebar to go back to gallery
    const allPromptsBtn = page.locator('aside button:has-text("All Prompts")');
    await expect(allPromptsBtn).toBeVisible();

    await allPromptsBtn.click();
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

  test("can navigate to Variables settings and see defaults", async ({ page }) => {
    await page.goto("/settings/tags");
    await page.waitForLoadState("networkidle");

    // Click Variables Drawer in sub-nav
    const variablesLink = page.locator('nav a:has-text("Variables Drawer")');
    await expect(variablesLink).toBeVisible();
    await variablesLink.click();
    await page.waitForLoadState("networkidle");

    // Should be on variables page
    await expect(page.locator('[data-testid="settings-variables-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="variables-title"]')).toBeVisible();

    // Should show the defaults
    await expect(page.locator('text=MIN_VAR_LENGTH')).toBeVisible();
    await expect(page.locator('text=MAX_VAR_LENGTH')).toBeVisible();
  });
});
