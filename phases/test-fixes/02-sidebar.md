# Phase 2 — `sidebar.spec.ts`

Sidebar DOM contract + visual baseline. Phase 1 must be green first.

> **Reminder:** diagnosis is **per individual test**, never the file or full suite, until the regression step at the bottom. See `00-INDEX.md`.

## Tests in this phase

| # | Test title | Needs seed? | Per-test command |
|---|---|---|---|
| 2.1 | `visual match with mockup-sidebar` | No | `npx playwright test -g "visual match with mockup-sidebar"` |
| 2.2 | `DOM: fixed width, branding block, consistent category padding` | No | `npx playwright test -g "fixed width, branding block, consistent category padding"` |
| 2.3 | `DOM: only branding block uses sakura color in sidebar` | No | `npx playwright test -g "only branding block uses sakura color in sidebar"` |

No seed needed — sidebar renders without DB rows.

## Recommended order

1. **2.2** (DOM contract: width, branding block, emoji, sakura color on title). Most failure modes show up here first.
2. **2.3** (sakura color isolation on branding). Cheap follow-up to 2.2.
3. **2.1** (visual baseline). Run last; only meaningful once DOM is correct.

## Per-test loop

For each test N, in the order above:

```powershell
npx playwright test -g "<exact title>"
# read failure → fix one file → re-run THE SAME command → repeat until green
```

Do **not** run `tests/visual/sidebar.spec.ts` between iterations.

## Test 2.1 — baseline update guidance

Only update the baseline if the new render is verifiably correct against `design/Sakura Prompt Studio _standalone_.html`. Always scope to the single test:

```powershell
npx playwright test -g "visual match with mockup-sidebar" --update-snapshots
```

Then re-run without the flag to confirm stability.

## Common failure modes to look for (so you fix the root cause, not the symptom)

- `data-testid="branding-block"`, `branding-text-title`, `branding-emoji` missing → fix the component, not the selector.
- Width mismatch → `MOCKUP_VALUES.sidebarWidth` vs. computed `width` — check the Tailwind class or container constraint.
- Wrong color on title → must come from the sakura token (`--color-sakura` / `#FFB7C5`), not a hardcoded literal in JSX (Phase 1 test 1.5 would catch that, but inline styles aren't the only path — Tailwind arbitrary values count too).

## End of phase — single regression run

```powershell
npx playwright test tests/visual/sidebar.spec.ts
```

Green → proceed to `03-gallery-cards.md`. Regression → isolate and fix.

## Exit criteria

- All 3 tests pass individually.
- Full spec file passes in one shot.
- Phase 1 still green (you'll verify holistically in `07-final-regression.md`, not now).
