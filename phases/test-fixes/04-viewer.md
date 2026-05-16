# Phase 4 — `viewer.spec.ts`

Viewer panel — toggle + typography + baseline. Depends on having at least one item, because `beforeEach` clicks the first gallery card.

> **Reminder:** diagnosis is **per individual test**. See `00-INDEX.md`.

## Tests in this phase

| # | Test title | Needs seed? | Per-test command |
|---|---|---|---|
| 4.1 | `viewer panel matches mockup-viewer baseline` | **Yes** (clicks first card) | `npx playwright test -g "viewer panel matches mockup-viewer baseline"` |
| 4.2 | `rendered/raw toggle exists` | **Yes** (viewer renders after click) | `npx playwright test -g "rendered/raw toggle exists"` |
| 4.3 | `typography uses Inter for prose content` | **Yes** | `npx playwright test -g "typography uses Inter for prose content"` |
| 4.4 | `typography uses JetBrains Mono for code blocks` | **Yes** (seed `Visual Test Plan` item has a code-ish content; if no code block renders, the test self-skips) | `npx playwright test -g "typography uses JetBrains Mono"` |

The `beforeEach` already does `test.skip()` when no card exists, so without seed every test silently passes by skipping — which **hides real failures**. Always seed when iterating.

## Seed-per-test pattern

The spec already imports `seed, cleanup` (line 11) but does not call them. Add inside the describe:

```ts
test.beforeAll(async () => { await seed(); });
test.afterAll(async () => { await cleanup(); });
```

Rationale: every test in this describe needs at least one item. Per-test `try/finally` would re-seed 4× unnecessarily. `beforeAll/afterAll` is cheaper and idempotent.

If running a single test in isolation and you suspect the global setup didn't run, you can verify by checking that the gallery card exists before the `beforeEach` click — but with `beforeAll(seed)` added, this is no longer a concern.

## Recommended order

1. **4.2** (`rendered/raw toggle exists`) — fastest, no font / pixel checks. Confirms viewer DOM is mounted.
2. **4.3** (`Inter for prose`). Font check on `p, .ProseMirror, .prose`. If the Inter font isn't loaded, this fails fast and tells you to fix `app/layout.tsx` or font config.
3. **4.4** (`JetBrains Mono for code blocks`). May self-skip if no `code`/`pre` renders for the seeded item — that's acceptable, but if you want real coverage, add a seed item with a fenced code block.
4. **4.1** (visual baseline) last.

## Per-test loop

```powershell
npx playwright test -g "<exact title>"
# fix one file → re-run same command → repeat
```

No file-level runs between iterations.

## Test 4.4 — seed adjustment option

If you want 4.4 to assert (not skip), the seed needs an item whose rendered content contains a `code`/`pre` element. The current `Visual Test Plan` has markdown headers and a list, no code fence. Two options:

- **A.** Update one seed item in `tests/visual/helpers/seed.ts` to include `` ```ts\nconst x = 1;\n``` `` in its `content`.
- **B.** Leave as-is — 4.4 stays a soft assertion that runs only when a code block happens to be present.

Surface this to the user before changing seed data.

## Test 4.1 — baseline update guidance

Standard rule. Scope to single test, verify against `design/Sakura Prompt Studio _standalone_.html`:

```powershell
npx playwright test -g "viewer panel matches mockup-viewer baseline" --update-snapshots
```

## End of phase — single regression run

```powershell
npx playwright test tests/visual/viewer.spec.ts
```

Green → `05-variable-chips.md`. Regression → isolate, fix, re-run that single test, then re-run the file.

## Exit criteria

- All 4 tests pass individually (or 4.4 self-skips for a documented reason).
- Spec file passes in one shot.
- Seed/cleanup wired inside the describe.
