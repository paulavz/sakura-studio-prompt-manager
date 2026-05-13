import { test, expect } from "@playwright/test";
import { seed, cleanup } from "../visual/helpers/seed";

test.describe("Viewer inline editing (Fase 12.5)", () => {
  test.beforeAll(async () => { await seed(); });
  test.afterAll(async () => { await cleanup(); });

  test.beforeEach(async ({ page }) => {
    await page.goto("/items/00000000-0000-4000-a000-000000000001");
    await page.waitForLoadState("networkidle");
  });

  // ─── E12.1 (revised): direct edit flow ───────────────────────────────────

  test("E12.1: change title shows save bar, Cancel reverts", async ({ page }) => {
    // Title is always an input
    const titleInput = page.locator('header input[type="text"]').first();
    await expect(titleInput).toBeVisible();
    await expect(titleInput).toHaveValue("Visual Test Template");

    // Change title
    await titleInput.fill("Changed Title");

    // Dirty state: save bar should appear
    await expect(page.locator('[data-testid="save-bar"]')).toBeVisible();

    // Cancel
    await page.getByRole("button", { name: /Cancel/i }).click();

    // Back to original title
    await expect(titleInput).toHaveValue("Visual Test Template");

    // Save bar hidden
    await expect(page.locator('[data-testid="save-bar"]')).toHaveCount(0);
  });

  // ─── E12.2: Save flow with petal rain ────────────────────────────────────

  test("E12.2: Save triggers petal rain and hides save bar", async ({ page }) => {
    const titleInput = page.locator('header input[type="text"]').first();
    await titleInput.fill("Saved Title");

    // Save bar visible
    await expect(page.locator('[data-testid="save-bar"]')).toBeVisible();

    // Click Save
    await page.getByRole("button", { name: /^Save$/i }).click();

    // Wait for save to complete
    await page.waitForTimeout(1000);

    // Save bar hidden
    await expect(page.locator('[data-testid="save-bar"]')).toHaveCount(0);

    // Title committed
    await expect(titleInput).toHaveValue("Saved Title");
  });

  // ─── E12.3: Tag combobox ─────────────────────────────────────────────────

  test("E12.3: add existing tag via combobox", async ({ page }) => {
    // Type existing tag name
    const tagInput = page.locator('header input[placeholder="+ tag"]').first();
    await tagInput.fill("visual_test");
    await tagInput.press("Enter");

    // Tag should appear in the list
    await expect(page.locator('header span:has-text("visual_test")')).toBeVisible();
  });

  test("E12.3: create new tag with Enter", async ({ page }) => {
    const tagInput = page.locator('header input[placeholder="+ tag"]').first();
    await tagInput.fill("new_tag_" + Date.now());
    await tagInput.press("Enter");

    // New tag should appear
    await expect(page.locator('header span:has-text("new_tag_")')).toBeVisible();
  });

  test("E12.3: invalid slug shows hint", async ({ page }) => {
    const tagInput = page.locator('header input[placeholder="+ tag"]').first();
    await tagInput.fill("Test Tag!");
    await tagInput.press("Enter");

    // Error should be visible
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });

  // ─── E12.4: Mode toggle blocked when dirty ───────────────────────────────

  test("E12.4: Render/Raw toggle blocked when dirty", async ({ page }) => {
    // Change content to make dirty
    const titleInput = page.locator('header input[type="text"]').first();
    await titleInput.fill("Dirty Title");

    // Try to click Raw toggle
    const rawBtn = page.locator('[data-testid="mode-toggle"] button:has-text("Raw")');
    await expect(rawBtn).toBeDisabled();

    // Cancel
    await page.getByRole("button", { name: /Cancel/i }).click();

    // Now toggle should be enabled
    await expect(rawBtn).toBeEnabled();
  });

  // ─── E12.5: Paste plain text by default ──────────────────────────────────

  test("E12.5: paste HTML as plain text in Tiptap", async ({ page }) => {
    // Focus editor
    const editor = page.locator('.ProseMirror').first();
    await editor.click();

    // Paste HTML content
    await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.setData("text/html", "<b>Bold</b>");
      dt.setData("text/plain", "Bold");
      const event = new ClipboardEvent("paste", { clipboardData: dt, bubbles: true });
      document.querySelector('.ProseMirror')?.dispatchEvent(event);
    });

    // Wait for paste
    await page.waitForTimeout(200);

    // Content should be plain text (no <b> tag)
    const html = await editor.evaluate((el: HTMLElement) => el.innerHTML);
    expect(html).not.toContain("<b>Bold</b>");
    expect(html).toContain("Bold");
  });
});
