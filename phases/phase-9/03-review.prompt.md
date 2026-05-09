# Phase 9 — Pixel Perfect — STAGE 3: CRITICAL REVIEW

You are a Staff Frontend Engineer doing an adversarial review. Find what the
implementer missed: visual drift, hardcoded values, fragile selectors, token
violations, dead CSS, visual debt. Do not praise. List problems.

## EXECUTION PROTOCOL — read this before everything else

You MUST follow this protocol or the runner will kill you.

1. **Heartbeat.** Before each meaningful action (read a file, edit a file, run a command), print one line: `PROGRESS: <one line, what you are doing>`. The runner kills any stage that prints nothing for 5 minutes.

2. **Self-abort on loops.** If you attempt the same query 3 times without new findings, STOP. Print:
   `STAGE_BLOCKED: <one paragraph: what is blocking you, what you tried, what you would need from a human>`
   Then exit. Do NOT retry. Do NOT invent workarounds.

3. **No long-running commands.** Do NOT run `npm install`, `npx playwright install`, or any command >30s.

4. **Last-line contract.** The last three non-empty lines of your stdout MUST be exactly, in order:
   1. A short summary (counts per severity, top 3 critical findings, regression yes/no).
   2. `PIPELINE_DECISION: APPROVED` (zero critical findings) OR `PIPELINE_DECISION: CONTINUE` (≥1 critical).
   3. `STAGE_COMPLETE`
   The runner parses lines 2 and 3. Anything else fails the stage.

5. **Read-only stage.** Do NOT edit code. The next implementation cycle owns fixes.

## Mandatory references

- `CLAUDE.md`, `PLAN.md` § 9.1–9.8.
- `design/Sakura Prompt Studio _standalone_.html` — open and inspect element-by-element.
- `phases/phase-9/PHASE9_TEST_PLAN.md` — closed-failures inventory.
- `tailwind.config.ts`, `app/globals.css`, `components/`, `app/`.
- `tests/visual/`, `tests/test_phase9_audit.py`, `tests/visual/__screenshots__/`.

## Audit dimensions — each must be addressed

For every finding: cite **file:line**, give a **severity** (`critical` / `medium` / `minor`), and a concrete fix.

1. **Visual fidelity vs. mockup.** Walk every region (sidebar, gallery card, tag chip, viewer header, viewer body, separators) at 1440 and 1920. Document deviations with mockup-vs-app + suspected root cause.
2. **Token discipline.** Grep for hardcoded `#FFB7C5`, `255,183,197`, `255, 183, 197` outside `tailwind.config.ts` and `app/globals.css` (each = critical). Grep for `bg-\[#`, `text-\[#`, `border-\[#`, `from-\[#`, `to-\[#`, `via-\[#` (each = critical). Inline `style=` color (each = medium unless dynamic + justified).
3. **Sidebar (§ 9.1).** Branding block alignment, sakura confined to branding region, fixed width is exact px from mockup.
4. **Gallery cards (§ 9.2).** Padding / gap / border / radius / typography match. Zero hover-state color change (Phase 10 leak = critical). 🌸 indicator reuses `lib/variables.ts`.
5. **Tag chips (§ 9.3).** Neutral background. Radius from mockup `rx` (verify by inspection).
6. **Variable chips (§ 9.4).** Sakura @ 20% / 50%, wired through token. Skip = documented.
7. **Viewer (§ 9.5–9.6).** Three-pane proportions hold at both viewports. 1px separators between panes. Inter on prose, JetBrains Mono on code (verify computed `font-family`).
8. **Layout proportions.** No horizontal scroll at 1440. Gallery grid stable at 1920.
9. **Test harness quality.** Consistent `data-region` / `data-testid` attrs. Animations disabled in specs via `addStyleTag`. No dead Playwright spec files.
10. **Test/code coupling.** Test attrs only where tests need them. NO `process.env.NODE_ENV === 'test'` branches in components (= critical).
11. **Visual debt.** Dead CSS, duplicated values, magic numbers, WHAT-comments.
12. **Cross-phase regression.** `npm run test:e2e` (Phase 7/8) still passes. Any regression = critical.

## Required deliverable

Create `phases/phase-9/PHASE9_REVIEW.md` with this structure:

```markdown
# Phase 9 — Pixel Perfect — Review

## Summary
- Total findings: N
- Critical: N | Medium: N | Minor: N
- Cross-phase regressions: yes|no

## Critical
1. <one-line title>
   - File: `path/to/file.tsx:LINE`
   - Evidence: <what you observed>
   - Why critical: <reason>
   - Concrete fix: <one or two sentences>

## Medium
... same structure

## Minor
... same structure

## Refactors (max 5)
1. <title>
   - Scope: <files>
   - Why: <reason>
   - Risk: <low/medium/high>

## Visual deviation table
Inspect `design/Sakura Prompt Studio _standalone_.html` region by region and
compare against the running app DOM. One row per region — no empty rows.

| Region | Mockup value | App value | Deviation | Severity |
|---|---|---|---|---|
| sidebar width | Xpx | Ypx | ... | critical/medium/minor/none |
| sidebar branding block | ... | ... | ... | ... |
| gallery card padding | ... | ... | ... | ... |
| gallery card border | ... | ... | ... | ... |
| gallery card radius | ... | ... | ... | ... |
| tag chip background | ... | ... | ... | ... |
| tag chip radius | ... | ... | ... | ... |
| viewer prose font | Inter | ... | ... | ... |
| viewer code font | JetBrains Mono | ... | ... | ... |
| three-pane separators | 1px border | ... | ... | ... |
```

## Hard rules

- Be specific. "Spacing looks off" is useless. "Card padding is 24px in app vs 20px in mockup at `components/item-card.tsx:42`" is useful.
- Never just praise. "No findings" if a section is clean. Move on.
- Cap refactors at 5. Rest go in Minor.
- English everywhere.

## Output expected at end of stage

- `phases/phase-9/PHASE9_REVIEW.md` populated.
- Last three lines of stdout, in order:
  1. `<short summary: counts per severity, top 3 critical, regression yes/no>`
  2. `PIPELINE_DECISION: APPROVED` (zero critical) OR `PIPELINE_DECISION: CONTINUE` (≥1 critical)
  3. `STAGE_COMPLETE`

If you cannot proceed: replace lines 2 and 3 with a single `STAGE_BLOCKED: <one paragraph>` as the last non-empty line.
