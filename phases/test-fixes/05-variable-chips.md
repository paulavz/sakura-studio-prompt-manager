# Phase 5 — `variable-chips.spec.ts`

Variable chip styling — sakura alpha tokens and `--color-sakura` custom property.

> **Reminder:** diagnosis is **per individual test**. See `00-INDEX.md`.

## Tests in this phase

| # | Test title | Needs seed? | Per-test command |
|---|---|---|---|
| 5.1 | `variable chip matches mockup-variable-chip baseline` | Depends — chips render in the drawer when a template with `{{}}` is opened. Yes, if the drawer must be opened on a seeded item. | `npx playwright test -g "variable chip matches mockup-variable-chip baseline"` |
| 5.2 | `variable chip background equals sakura at 20% alpha` | Same | `npx playwright test -g "background equals sakura at 20% alpha"` |
| 5.3 | `variable chip border equals sakura at 50% alpha` | Same | `npx playwright test -g "border equals sakura at 50% alpha"` |
| 5.4 | `variable chip uses --color-sakura custom property resolving to #FFB7C5` | Same | `npx playwright test -g "uses --color-sakura custom property"` |

Each test already `test.skip()`s if `REGIONS.variableChip` returns 0 elements — the contract says "Phase 5 (variables drawer) not yet implemented".

## Important — decide before fixing

Currently every test self-skips because the chip element doesn't render on page load (it's a drawer-only concern). Three states the user must pick from:

- **A. Drawer not implemented.** All 4 tests skip. **This is acceptable** — leave them as-is and move on to phase 6. Note that `test.skip()` results in PASS in CI, which is fine here because the skip message is explicit.
- **B. Drawer implemented but chip needs interaction.** The spec's `beforeEach` doesn't open the drawer. You'd need to:
  1. Seed an item with `{{var}}` (already done — `Visual Test Template`).
  2. In `beforeEach`, click the template card, then click the "Usar Template" button, then `await chip.waitFor(...)`.
  3. Add `beforeAll(seed)` / `afterAll(cleanup)`.
- **C. Chip rendered statically somewhere on the page.** Update `REGIONS.variableChip` to point at the actual element.

**Surface this to the user.** Do not silently flip from A to B without confirming the drawer is ready.

## If state B (real assertions)

Seed wrapping is required because the drawer needs a real template item:

```ts
import { seed, cleanup } from "./helpers/seed";

test.beforeAll(async () => { await seed(); });
test.afterAll(async () => { await cleanup(); });

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.locator(REGIONS.galleryCard, { hasText: "Visual Test Template" }).click();
  await page.getByRole("button", { name: /usar template/i }).click();
  await page.addStyleTag({
    content: "*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }",
  });
});
```

## Recommended order (state B)

1. **5.4** (`--color-sakura` custom property) — cheapest, just reads a CSS variable. If the variable isn't defined globally, every other test is doomed.
2. **5.2** (20% alpha background). Computed-style check.
3. **5.3** (50% alpha border). Same.
4. **5.1** (visual baseline). Last.

## Per-test loop

```powershell
npx playwright test -g "<exact title>"
# fix one file → re-run same command → repeat
```

## Test 5.1 — baseline update guidance

Standard rule. Single-test scope only.

## End of phase — single regression run

```powershell
npx playwright test tests/visual/variable-chips.spec.ts
```

Green (or all-skipped per state A) → `06-tag-chips.md`.

## Exit criteria

- All 4 tests either pass individually or skip with explicit, documented reason.
- Spec file passes in one shot.
- State (A/B/C) recorded in the commit message or PR description.
