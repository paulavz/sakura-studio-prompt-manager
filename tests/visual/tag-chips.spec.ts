import { test, expect } from '@playwright/test';
import { REGIONS, MOCKUP_VALUES } from './helpers/regions';
import { disableAnimations, expectColorToken } from './helpers/computed-style';
import { seed, cleanup } from './helpers/seed';

test.describe('Tag Chips Visual and DOM Checks', () => {
  test.beforeAll(async () => { await seed(); });
  test.afterAll(async () => { await cleanup(); });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await disableAnimations(page);
  });

  test('visual match with mockup-tag-chip', async ({ page }) => {
    // Assuming tag chips are generally consistent, picking the first one
    const tagChip = page.locator(REGIONS.tagChip).first();
    await expect(tagChip).toHaveScreenshot('mockup-tag-chip.png', {
      maxDiffPixelRatio: 0.02,
      threshold: 0.2,
    });
  });

  test('DOM: neutral background (NOT sakura), radius and font-size from mockup', async ({ page }) => {
    // Pick a tag chip from a card WITHOUT variables so the background is neutral
    const neutralCard = page.locator(`${REGIONS.galleryCard}[data-has-variable="false"]`).first();
    await neutralCard.waitFor({ state: "visible" });
    const tagChip = neutralCard.locator(REGIONS.tagChip).first();

    // Neutral background (NOT sakura)
    await expectColorToken(tagChip, 'background-color', MOCKUP_VALUES.tagChipNeutralBg);

    // Radius and font-size derived from mockup `rx`
    await expect(tagChip).toHaveCSS('border-radius', '4px');
  });
});
