# Plan B — Drop Playwright pixel-diff and formalize the working defenses

## Goal

Stop pretending Phase 9 has pixel-perfect screenshot regression. Replace it
with the audits that actually work today (DOM contracts, token discipline,
adversarial review against the standalone HTML), document the degrade
honestly, and remove the broken Playwright-baseline machinery from the
pipeline.

## Rationale

The standalone mockup is an illustrative SVG, not a renderable HTML/CSS
reference. Comparing pixels of the real Next.js app (HTML + CSS + Inter
font) against fragments of an SVG illustration was never going to produce
meaningful pass/fail signal — it just produced timeouts and false
confidence.

## Implementation steps

### 1. Remove the broken machinery

- Delete `tests/visual/_baseline.spec.ts`.
- Delete `tests/visual/__screenshots__/baseline/` if it exists.
- Remove the `test:visual` and `test:visual:baseline` npm scripts from
  `package.json` (or repurpose `test:visual` as an alias for the fast gate
  if anything still calls it).
- Remove the Playwright project entries that target `_baseline.spec.ts`
  from `playwright.config.ts` (keep the rest of the Playwright config — E2E
  Phase 7/8 tests still need it).

### 2. Strip Playwright pixel-diff out of `run-phase.ps1`

- Remove the pre-flight question
  `Run Playwright pixel-perfect tests after pipeline completes? [y/N]`.
- Remove the final opt-in block that runs `npm run test:visual`.
- Remove the preflight call to `npm run test:visual:baseline`.
- Keep the preflight `npm install` and `npx playwright install chromium`
  (still needed for E2E Phase 7/8).
- Keep `Invoke-FastAudit` (DOM audit + pytest) as the sole inside-loop gate.

### 3. Reinforce the audits that actually work

**`tests/visual/dom-audit.mjs`** — extend with:
- Computed `font-family` per region (sidebar, gallery card title, viewer
  prose, viewer code) — Inter for prose, JetBrains Mono for code.
- Spacing tokens on key elements: card padding, sidebar width,
  three-pane separator width.
- Presence of all required `data-testid` (`item-card`, `tag-chip`,
  `variable-chip`).
- No inline `style=` attribute containing sakura color in any form.

**`tests/test_phase9_audit.py`** — extend with:
- Per-component Tailwind class presence checks (sidebar uses fixed-width
  utility, gallery uses grid utilities, etc.) — read the JSX statically.
- Sakura color appears only in `tailwind.config.ts` and `app/globals.css`
  (already there, keep).

**`phases/phase-9/03-review.prompt.md`** — add a deliverable section to
`PHASE9_REVIEW.md`:
- A markdown table `| Region | Mockup excerpt | App excerpt | Deviation |
  Severity |` with at least one row per region (sidebar, gallery card,
  tag chip, variable chip, viewer header, viewer prose, viewer code).
- The reviewer reads `design/Sakura Prompt Studio _standalone_.html`
  inline and the running app's DOM, no screenshots required.

### 4. Rewrite `02-build.prompt.md`

- Remove the entire "Commands you MUST NOT run in this stage (hard ban)"
  block added in the previous patch — Playwright/baselines are gone, no
  ban needed.
- Remove every reference to Playwright, screenshots, or baseline files.
- Replace the §7 token-audit deferral language with a strict
  "`pytest tests/test_phase9_audit.py` exits 0 before you stop" line.
- Keep the fast-gate language pointing at `dom-audit.mjs` + `pytest`.

### 5. Document the degrade honestly

In `phases/phase-9/README.md` add a section "Why no pixel-diff":

> Phase 9 audits visual fidelity through DOM contracts, computed-style
> assertions, token discipline, and an adversarial review pass against
> `design/Sakura Prompt Studio _standalone_.html`. We considered
> Playwright `toHaveScreenshot` baselines but rejected them: the standalone
> mockup is an illustrative SVG, not a renderable HTML/CSS reference, so
> pixel-diff between app and mockup compares incompatible artifacts.

Mirror the same paragraph in `PHASE9_TEST_PLAN.md` under a new "Visual
audit strategy" heading.

### 6. Single end-of-pipeline run

After Stage 3 emits `PIPELINE_DECISION: APPROVED`, the runner does only:
- `node tests/visual/dom-audit.mjs`
- `python -m pytest tests/test_phase9_audit.py`
- Write the report.

No more opt-in question, no Playwright at the end.

## Verification — MUST pass before this plan is considered complete

Implementation is NOT done until every check below passes. If any check
fails, fix the underlying issue and re-run; do not declare done.

1. **Broken machinery is gone.**
   - `Test-Path tests/visual/_baseline.spec.ts` is `False`.
   - `Test-Path tests/visual/__screenshots__/baseline` is `False`.
   - `Select-String -Path package.json -Pattern 'test:visual:baseline'`
     returns no matches.
   - `Select-String -Path phases/phase-9/02-build.prompt.md -Pattern
     'baseline|test:visual|playwright'` returns no matches.

2. **Fast gate is richer than before.**
   - `node tests/visual/dom-audit.mjs` exits 0 against a running dev
     server and emits at least 12 distinct assertions in stdout (counting
     each `data-region`, `data-testid`, font-family, and inline-color
     check).
   - `python -m pytest tests/test_phase9_audit.py -v` lists at least 6
     test functions and exits 0.

3. **Pipeline runs end-to-end without Playwright.**
   ```powershell
   .\phases\phase-9\run-phase.ps1 -SkipTests
   ```
   - Total wall-clock under 20 minutes for a clean approval.
   - The runner does NOT ask `Run Playwright pixel-perfect tests after
     pipeline completes? [y/N]`.
   - Final report contains a "Visual audit strategy" section reflecting
     the new approach.
   - String `npm run test:visual` does not appear anywhere in the run log.

4. **Stage 2 cannot be blocked by Playwright.**
   `phases/phase-9/.pipeline-logs/*-2-build-loop1.log` ends with
   `STAGE_COMPLETE`. `Select-String -Path
   phases/phase-9/.pipeline-logs/*-2-build-loop1.log -Pattern
   'baseline|playwright|toHaveScreenshot'` returns no matches.

5. **Review deliverable contains the deviation table.**
   `phases/phase-9/PHASE9_REVIEW.md` includes the
   `| Region | Mockup excerpt | App excerpt | Deviation | Severity |`
   table with one row per documented region (≥7 rows).

6. **No regression in Phase 7/8 E2E.**
   `npm run test:e2e` still exits 0 (Playwright remains installed and
   wired for these tests; we only dropped the visual project).

## Concluding the implementation

Only when all six verification checks above pass, do the following — in
order — and then declare Plan B complete:

1. Stage and commit:
   ```powershell
   git add -A tests/visual phases/phase-9 package.json playwright.config.ts
   git commit -m "phase 9 plan B: drop pixel-diff, formalize DOM + review audit"
   ```
2. Append to `phases/phase-9/PHASE9_TEST_PLAN.md` under a new "Plan B
   resolution" heading: a one-paragraph summary of what was removed, what
   was strengthened, and the rationale ("mockup is illustrative SVG").
3. Reply to the user with the six verification check results (commands,
   exit codes, key counts) and a one-line summary: "Plan B complete:
   pixel-diff retired, DOM/static/review audits in force."

If any verification step fails and cannot be fixed within the same session,
do NOT declare Plan B complete. Instead, write the failure mode into
`PHASE9_TEST_PLAN.md` "Plan B blockers" and surface the issue to the user
before deleting any further file.
