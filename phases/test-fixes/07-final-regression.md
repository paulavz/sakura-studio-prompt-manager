# Phase 7 — Final regression (full suite)

The **only** moment in this workflow where the entire suite runs. All previous phases must be individually green before starting this phase.

> **Reminder:** if anything fails here, **do not** retry the full suite. Drop back to per-test diagnosis. See `00-INDEX.md`.

## Pre-flight checklist

- [ ] Phase 1 (`three-pane-layout`) spec file passes in one shot.
- [ ] Phase 2 (`sidebar`) spec file passes in one shot.
- [ ] Phase 3 (`gallery-cards`) spec file passes in one shot.
- [ ] Phase 4 (`viewer`) spec file passes in one shot.
- [ ] Phase 5 (`variable-chips`) spec file passes in one shot (or fully skips per documented state).
- [ ] Phase 6 (`tag-chips`) spec file passes in one shot.
- [ ] Dev server already running on `http://localhost:3000` (avoid Next.js cold start on the long run).
- [ ] `.env.local` has Supabase vars set (global seed will run).
- [ ] No orphan rows from earlier per-test seeds in Supabase (run `cleanup()` once manually if unsure).

## The one command

```powershell
npx playwright test
```

That's it. Single invocation. Single worker (config already enforces `workers: 1`, `fullyParallel: false`).

## If everything passes

- Mark `fase-8` ready for review/merge.
- Optionally generate the HTML report **once** for the user to inspect:
  ```powershell
  npx playwright show-report
  ```
- Commit any baseline updates made along the way with a message that lists which baselines changed and why (link to the standalone HTML reference).

## If something fails

**Do not** re-run `npx playwright test`. The whole point of phases 1–6 is to avoid that. Instead:

1. Read the failing test's title from the `list` reporter output.
2. Run only that test:
   ```powershell
   npx playwright test -g "<exact failing title>"
   ```
3. Diagnose the regression (likely a side-effect from a fix in another phase).
4. Fix one file.
5. Re-run only that single test until green.
6. Re-run only the affected phase's spec file.
7. **Then** re-run the full suite once more.

Do not enter a "fix → full-suite" loop. That is the antipattern the entire phased plan exists to prevent.

## Common regression patterns to expect

- **Phase 3 fixed `data-region` on a card** → broke Phase 1's `three regions present`. Fix the test selectors or restore the attribute on the right element.
- **Phase 4 changed font loading** → broke Phase 2's sidebar title color render (font-rendering shifts pixel diff). Re-update the sidebar baseline (single-test scope).
- **Phase 6 changed tag chip radius** → broke Phase 3's gallery card visual baseline (chips render inside cards). Update the gallery-card baseline (single-test scope).

In every case: isolate, fix, re-run single test, then phase file, then full suite — exactly once each.

## Exit criteria

- `npx playwright test` returns green on the first try after the pre-flight checklist is complete.
- All baselines updated through this workflow were verified against `design/Sakura Prompt Studio _standalone_.html` before being saved.
- No `npx playwright test` invocation was used as a debugging tool — only as a final verifier.
