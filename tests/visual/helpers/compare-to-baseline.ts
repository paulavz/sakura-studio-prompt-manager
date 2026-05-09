/**
 * Comparison helper for visual regression against mockup baselines.
 *
 * Reads a baseline PNG from tests/visual/__screenshots__/baseline/<project>/
 * and compares it against a screenshot buffer using pixelmatch.
 */

import { expect } from "@playwright/test";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import * as fs from "fs";
import * as path from "path";

const BASELINE_DIR = path.resolve(__dirname, "..", "__screenshots__/baseline");

export interface BaselineComparisonOptions {
  maxDiffPixelRatio?: number;
  threshold?: number;
}

/**
 * Asserts that a screenshot buffer matches the corresponding baseline PNG
 * within the given tolerance.
 *
 * @param screenshot - Buffer of the app screenshot (from locator.screenshot())
 * @param baselineName - Baseline filename without extension (e.g., "mockup-sidebar")
 * @param project - Playwright project name (e.g., "chromium-1440")
 * @param options - Comparison options
 */
export async function toMatchBaseline(
  screenshot: Buffer,
  baselineName: string,
  project: string,
  options: BaselineComparisonOptions = {}
): Promise<void> {
  const { maxDiffPixelRatio = 0.02, threshold = 0.2 } = options;
  const baselinePath = path.join(BASELINE_DIR, project, `${baselineName}.png`);

  if (!fs.existsSync(baselinePath)) {
    throw new Error(
      `Baseline not found at ${baselinePath}. Run "npm run test:visual:baseline" first.`
    );
  }

  const baselineData = fs.readFileSync(baselinePath);
  const baselineImg = PNG.sync.read(baselineData);
  const screenshotImg = PNG.sync.read(screenshot);

  if (baselineImg.width !== screenshotImg.width || baselineImg.height !== screenshotImg.height) {
    throw new Error(
      `Dimension mismatch: baseline ${baselineImg.width}x${baselineImg.height} vs screenshot ${screenshotImg.width}x${screenshotImg.height}`
    );
  }

  const diff = new PNG({ width: baselineImg.width, height: baselineImg.height });
  const numDiffPixels = pixelmatch(
    baselineImg.data,
    screenshotImg.data,
    diff.data,
    baselineImg.width,
    baselineImg.height,
    { threshold }
  );

  const totalPixels = baselineImg.width * baselineImg.height;
  const ratio = numDiffPixels / totalPixels;

  expect(
    ratio,
    `Image differs from baseline "${baselineName}" by ${(ratio * 100).toFixed(2)}%, max allowed is ${(maxDiffPixelRatio * 100).toFixed(2)}% (${numDiffPixels}/${totalPixels} pixels differ)`
  ).toBeLessThanOrEqual(maxDiffPixelRatio);
}