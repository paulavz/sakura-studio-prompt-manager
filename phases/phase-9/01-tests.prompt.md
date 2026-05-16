# Phase 9 — Pixel Perfect — STAGE 1: TESTS FIRST

You are a Principal Frontend QA Engineer. Author the visual test harness for
Phase 9. Do NOT modify application code. Tests must FAIL against the current
app — that is the test-first contract.

## EXECUTION PROTOCOL — read this before everything else

You MUST follow this protocol or the runner will kill you.

1. **Heartbeat.** Before each meaningful action (read a file, edit a file, run a command), print one line: `PROGRESS: <one line, what you are doing>`. The runner kills any stage that prints nothing for 5 minutes.

2. **Self-abort on loops.** If you attempt the same fix 3 times without visible progress, STOP. Print:
   `STAGE_BLOCKED: <one paragraph: what is blocking you, what you tried, what you would need from a human>`
   Then exit. Do NOT retry. Do NOT invent workarounds. Do NOT swallow the error.

3. **No long-running commands inside this stage.** Do NOT run `npm install`, `npx playwright install`, `npm run test:visual:baseline`, or any command that takes >30s. The runner already did them in preflight. If a command would block, skip it and trust the runner.

4. **Last-line contract.** The last non-empty line of your stdout MUST be exactly one of:
   - `STAGE_COMPLETE` — you finished all required deliverables.
   - `STAGE_BLOCKED: <reason>` — you cannot proceed.
   The runner parses this. Anything else fails the stage.

5. **Token economy.** Prefer finishing with a TODO list over rumination. If reasoning gets long, write what you have, list pending items in `PHASE9_TEST_PLAN.md`, and emit `STAGE_COMPLETE`.

## Setup already done by the runner — DO NOT repeat

- `npm install` ran in preflight if needed.
- `npx playwright install chromium` ran in preflight if needed.
- `npm run test:visual:baseline` ran in preflight if baselines were missing — mockup baselines live under `tests/visual/__screenshots__/baseline/<viewport>/<region>.png`.

## Mandatory references

- `CLAUDE.md` — language rule (English everywhere); Sakura `#FFB7C5` reserved for 3 uses.
- `PLAN.md` § 9.1–9.8 — pixel parity per region.
- `design/Sakura Prompt Studio _standalone_.html` — visual source of truth.
- `tailwind.config.ts`, `app/globals.css` — current tokens.
- `tests/visual/helpers/regions.ts` — selector contract (already exists).

## Architecture (already approved)

- Python (`tests/test_phase9_audit.py`) for token / DOM contract checks.
- Playwright TS under `tests/visual/` for visual regression with native `toHaveScreenshot`.
- Two viewports: `chromium-1440` (1440×900), `chromium-1920` (1920×1080). No mobile.
- Tolerance: `maxDiffPixelRatio: 0.02`, `threshold: 0.2`.

## Deliverables

Create exactly these files. Do not create anything else.

```
playwright.config.ts                            # extend if exists
tests/visual/_baseline.spec.ts                  # captures mockup baselines
tests/visual/sidebar.spec.ts
tests/visual/gallery-cards.spec.ts
tests/visual/tag-chips.spec.ts
tests/visual/viewer.spec.ts
tests/visual/three-pane-layout.spec.ts
tests/visual/variable-chips.spec.ts             # skip if Phase 5 not landed
tests/visual/helpers/regions.ts                 # extend if missing keys
tests/visual/helpers/computed-style.ts          # color/spacing assertions
tests/test_phase9_audit.py                      # static + DOM audit
phases/phase-9/PHASE9_TEST_PLAN.md              # spec inventory + initial failure list
```

## Per-spec coverage

### sidebar.spec.ts
- Visual: matches `mockup-sidebar` within tolerance, both viewports.
- DOM: fixed width (mockup px), branding block (🌸 + "Sakura") at top, consistent category padding.
- DOM: only the branding block uses sakura color in the sidebar.

### gallery-cards.spec.ts
- Visual: first card matches `mockup-gallery-card`.
- DOM: 1px border, no shadow at rest. Padding from mockup.
- DOM: 🌸 indicator iff content has `{{var}}`. Hover MUST NOT change color (Phase 10 owns glow).

### tag-chips.spec.ts
- Visual: matches `mockup-tag-chip`.
- DOM: neutral background (NOT sakura). Radius and font-size derived from mockup `rx`.

### variable-chips.spec.ts
- Visual: matches `mockup-variable-chip`.
- DOM: bg = sakura @ 20% alpha, border = sakura @ 50% alpha, wired via `var(--color-sakura)`.
- If Phase 5 not landed: `test.skip()` with clear reason. Do not delete.

### viewer.spec.ts
- Visual: matches `mockup-viewer`.
- DOM: rendered/raw toggle exists. Inter for prose, JetBrains Mono for code blocks.

### three-pane-layout.spec.ts
- Visual: matches `mockup-three-pane`, both viewports.
- DOM: `data-region` attrs present (`sidebar`, `gallery`, `viewer`, `layout-root`).
- DOM: 1px vertical separators between panes. No horizontal scroll at 1440.
- DOM: no inline `style=` containing `#FFB7C5`.

## tests/test_phase9_audit.py — required checks

1. Hardcoded color scan: walk `app/`, `components/`, `lib/`, `tests/` (skip `__screenshots__/`); fail on `#FFB7C5` or `255, 183, 197` outside `app/globals.css` and `tailwind.config.ts`.
2. Tailwind arbitrary color scan: fail on `bg-[#`, `text-[#`, `border-[#`, etc.
3. Three-region contract: assert all `data-region` attrs exist on `/`.
4. Body font: `getComputedStyle(document.body).fontFamily` includes `Inter`.

## Required helpers — `tests/visual/helpers/computed-style.ts`

- `expectColorToken(locator, prop, expected)` — normalize rgb / rgba / hex.
- `expectSpacingToken(locator, prop, allowedPx[])` — match Tailwind scale.
- `expectFontFamily(locator, expected)` — resolved `font-family` starts with expected.

## Hard constraints

- English only. No `.only` / `.skip` left committed (except documented Phase-5 case).
- No tolerance above 0.02 without justification in `PHASE9_TEST_PLAN.md`.
- No new design tokens here — Stage 2's job. Assert literal mockup values; flag TODOs.
- Disable animations in every spec via `addStyleTag` injecting `animation-duration: 0s !important; transition-duration: 0s !important`.

## PHASE9_TEST_PLAN.md — required content

- Spec inventory (file, purpose).
- Baseline inventory (region, file path, viewports).
- Tolerance declaration.
- Initial failure inventory: run `npm run test:visual` once, document each failure (test name, status, reason).

## Output expected at end of stage

- All deliverable files created.
- `npm run test:visual` exits non-zero with a documented failure list (expected — that IS the work list for Stage 2).
- `pytest tests/test_phase9_audit.py` exits non-zero with documented failures.
- `PHASE9_TEST_PLAN.md` populated.
- Last two lines of stdout, in order:
  1. `<short summary: # specs created, # baselines, top 5 failing assertions>`
  2. `STAGE_COMPLETE`

If you cannot proceed for any reason, the last line is `STAGE_BLOCKED: <one paragraph>`.
