# Phase 3 — `gallery-cards.spec.ts`

Card DOM contract + 🌸 indicator + visual baseline. This is the **first phase that needs seed data** — the gallery must have items to render cards.

> **Reminder:** diagnosis is **per individual test**, never the file or full suite, until the regression step at the bottom. See `00-INDEX.md`.

## Tests in this phase

| # | Test title | Needs seed? | Per-test command |
|---|---|---|---|
| 3.1 | `visual match with mockup-gallery-card` | **Yes** (renders the first card) | `npx playwright test -g "visual match with mockup-gallery-card"` |
| 3.2 | `DOM: 1px border, no shadow at rest, padding from mockup` | **Yes** (asserts on `.nth(1)` — needs ≥2 items) | `npx playwright test -g "1px border, no shadow at rest"` |
| 3.3 | `DOM: 🌸 indicator iff content has {{var}}` | **Yes** (item with `{{task}}` already in seed: `Visual Test Template`) | `npx playwright test -g "indicator iff content has"` |

The current `seed.ts` provides 3 items (template with `{{}}`, plan, agent). That covers `.first()`, `.nth(1)`, and a card with variables.

## Seed-per-test pattern (apply to all 3 tests in this phase)

Single-test runs (`-g`) **do not** re-trigger `globalSetup` reliably across all Playwright invocations, and even when they do, you want self-contained tests. Wrap each test:

```ts
import { seed, cleanup } from "./helpers/seed";

test.beforeAll(async () => { await seed(); });
test.afterAll(async () => { await cleanup(); });
```

Place this **inside the `test.describe` block** so it scopes to this spec file. Existing `globalSetup`/`globalTeardown` stay — `upsert` on fixed UUIDs is idempotent and re-running cleanup on already-deleted rows is a no-op.

If seeding inside the spec is undesirable (e.g. because the same describe also has DOM-only tests later), wrap individual tests instead:

```ts
test("DOM: 1px border, no shadow at rest, padding from mockup", async ({ page }) => {
  await seed();
  try {
    // … existing test body …
  } finally {
    await cleanup();
  }
});
```

The `try/finally` matters: a failing assertion must not leak rows.

## Recommended order

1. **3.2** (`1px border, no shadow at rest`) — pure DOM check, fast feedback. If `data-region="gallery-card"` or the second card isn't rendering, fix here.
2. **3.3** (🌸 indicator). Currently asserts `count = 0` ("tests must FAIL" placeholder — see comment in spec line 43). Decide whether to make it real (assert the indicator appears on items with `{{var}}` and is absent on others, using `data-has-variable`) before "fixing" it. **Do not silently flip the expectation without the user confirming.**
3. **3.1** (visual baseline). Last, only after DOM is correct.

## Per-test loop

```powershell
npx playwright test -g "<exact title>"
# fix one file → re-run same command → repeat
```

No file-level runs between iterations.

## Test 3.3 — design decision before code

The spec currently has a self-acknowledged contradiction (expects `count(0)` while comment says "this will be refined"). Two options:

- **A.** Update the test to assert the real contract: `card[data-has-variable="true"]` contains the 🌸 indicator (`data-testid="variable-indicator"`), `card[data-has-variable="false"]` does not. Requires the component to emit `data-has-variable` and the indicator element.
- **B.** Leave the placeholder and treat this test as "skip for now" via `test.skip()`.

Surface this to the user before changing the test body — it's a contract decision, not a fix.

## Test 3.1 — baseline update guidance

Same rule as previous phases: only update the baseline if visual is verifiably correct vs. `design/Sakura Prompt Studio _standalone_.html`. Always scope:

```powershell
npx playwright test -g "visual match with mockup-gallery-card" --update-snapshots
```

## End of phase — single regression run

```powershell
npx playwright test tests/visual/gallery-cards.spec.ts
```

Green → `04-viewer.md`. Regression → isolate single failing test, fix it alone, re-run only it, then re-run the file.

## Exit criteria

- All 3 tests pass individually with `-g`.
- Spec file passes in one shot.
- No orphan seed rows in Supabase after the file-level run (cleanup ran).
