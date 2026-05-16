import { Locator, expect, Page } from "@playwright/test";

// Helper to normalize color values (rgb, rgba, hex) for comparison.
function normalizeColor(color: string): string {
  // Normalize by removing all spaces and converting everything to a standard format
  const normalized = color.replace(/\s+/g, '');
  
  if (normalized.startsWith("#")) {
    // Convert hex to rgb
    let hex = normalized.slice(1);
    if (hex.length === 3) {
      hex = hex.split("").map((char) => char + char).join("");
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgb(${r},${g},${b})`;
  } else if (normalized.startsWith("rgb(")) {
    return normalized;
  } else if (normalized.startsWith("rgba(")) {
    const parts = normalized.match(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)/);
    if (parts && parseFloat(parts[4]) === 1) {
      return `rgb(${parts[1]},${parts[2]},${parts[3]})`;
    }
    return normalized;
  }
  return normalized;
}

/**
 * Asserts that a locator's computed CSS property matches an expected color token.
 * Handles normalization of hex, rgb, and rgba values.
 * @param locator The Playwright Locator for the element.
 * @param prop The CSS property name (e.g., 'background-color', 'color').
 * @param expected The expected color value (hex, rgb, or rgba).
 */
export async function expectColorToken(
  locator: Locator,
  prop: string,
  expected: string,
) {
  console.log(`Debug: evaluating ${prop} on locator: ${locator}`);
  const computedStyle = await locator.evaluate(
    (el, prop) => {
      console.log(`Debug: element found, tag: ${el.tagName}`);
      return getComputedStyle(el)[prop];
    },
    prop,
  );
  console.log(`Debug: computed style for ${prop}: ${computedStyle}`);
  expect(normalizeColor(computedStyle)).toBe(normalizeColor(expected));
}

/**
 * Asserts that a locator's computed CSS property for spacing matches one of the allowed pixel values.
 * @param locator The Playwright Locator for the element.
 * @param prop The CSS property name (e.g., 'padding-left', 'margin-top').
 * @param allowedPx An array of allowed pixel values (e.g., [4, 8, 16]).
 */
export async function expectSpacingToken(
  locator: Locator,
  prop: string,
  allowedPx: number[],
) {
  const computedStyle = await locator.evaluate(
    (el, prop) => getComputedStyle(el)[prop],
    prop,
  );
  const pxValue = parseFloat(computedStyle); // "16px" -> 16
  expect(allowedPx).toContain(pxValue);
}

/**
 * Asserts that a locator's computed font-family starts with the expected font.
 * Useful for checking primary font while ignoring fallback fonts.
 * @param locator The Playwright Locator for the element.
 * @param expected The expected starting font family (e.g., 'Inter').
 */
export async function expectFontFamily(locator: Locator, expected: string) {
  const computedStyle = await locator.evaluate(
    (el) => getComputedStyle(el).fontFamily,
  );
  expect(computedStyle).toContain(expected);
}

/**
 * Disables all CSS animations and transitions on the page to ensure consistent screenshots.
 * @param page The Playwright Page object.
 */
export async function disableAnimations(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        transition-duration: 0s !important;
        animation-delay: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });
}