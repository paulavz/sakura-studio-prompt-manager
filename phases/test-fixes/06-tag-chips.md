# Phase 6 — `tag-chips.spec.ts`

Tag chip styling — neutral background, radius. Smallest phase.

> **Reminder:** diagnosis is **per individual test**. See `00-INDEX.md`.

## Tests in this phase

| # | Test title | Needs seed? | Per-test command |
|---|---|---|---|
| 6.1 | `visual match with mockup-tag-chip` | **Yes** (chips render on cards that have tags — seeded items have tags) | `npx playwright test -g "visual match with mockup-tag-chip"` |
| 6.2 | `DOM: neutral background (NOT sakura), radius and font-size from mockup` | **Yes** | `npx playwright test -g "neutral background"` |

## Seed-per-test pattern

Add inside the describe (mirror phases 3/4):

```ts
import { seed, cleanup } from "./helpers/seed";

test.beforeAll(async () => { await seed(); });
test.afterAll(async () => { await cleanup(); });
```

Seed items already carry tags (`visual_test`, `template_test`, `code_review`), so chips will render.

## Recommended order

1. **6.2** (DOM contract). Computed-style on background and `border-radius`. Fast. If the tag chip component uses sakura by mistake, this catches it.
2. **6.1** (visual baseline) last.

## Per-test loop

```powershell
npx playwright test -g "<exact title>"
# fix one file → re-run same command → repeat
```

No file-level runs between iterations.

## Test 6.2 — likely failure: hardcoded `border-radius: 4px`

Line 31 asserts `border-radius: 4px`. The spec comment notes: "The mockup design file shows tag chips with rx="2" for smaller ones, and rx="3" or "4" for others." If the implementation uses a different radius that matches the mockup, **fix the test value**, not the component — verify against `design/Sakura Prompt Studio _standalone_.html` first.

If both are correct but disagree, it's a contract mismatch — surface to the user.

## Test 6.1 — baseline update guidance

Standard rule:

```powershell
npx playwright test -g "visual match with mockup-tag-chip" --update-snapshots
```

Only after visual verification against the standalone HTML.

## End of phase — single regression run

```powershell
npx playwright test tests/visual/tag-chips.spec.ts
```

Green → final regression in `07-final-regression.md`.

## Exit criteria

- Both tests pass individually.
- Spec file passes in one shot.
- Tag chip background is **not** sakura (this is in the project's design rules — re-read `CLAUDE.md` §"Reglas estéticas" if uncertain).
