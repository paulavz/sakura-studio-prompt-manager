# Plan A — Repair Playwright baselines and recover real pixel-perfect

## Goal

Restore the Playwright pixel-diff audit (`npm run test:visual`) so Phase 9
finishes with a working visual regression suite against the design mockup.

## Root cause to fix

`tests/visual/_baseline.spec.ts` targets fragile SVG primitives inside
`design/Sakura Prompt Studio _standalone_.html` with selectors like
`rect[width="80"][height="280"][x="0"][y="0"]`. These selectors time out or
match the wrong element, so `npm run test:visual:baseline` never produces a
usable baseline set, which cascades into Stage 2 self-aborting with
`STAGE_BLOCKED`.

## Pre-flight gate (run BEFORE any code change)

This plan is only viable if the standalone mockup actually renders real
HTML/CSS. If it is purely an illustrative SVG, abort and switch to Plan B.

1. Open `design/Sakura Prompt Studio _standalone_.html` and grep:
   - Real HTML markers: presence of `<div`, semantic tags, real CSS classes,
     `font-family: Inter`, `letter-spacing`, etc.
   - Pure-SVG markers: only `<svg>...<rect>...<text>` with hardcoded
     `font-family="sans-serif"` and integer coordinates on a 400×280 viewBox.
2. Decision rule:
   - If real HTML/CSS dominates → Plan A is viable, continue.
   - If pure SVG dominates → STOP. Write a one-line note in
     `PHASE9_TEST_PLAN.md` ("Plan A aborted: mockup is illustrative SVG, not
     renderable HTML") and switch to `PLAN_B_DEGRADE_AND_FORMALIZE.md`.

## Implementation steps

### 1. Rewrite `tests/visual/_baseline.spec.ts`

Replace selector-based screenshots with **bbox-based clips**. Coordinates come
once from the standalone HTML rendered viewport; after that they are stable.

```ts
test('mockup-sidebar', async ({ page }) => {
  await expect(page).toHaveScreenshot('mockup-sidebar.png', {
    clip: { x: 0, y: 0, width: 240, height: 900 },
    maxDiffPixelRatio: 0.02,
    threshold: 0.2,
  });
});
```

Apply the same pattern to: `mockup-full`, `mockup-gallery-card`,
`mockup-tag-chip`, `mockup-variable-chip`, `mockup-viewer`,
`mockup-three-pane`. Coordinates must come from inspecting the rendered
mockup once — not from SVG attributes. Document each clip rectangle inline
with a one-line comment citing the mockup region it captures.

### 2. Make baseline generation idempotent

Add an early skip so re-runs do not regenerate existing baselines:

```ts
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

test.beforeEach(async ({ page }, testInfo) => {
  const baselinePath = resolve(
    'tests/visual/__screenshots__/baseline',
    testInfo.project.name,
    `${testInfo.titlePath.at(-1)}.png`,
  );
  if (existsSync(baselinePath)) test.skip(true, 'baseline exists');
  // ...
});
```

### 3. Drop the Stage-2 escape hatch from `02-build.prompt.md`

Remove the section "Commands you MUST NOT run in this stage (hard ban)"
clause about ignoring broken baselines and the `§7` deferral added in the
last edit. Keep the hard ban on running `npm run test:visual:baseline` from
the model — the runner owns it.

### 4. Confirm runner preflight runs baseline generation

`run-phase.ps1` preflight already calls `npm run test:visual:baseline` when
`tests/visual/__screenshots__/baseline/` is missing. Verify the path is
correct after Step 2 (Playwright writes to
`__screenshots__/<spec>/<test-name>.png` by default, so the existence check
in `run-phase.ps1` may need to point at a sentinel file the spec actually
produces).

### 5. Generate baselines locally once

```powershell
npm run test:visual:baseline
```

Expected: 7 PNGs in `tests/visual/__screenshots__/baseline/` (or wherever
Playwright projects write them). Wall-clock under 60s. Commit them.

## Verification — MUST pass before this plan is considered complete

Implementation is NOT done until every check below passes. If any check
fails, fix the underlying issue and re-run; do not declare done.

1. **Baseline generation completes clean.**
   ```powershell
   Remove-Item -Recurse -Force tests/visual/__screenshots__/baseline
   npm run test:visual:baseline
   ```
   Exit code 0. Wall-clock <60s. 7 PNG files present. No timeout warnings in
   stdout.

2. **Idempotent re-run.**
   ```powershell
   npm run test:visual:baseline
   ```
   Exit code 0. Wall-clock <10s (skips because baselines already exist). No
   PNG modified (`git diff --stat tests/visual/__screenshots__/baseline/`
   prints nothing).

3. **Full visual diff runs end-to-end.**
   ```powershell
   npm run test:visual
   ```
   Exit code may be non-zero (current app does not match mockup yet) but the
   suite must NOT timeout on any spec. Every spec must produce either a
   pass or a clear pixel-diff failure with a `*-actual.png` and
   `*-diff.png` under `test-results/`.

4. **Pipeline run reaches Stage 2 without `STAGE_BLOCKED`.**
   ```powershell
   .\phases\phase-9\run-phase.ps1 -SkipTests -SkipReview
   ```
   Stage 2 log ends with `STAGE_COMPLETE`. The string `STAGE_BLOCKED` does
   not appear in `phases/phase-9/.pipeline-logs/*-2-build-loop1.log`.

5. **Final pixel-perfect run is gated correctly.**
   ```powershell
   .\phases\phase-9\run-phase.ps1
   # answer "y" to "Run Playwright pixel-perfect tests after pipeline completes?"
   ```
   At the end the runner invokes `npm run test:visual` exactly once and
   writes the result to the report. No timeout. The report enumerates each
   region's pass/fail.

6. **No regression in DOM-only fast gate.**
   `node tests/visual/dom-audit.mjs` and
   `python -m pytest tests/test_phase9_audit.py` both still exit 0 after
   Stage 2.

## Concluding the implementation

Only when all six verification checks above pass, do the following — in
order — and then declare Plan A complete:

1. Stage and commit:
   ```powershell
   git add tests/visual/_baseline.spec.ts tests/visual/__screenshots__/baseline phases/phase-9/02-build.prompt.md
   git commit -m "phase 9 plan A: stable bbox-based mockup baselines"
   ```
2. Append to `phases/phase-9/PHASE9_TEST_PLAN.md` under a new "Plan A
   resolution" heading: a one-paragraph summary of what changed and a list
   of the 7 baseline files now committed.
3. Reply to the user with the six verification commands and their captured
   exit codes / timings, plus a one-line summary: "Plan A complete:
   pixel-perfect audit restored."

If any verification step fails and cannot be fixed within the same session,
do NOT declare Plan A complete. Instead, write the failure mode into
`PHASE9_TEST_PLAN.md` "Plan A blockers" and surface the choice to switch to
Plan B.
