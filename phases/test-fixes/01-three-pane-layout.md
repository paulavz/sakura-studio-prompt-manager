# Phase 1 — `three-pane-layout.spec.ts`

Foundation phase. Layout primitives have to be right before anything else makes sense.

> **Reminder:** diagnosis is **per individual test**. Never run the whole spec file or full suite during this phase except for the final regression step at the bottom. See `00-INDEX.md`.

## Tests in this phase

| # | Test title | Needs seed? | Per-test command |
|---|---|---|---|
| 1.1 | `app three-pane matches mockup-three-pane baseline` | No (DOM exists without rows) | `npx playwright test -g "app three-pane matches mockup-three-pane baseline"` |
| 1.2 | `three regions present with data-region attributes` | No | `npx playwright test -g "three regions present with data-region attributes"` |
| 1.3 | `vertical separators exist between panes` | No | `npx playwright test -g "vertical separators exist between panes"` |
| 1.4 | `layout root has no horizontal scroll at 1440 width` | No | `npx playwright test -g "layout root has no horizontal scroll"` |
| 1.5 | `no element has hardcoded #FFB7C5 in inline style` | No | `npx playwright test -g "no element has hardcoded"` |

None of these depend on seeded items — they assert layout shells / DOM contracts. **Skip seed wrapping**.

## Recommended order

Fix in this order — earlier fixes unblock later ones:

1. **1.2** first (regions present). If `data-region` selectors are wrong, every other test fails noisily.
2. **1.3** next (separators). Tiny DOM/CSS contract.
3. **1.4** (no horizontal scroll). Overflow regressions cascade into baseline diffs.
4. **1.5** (no hardcoded `#FFB7C5`). Fast string scan.
5. **1.1** last (visual baseline). Only meaningful once DOM is correct; otherwise you're updating the baseline against a broken layout.

## Per-test loop (apply to each one in order)

For test N:

```powershell
# 1. Run only this test
npx playwright test -g "<exact title from table above>"

# 2. Read failure → locator? computed style? pixel diff?
# 3. Edit ONE file (component OR test, not both)
# 4. Re-run THE SAME COMMAND
# 5. Green? → move to next test in the order. Not green? → step 2.
```

**Do not** run `tests/visual/three-pane-layout.spec.ts` (whole file) between individual fixes.

## Test 1.1 special note — baseline update

If 1.1 fails with a visual diff and the new rendering is **actually correct** (verified against `design/Sakura Prompt Studio _standalone_.html`):

```powershell
npx playwright test -g "app three-pane matches mockup-three-pane baseline" --update-snapshots
```

Then re-run without `--update-snapshots` to confirm it's stable. Never use `--update-snapshots` without a `-g` filter.

## End of phase — single regression run

When all 5 tests pass individually:

```powershell
npx playwright test tests/visual/three-pane-layout.spec.ts
```

- Green → mark phase 1 done, proceed to `02-sidebar.md`.
- Any test regresses → isolate it (`-g "<title>"`), fix it alone, re-run only it. Repeat the file-level run only after the regressed test passes alone.

## Exit criteria

- All 5 tests pass individually with `-g`.
- The full spec file passes in one shot.
- No `--update-snapshots` was run without a `-g` filter.
