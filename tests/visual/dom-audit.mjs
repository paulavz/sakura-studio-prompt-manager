/**
 * Fast DOM-only audit for Phase 9 pipeline gate.
 * Runs headless Chromium against localhost:3000, no screenshots.
 * Target: <15s. Exit 0 = all checks pass, exit 1 = failures.
 *
 * Checks:
 *  1. data-region attrs (sidebar, gallery, viewer, layout-root)
 *  2. data-testid attrs (item-card, tag-chip)
 *  3. body fontFamily includes Inter
 *  4. [data-region="viewer"] prose fontFamily includes Inter
 *  5. code element fontFamily includes JetBrains Mono
 *  6. no hardcoded sakura color (#FFB7C5 / rgb(255,183,197)) in inline styles
 *  7. sidebar has a fixed pixel width (not auto / 0)
 *  8. [data-region="gallery"] uses a grid display
 */

import { chromium } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const VIEWPORT = { width: 1440, height: 900 };
const NAV_TIMEOUT = 20000;

const REQUIRED_REGIONS = [
  '[data-region="sidebar"]',
  '[data-region="gallery"]',
  '[data-region="viewer"]',
  '[data-region="layout-root"]',
];

const REQUIRED_TESTIDS = ["item-card", "tag-chip"];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  const failures = [];

  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: NAV_TIMEOUT });
    await page.waitForTimeout(5000); // Allow time for hydration

    // 1. data-region attrs
    for (const sel of REQUIRED_REGIONS) {
      const count = await page.locator(sel).count();
      if (count === 0) failures.push(`Missing data-region: ${sel}`);
      else console.log(`  ✓ ${sel}`);
    }

    // 2. data-testid attrs (at least one of each)
    for (const tid of REQUIRED_TESTIDS) {
      const count = await page.locator(`[data-testid="${tid}"]`).count();
      if (count === 0) {
        // Debug: count total items in gallery grid
        const galleryItems = await page.locator('[data-region="gallery"] [data-testid="item-card"]').count();
        failures.push(`Missing data-testid="${tid}" (total item-cards: ${galleryItems})`);
      } else {
        console.log(`  ✓ data-testid="${tid}" (${count})`);
      }
    }

    // 3. body font — Inter
    const bodyFont = await page.evaluate(
      () => getComputedStyle(document.body).fontFamily
    );
    if (!bodyFont.toLowerCase().includes("inter")) {
      failures.push(`body fontFamily does not include Inter (got: ${bodyFont})`);
    } else {
      console.log(`  ✓ body fontFamily: ${bodyFont.slice(0, 60)}`);
    }

    // 4. viewer prose font — Inter
    const viewerEl = await page.locator('[data-region="viewer"]').first();
    if (await viewerEl.count() > 0) {
      const viewerFont = await viewerEl.evaluate(
        (el) => getComputedStyle(el).fontFamily
      );
      if (!viewerFont.toLowerCase().includes("inter")) {
        failures.push(`viewer fontFamily does not include Inter (got: ${viewerFont})`);
      } else {
        console.log(`  ✓ viewer fontFamily: ${viewerFont.slice(0, 60)}`);
      }
    }

    // 5. code element font — JetBrains Mono
    const codeCount = await page.locator("code, pre").count();
    if (codeCount > 0) {
      const codeFont = await page.locator("code, pre").first().evaluate(
        (el) => getComputedStyle(el).fontFamily
      );
      if (!codeFont.toLowerCase().includes("jetbrains")) {
        failures.push(`code fontFamily does not include JetBrains Mono (got: ${codeFont})`);
      } else {
        console.log(`  ✓ code fontFamily: ${codeFont.slice(0, 60)}`);
      }
    } else {
      console.log("  ~ no <code>/<pre> elements found; skipping font check");
    }

    // 6. no hardcoded sakura in inline styles
    const hardcoded = await page.evaluate(() => {
      const results = [];
      for (const el of document.querySelectorAll("[style]")) {
        const s = el.getAttribute("style") || "";
        if (
          s.includes("255, 183, 197") ||
          s.includes("255,183,197") ||
          s.toLowerCase().includes("#ffb7c5")
        ) {
          results.push(`<${el.tagName.toLowerCase()}> style="${s.slice(0, 120)}"`);
        }
      }
      return results;
    });
    for (const h of hardcoded) {
      failures.push(`Hardcoded sakura in inline style: ${h}`);
    }
    if (hardcoded.length === 0) console.log("  ✓ no hardcoded sakura in inline styles");

    // 7. sidebar has a non-zero fixed width
    const sidebarEl = page.locator('[data-region="sidebar"]').first();
    if (await sidebarEl.count() > 0) {
      const sidebarWidth = await sidebarEl.evaluate(
        (el) => getComputedStyle(el).width
      );
      if (!sidebarWidth || sidebarWidth === "0px" || sidebarWidth === "auto") {
        failures.push(`sidebar has no fixed width (got: ${sidebarWidth})`);
      } else {
        console.log(`  ✓ sidebar width: ${sidebarWidth}`);
      }
    }

    // 8. gallery uses grid display
    const galleryEl = page.locator('[data-region="gallery"]').first();
    if (await galleryEl.count() > 0) {
      const galleryDisplay = await galleryEl.evaluate(
        (el) => getComputedStyle(el).display
      );
      if (!galleryDisplay.includes("grid")) {
        failures.push(`gallery display is not grid (got: ${galleryDisplay})`);
      } else {
        console.log(`  ✓ gallery display: ${galleryDisplay}`);
      }
    }

  } finally {
    await browser.close();
  }

  if (failures.length > 0) {
    console.error("\nDOM AUDIT FAILURES:");
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }

  console.log("\nDOM audit: all checks passed");
  process.exit(0);
}

run().catch((err) => {
  console.error("DOM audit error:", err.message);
  process.exit(1);
});
