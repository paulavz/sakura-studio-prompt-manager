# Test Fixes — Phased Plan (Index)

This folder splits the Playwright visual/E2E fix work into **small phases**, one per spec file. The objective is **speed**: stop re-running the full suite on every iteration.

## Core methodology (read before touching any test)

### 1. Diagnose ONE test at a time, never a set

When a test fails, work on it in isolation. The default `npx playwright test` runs everything and is forbidden during diagnosis.

Use **one** of these per-test commands (pick the one that uniquely targets the failing test):

```powershell
# By exact test title (preferred when title is unique):
npx playwright test -g "DOM: 1px border, no shadow at rest, padding from mockup"

# By file + line number (when titles collide or you want zero ambiguity):
npx playwright test tests/visual/gallery-cards.spec.ts:42

# By file (only for the final pass of a phase, never during single-test diagnosis):
npx playwright test tests/visual/gallery-cards.spec.ts
```

Rule: **never** invoke `npx playwright test` without a filter while diagnosing. Each retry of the whole set wastes minutes.

### 2. Loop tight: fix → re-run the SAME single test → repeat

For each failing test:

1. Run only that test (`-g "..."` or `file:line`).
2. Read the failure (locator, screenshot diff, console log).
3. Apply the smallest possible fix (component code or test code, not both at once).
4. Re-run **only that same test**.
5. Repeat until green.
6. Move to the next test in the phase — do **not** re-run the previous one yet.

### 3. End-of-phase regression: run only the phase's spec file

When every individual test in a phase is green, run **just that spec file** (not the whole suite):

```powershell
npx playwright test tests/visual/<phase-spec>.spec.ts
```

If green → mark phase done and move to the next phase. If a previously green test regresses, fix it in isolation (back to step 1) — do not re-run the file until the regressed test is green on its own.

### 4. Final regression — only after every phase is green

The full suite runs **once**, at the end, in `07-final-regression.md`. Not before.

```powershell
npx playwright test
```

## Seed strategy (critical for speed)

Today, `playwright.config.ts` wires a `globalSetup` (`tests/visual/helpers/seed.ts`) that seeds Supabase once before the whole run, and `globalTeardown` cleans at the end. This is fine for full-suite runs but **wrong for single-test iteration**, because:

- If you skip the global setup (by filtering), tests that depend on seed data fail with "no rows" / locator-not-found.
- If you keep it, every `-g` run still pays the seed cost (small but cumulative).

### Rule for tests that need seed data

When a failing test depends on seeded items/tags (anything that queries `items` or `tags` rows seeded in `seed.ts`):

- Inside that test (or its `test.beforeEach`), **call `seed()` at the start and `cleanup()` at the end** using the helpers already exported from `tests/visual/helpers/seed.ts`.
- Keep the per-test seed scoped to **only the IDs that test needs** (re-use the fixed UUIDs from `seed.ts` so it stays idempotent).
- This makes single-test runs self-contained: `npx playwright test -g "name"` works without relying on global setup.
- Leave `globalSetup`/`globalTeardown` in place for full-suite runs — `upsert` on fixed UUIDs is idempotent, so running per-test seed on top of global setup is safe.

Tests that are pure DOM/CSS checks (no DB rows required) do **not** need this; skip the seed wrapping for them.

## Optimization checklist (apply before starting each phase)

- [ ] Dev server is already running on `http://localhost:3000` (so `reuseExistingServer: true` in config kicks in and Playwright doesn't restart Next on every command).
- [ ] `.env.local` has `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_V1_USER_UUID` set (otherwise seed silently skips → tests fail mysteriously).
- [ ] Run a single sanity test first (e.g. one passing test from the phase) before diving into a failing one — confirms server + seed wiring is healthy.
- [ ] Use `--reporter=line` (already default) — avoid `--reporter=html` during iteration, it slows the loop.
- [ ] For visual-diff tests, when the diff is intentional, update the baseline with `--update-snapshots` scoped to the single test:
  ```powershell
  npx playwright test -g "exact title" --update-snapshots
  ```
  Never update snapshots for the whole suite.

## Phase order (smallest blast radius first)

1. **`01-three-pane-layout.md`** — layout primitives, foundation for everything else.
2. **`02-sidebar.md`** — sidebar DOM + visual.
3. **`03-gallery-cards.md`** — card DOM, 🌸 indicator, visual.
4. **`04-viewer.md`** — viewer panel, fonts, toggle.
5. **`05-variable-chips.md`** — chip color tokens.
6. **`06-tag-chips.md`** — tag chip styling.
7. **`07-final-regression.md`** — full suite once, then done.

Each phase file lists its individual tests, the exact per-test command, whether each test needs seed wrapping, and the diagnostic order.

## Hard rules (do not violate)

- **No `npx playwright test` without a filter** until phase 07.
- **No batch fixes**: one test, one fix, one re-run.
- **No baseline updates without visually confirming** the new screenshot is correct against `design/Sakura Prompt Studio _standalone_.html`.
- **No skipping** failing tests to "come back later" — finish the phase before moving on.
- **No editing more than one file** between re-runs (keeps the bisect trivial when something regresses).
