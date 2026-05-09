# Phase 9 — Pipeline (Gemini CLI free tier · OpenCode Go)

Automated runner for a single phase: **tests → (build → fast-audit → review loop)**.
After tests pass, it repeats build/fast-audit/review until review emits an approval marker
or a human makes a decision at the checkpoint. Each stage is delegated to a different model.

The runner is **provider-agnostic** — pass `-Provider gemini` (default) or `-Provider opencode`.

## Layout

```
phases/phase-9/
├── run-phase.ps1          # the pipeline
├── 01-tests.prompt.md     # writes / updates Playwright tests
├── 02-build.prompt.md     # implements the phase
├── 03-review.prompt.md    # critical code review
└── .pipeline-logs/        # created on first run (per-stage logs + report)

tests/visual/
└── dom-audit.mjs          # fast DOM-only gate used between loops (<15s, no pixel diff)
```

## Human checkpoints

The pipeline stops and asks for your input in four cases:

| When | Prompt |
|---|---|
| **Before stage 1** | `Run Playwright pixel-perfect tests after pipeline completes? [y/N]` |
| **Stage stalled** (no log output >`$InactivitySeconds`) | `[r]etry stage / [s]kip stage / [a]bort pipeline` |
| **Model self-aborts** (last line is `STAGE_BLOCKED: <reason>`) | `[r]etry stage / [s]kip stage / [a]bort pipeline` |
| **Max loops reached** without `PIPELINE_DECISION: APPROVED` | `[a]pprove anyway / [r]retry one more loop / [x]abort` |

The model never waits for Playwright tests between loops — only the fast DOM audit (<15s) runs
as a gate. Full Playwright pixel-perfect runs once at the end if you opted in.

## Prompt execution protocol

Each prompt (`01-tests.prompt.md`, `02-build.prompt.md`, `03-review.prompt.md`)
starts with an `EXECUTION PROTOCOL` block that the model must follow:

1. **Heartbeat.** Print `PROGRESS: <action>` before each meaningful action — the runner
   kills any stage silent for 5 minutes.
2. **Self-abort on loops.** If stuck after 3 attempts at the same fix, emit
   `STAGE_BLOCKED: <reason>` and exit (no infinite retry).
3. **No long-running commands.** `npm install`, `npx playwright install`, and
   `npm run test:visual:baseline` are owned by the runner's preflight, not the model.
4. **Last-line contract.** Stdout's last non-empty line must be `STAGE_COMPLETE` or
   `STAGE_BLOCKED: <reason>`. Review stage adds `PIPELINE_DECISION: APPROVED|CONTINUE`
   on the line just before `STAGE_COMPLETE`.
5. **Token economy.** Finish with TODOs over rumination.

This protocol is the primary defense against silent hangs; the watchdog is the safety net.

## Runner preflight

Before stage 1, the runner runs idempotently:

- `npm install` — only if `node_modules/` is missing.
- `npx playwright install chromium` — always (cached after first install).
- `npm run test:visual:baseline` — only if `tests/visual/__screenshots__/baseline/` is missing.

Re-running the pipeline back-to-back skips all of these on the second invocation.

## Models per provider

### Gemini (default — free tier via Google login, no API key)

| Stage  | Model                | Why                                  |
|--------|----------------------|--------------------------------------|
| tests  | `gemini-2.5-flash`   | Flash quota is generous              |
| build  | `gemini-2.5-flash`   | Flash quota is generous              |
| review | `gemini-2.5-flash`   | Pro is exhausted; do review externally with Claude (use `-SkipReview`) |

**Recommended workflow when Pro is exhausted:**

```powershell
# First iteration — generate tests + run build, skip in-pipeline review
.\phases\phase-9\run-phase.ps1 -SkipReview

# Paste the resulting diff / log to Claude, get critical review feedback
# Apply Claude's findings as updated guidance, then loop:

# Subsequent iterations — skip tests (harness already exists), only build
.\phases\phase-9\run-phase.ps1 -SkipTests -SkipReview
```

This gives you Claude's reasoning quality for review without burning Gemini Pro quota.

Authenticate once interactively before running the pipeline:

```powershell
gemini   # opens browser for Google login on first run, then exit with /quit or Ctrl+C
```

### OpenCode Go plan

| Stage  | Model                         | Why                                |
|--------|-------------------------------|------------------------------------|
| tests  | `opencode-go/glm-5.1`         | Cheap, long context, ok at codegen |
| build  | `opencode-go/kimi-k2.6`       | Strongest coder/agentic in Go tier |
| review | `opencode-go/deepseek-v4-pro` | Strongest reasoner in Go tier      |

Edit `$ModelsPerProvider` at the top of `run-phase.ps1` to override.

## Requirements

- PowerShell 5.1+ (Windows PowerShell or PowerShell 7).
- `gemini` CLI authenticated (run `gemini` once to log in via Google) — or `opencode` if using `-Provider opencode`.
- `node` — for `tests/visual/dom-audit.mjs` (fast gate between build/review loops).
- `python` — for `pytest tests/test_phase9_audit.py` (static code audit).
- `npm` — for the optional final `npm run test:visual` (Playwright pixel-perfect).
- Run inside the git repo (the script uses `git status` to detect changes).
- Dev server running on `localhost:3000` before invoking (for the DOM audit gate).

## Run

```powershell
# from C:\...\sakura-studio-promp-manager
# Default provider is Gemini (free tier)
.\phases\phase-9\run-phase.ps1

# Or explicitly:
.\phases\phase-9\run-phase.ps1 -Provider gemini
.\phases\phase-9\run-phase.ps1 -Provider opencode
```

The pipeline will ask one question before starting:

```
Run Playwright pixel-perfect tests after pipeline completes? [y/N]
```

Answer `y` to run `npm run test:visual` + `pytest test_phase9_audit.py` once after the
approved build. Answer `n` (or press Enter) to skip — you can run them manually later.

## Options

| Flag / Param              | Default   | Description |
|---------------------------|-----------|-------------|
| `-Provider`               | `gemini`  | Which CLI to drive each stage. `gemini` (free tier) or `opencode`. |
| `-SkipTests`              | off       | Skip the tests stage. Use on subsequent iterations once Stage 1 already produced the harness. |
| `-SkipReview`             | off       | Skip the review stage. Pipeline does `tests → build → audit → STOP`. Run review externally (e.g. with Claude) on the diff. |
| `-SkipE2E`                | off       | Skip all audits (DOM + Playwright). Also skips the pre-flight question. |
| `-InactivitySeconds`      | `300`   | Kill a stage that produces no log output for this many seconds, then ask you what to do. |
| `-StageWallClockSeconds`  | `1800`  | Absolute wall-clock limit per opencode stage (30 min). 0 = no limit. |
| `-MaxBuildReviewLoops`    | `2`     | Build/review iterations before the human checkpoint fires. |
| `-TestsPrompt`            | `phases/phase-9/01-tests.prompt.md`  | Override the tests prompt path. |
| `-BuildPrompt`            | `phases/phase-9/02-build.prompt.md`  | Override the build prompt path. |
| `-ReviewPrompt`           | `phases/phase-9/03-review.prompt.md` | Override the review prompt path. |
| `-LogDir`                 | `phases/phase-9/.pipeline-logs`      | Where logs and the final report are written. |
| `-RepoRoot`               | two levels above the script           | Where `npm`, `node`, and `git` are executed. |
| `-PrintOpenCodeLogs`      | `$true` | Pass `--print-logs` to opencode. |
| `-AutoApprovePermissions` | `$true` | Pass `--dangerously-skip-permissions` to opencode. |

Examples:

```powershell
# Tighten stall threshold to 3 minutes
.\phases\phase-9\run-phase.ps1 -InactivitySeconds 180

# Allow up to 3 build/review loops before asking
.\phases\phase-9\run-phase.ps1 -MaxBuildReviewLoops 3

# Skip all e2e / audits (fastest possible run)
.\phases\phase-9\run-phase.ps1 -SkipE2E
```

## Pipeline flow

```
preflight (assert opencode, npm, node, python, prompt files)
  │
  ▼
pre-flight question: Playwright at end? [y/N]
  │
  ▼
Stage 1 — tests  (01-tests.prompt.md → opencode)
  │
  ├── stall watchdog: kill + [r/s/a] if silent >$InactivitySeconds
  │
  ▼
LOOP 1..$MaxBuildReviewLoops:
  │
  ├── Stage 2 — build#N  (02-build.prompt.md → opencode)
  │     └── stall watchdog
  │
  ├── Invoke-FastAudit: node dom-audit.mjs + pytest test_phase9_audit.py  (~15s)
  │
  ├── Stage 3 — review#N  (03-review.prompt.md → opencode)
  │     └── stall watchdog
  │
  └── PIPELINE_DECISION: APPROVED? → exit loop
            else → next iteration
  │
  ▼
No approval after $MaxBuildReviewLoops?
  └── Human checkpoint: [a]pprove / [r]retry one more / [x]abort
  │
  ▼
opt-in: npm run test:visual + pytest (once, if y at pre-flight)
  │
  ▼
Write report to .pipeline-logs/YYYYMMDD-HHMMSS-report.md
```

## What you get per run

Inside `phases/phase-9/.pipeline-logs/`:

- `YYYYMMDD-HHMMSS-1-tests.log`         — full opencode stdout for the tests stage
- `YYYYMMDD-HHMMSS-2-build-loopN.log`   — full opencode stdout for each build stage
- `YYYYMMDD-HHMMSS-3-review-loopN.log`  — full opencode stdout for each review stage
- `YYYYMMDD-HHMMSS-report.md`           — consolidated Markdown report (summary table + log tails)

The report is written even if a stage fails (inside a `finally` block).

## dom-audit.mjs (fast gate)

`tests/visual/dom-audit.mjs` runs headless Chromium against `localhost:3000` (single viewport,
no screenshots) and checks:

- `data-region` attributes exist: `sidebar`, `gallery`, `viewer`, `layout-root`.
- `body` `fontFamily` includes `Inter`.
- No hardcoded `#FFB7C5` / `rgb(255, 183, 197)` in inline styles.

Target: <15s. Fails fast (`process.exit(1)`) on first batch of failures with a clear list.

Configure the base URL: `BASE_URL=http://localhost:4000 node tests/visual/dom-audit.mjs`

## Reusing for other phases

```powershell
Copy-Item -Recurse .\phases\phase-9 .\phases\phase-10
# edit phases/phase-10/*.prompt.md
.\phases\phase-10\run-phase.ps1
```

`$PSScriptRoot` keeps everything self-contained — no edits needed to the script itself.
