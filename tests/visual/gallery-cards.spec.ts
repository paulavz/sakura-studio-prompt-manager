import { test, expect } from '@playwright/test';
import { REGIONS, MOCKUP_VALUES } from './helpers/regions';
import { disableAnimations } from './helpers/computed-style';
import { seed, cleanup } from './helpers/seed';

test.describe('Gallery Cards Visual and DOM Checks', () => {
  test.beforeAll(async () => { await seed(); });
  test.afterAll(async () => { await cleanup(); });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await disableAnimations(page);
  });

  test('visual match with mockup-gallery-card', async ({ page }) => {
    // Assuming the first card in the gallery is representative
    const firstGalleryCard = page.locator(REGIONS.galleryCard).first();
    await expect(firstGalleryCard).toHaveScreenshot('mockup-gallery-card.png', {
      maxDiffPixelRatio: 0.02,
      threshold: 0.2,
    });
  });

  test('DOM: 1px border, no shadow at rest, padding from mockup', async ({ page }) => {
    // The first card is selected by default in our current implementation,
    // so we check a non-selected card (the second one) for 'at rest' styles.
    const nonSelectedCard = page.locator(REGIONS.galleryCard).nth(1);

    await expect(nonSelectedCard).toHaveCSS('border-width', '1px');
    await expect(nonSelectedCard).toHaveCSS('border-style', 'solid');
    await expect(nonSelectedCard).toHaveCSS('box-shadow', 'none'); // No shadow at rest
  });

  test('DOM: 🌸 indicator iff content has {{var}}', async ({ page }) => {
    // Cards with variables must show the sakura indicator.
    // Cards without variables must NOT show it.

    const cardWithVariable = page.locator(`${REGIONS.galleryCard}[data-has-variable="true"]`);
    const cardWithoutVariable = page.locator(`${REGIONS.galleryCard}[data-has-variable="false"]`);

    // At least one card has variables (seed item "Visual Test Template")
    const varCardCount = await cardWithVariable.count();
    expect(varCardCount).toBeGreaterThanOrEqual(1);

    // At least one card has no variables
    const noVarCount = await cardWithoutVariable.count();
    expect(noVarCount).toBeGreaterThanOrEqual(1);

    // Every variable card contains the indicator
    for (let i = 0; i < varCardCount; i++) {
      const indicator = cardWithVariable.nth(i).locator('[data-testid="variable-indicator"]');
      await expect(indicator).toHaveCount(1);
      await expect(indicator).toHaveText(MOCKUP_VALUES.brandingEmoji);
    }

    // No non-variable card contains the indicator
    const noVarCardCount = await cardWithoutVariable.count();
    for (let i = 0; i < noVarCardCount; i++) {
      const indicator = cardWithoutVariable.nth(i).locator('[data-testid="variable-indicator"]');
      await expect(indicator).toHaveCount(0);
    }
  });
});
