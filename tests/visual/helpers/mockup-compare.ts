/**
 * Mockup baseline comparison helper.
 *
 * Reads a mockup baseline PNG from __screenshots__/baseline/<projectName>/<region>.png
 * and compares it against a Playwright locator screenshot using pixelmatch.
 *
 * This is the core visual regression assertion for Phase 9: it compares
 * the live app against the design mockup, not against a previous app state.
 */

import { expect, type Locator, type TestInfo } from "@playwright/test";
import fs from "fs";
import path from "path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const BASELINE_DIR = path.resolve(__dirname, "../__screenshots__/baseline");

/**
 * Assert that a locator's screenshot matches the corresponding mockup
 * baseline within the allowed tolerance.
 *
 * @param locator   - Playwright locator for the app element to screenshot
 * @param regionName- Baseline filename without extension (e.g. "mockup-sidebar")
 * @param testInfo  - Playwright TestInfo (provides project name)
 * @param options   - Comparison options
 */
export async function toMatchMockupBaseline(
  locator: Locator,
  regionName: string,
  testInfo: TestInfo,
  options: { maxDiffPixelRatio?: number; threshold?: number } = {}
): Promise<void> {
  const maxDiffPixelRatio = options.maxDiffPixelRatio ?? 0.02;
  const threshold = options.threshold ?? 0.2;

  const baselinePath = path.join(
    BASELINE_DIR,
    testInfo.project.name,
    `${regionName}.png`
  );

  if (!fs.existsSync(baselinePath)) {
    throw new Error(
      `Mockup baseline not found: ${baselinePath}. ` +
        `Run "npm run test:visual:baseline" to generate it.`
    );
  }

  const expectedBuffer = fs.readFileSync(baselinePath);
  const expectedPng = PNG.sync.read(expectedBuffer);
  const actualBuffer = await locator.screenshot();
  const actualPng = PNG.sync.read(actualBuffer);

  if (
    actualPng.width !== expectedPng.width ||
    actualPng.height !== expectedPng.height
  ) {
    throw new Error(
      `Image dimension mismatch for ${regionName}: ` +
        `mockup is ${expectedPng.width}x${expectedPng.height}, ` +
        `app is ${actualPng.width}x${actualPng.height}. ` +
        `The app layout dimensions do not match the mockup.`
    );
  }

  const { width, height } = actualPng;
  const diff = new PNG({ width, height });
  const mismatchedPixels = pixelmatch(
    expectedPng.data,
    actualPng.data,
    diff.data,
    width,
    height,
    { threshold }
  );

  const totalPixels = width * height;
  const ratio = mismatchedPixels / totalPixels;

  expect(
    ratio <= maxDiffPixelRatio,
    `Mockup comparison failed for ${regionName}: ` +
      `pixel diff ratio ${ratio.toFixed(4)} exceeds max ${maxDiffPixelRatio}. ` +
      `${mismatchedPixels}/${totalPixels} pixels differ.`
  ).toBe(true);
}

/**
 * Get the path to a mockup baseline PNG for a given project and region.
 * Useful for tests that need to verify the baseline exists before comparing.
 */
export function getBaselinePath(projectName: string, regionName: string): string {
  return path.join(BASELINE_DIR, projectName, `${regionName}.png`);
}

/**
 * Check whether a mockup baseline exists for a given project and region.
 */
export function baselineExists(projectName: string, regionName: string): boolean {
  return fs.existsSync(getBaselinePath(projectName, regionName));
}