#requires -Version 5.1
<#
  Sakura — Phase Pipeline (provider-agnostic: Gemini CLI free tier or OpenCode Go)

  Stages: tests prompt -> build/review loop (with fast DOM audit gate) -> opt-in pixel-perfect
  Model per stage is fixed in $ModelsPerProvider below.

  Human checkpoints:
    1. Pre-flight: asks whether to run Playwright pixel-perfect at the end.
    2. Stall watchdog: kills stage inactive >$InactivitySeconds and pauses for your decision.
    3. Model self-abort: when stage emits STAGE_BLOCKED:<reason>, pauses for your decision.
    4. Loop budget: after $MaxBuildReviewLoops without APPROVED, pauses for your decision.

  Paths default to files alongside this script ($PSScriptRoot), so it works
  regardless of the current working directory.
#>

[CmdletBinding()]
param(
  # Which CLI to drive each stage with. "gemini" uses Google's Gemini CLI free tier
  # (auth via Google login on first run). "opencode" uses the OpenCode Go plan.
  [ValidateSet("gemini", "opencode")]
  [string]$Provider = "gemini",
  [string]$TestsPrompt,
  [string]$BuildPrompt,
  [string]$ReviewPrompt,
  [string]$LogDir,
  [string]$RepoRoot,
  [switch]$SkipE2E,
  # Skip the tests stage entirely — useful for second-and-later iterations
  # where the test harness from Stage 1 already exists.
  [switch]$SkipTests,
  # Skip the review stage entirely — useful when you do review externally
  # (e.g. paste the build output to Claude) instead of inside the pipeline.
  [switch]$SkipReview,
  [bool]$PrintOpenCodeLogs = $true,
  [bool]$AutoApprovePermissions = $true,
  [int]$MaxBuildReviewLoops = 2,
  # Seconds without new log output before the stage is considered stalled (0 = no inactivity kill).
  [int]$InactivitySeconds = 300,
  # Absolute wall-clock limit per stage in seconds (0 = no limit).
  [int]$StageWallClockSeconds = 1800
)

$ErrorActionPreference = "Stop"
$startedAt = Get-Date

# Resolve defaults relative to the script location.
if (-not $TestsPrompt)  { $TestsPrompt  = Join-Path $PSScriptRoot "01-tests.prompt.md" }
if (-not $BuildPrompt)  { $BuildPrompt  = Join-Path $PSScriptRoot "02-build.prompt.md" }
if (-not $ReviewPrompt) { $ReviewPrompt = Join-Path $PSScriptRoot "03-review.prompt.md" }
if (-not $LogDir)       { $LogDir       = Join-Path $PSScriptRoot ".pipeline-logs" }
if (-not $RepoRoot)     { $RepoRoot     = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path }

# Model assignments per provider.
#   tests  : cheap + long context, ok at structured codegen
#   build  : strongest coder/agentic in the tier
#   review : strongest reasoner in the tier
$ModelsPerProvider = @{
  opencode = @{
    tests  = "opencode-go/glm-5.1"
    build  = "opencode-go/kimi-k2.6"
    review = "opencode-go/deepseek-v4-pro"
  }
  gemini = @{
    # gemini-2.5-flash: default. If you see MODEL_CAPACITY_EXHAUSTED (429 server
    # congestion), switch to gemini-2.5-flash-lite or gemini-3-flash-preview.
    # For review: use -SkipReview and do it externally with Claude (Pro exhausted).
    tests  = "gemini-2.5-flash"
    build  = "gemini-2.5-flash"
    review = "gemini-2.5-flash"
  }
}
$Models = $ModelsPerProvider[$Provider]
if ($null -eq $Models) {
  throw "No model assignments for provider '$Provider'"
}

$script:Report = New-Object System.Collections.Generic.List[object]
$script:PipelineError = $null

# ---------- helpers ----------

function Assert-Cmd($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Required command not found in PATH: $name"
  }
}

function Resolve-CliCommand {
  param([string]$Provider)
  if ($Provider -eq "gemini") {
    if (Get-Command "gemini.cmd" -ErrorAction SilentlyContinue) { return "gemini.cmd" }
    return "gemini"
  }
  if (Get-Command "opencode.cmd" -ErrorAction SilentlyContinue) { return "opencode.cmd" }
  return "opencode"
}

function Build-CliArgs {
  param([string]$Provider, [string]$Model)
  if ($Provider -eq "gemini") {
    # Gemini CLI non-interactive: use -p "@path" to load the prompt file via Gemini's
    # own @file include syntax. DO NOT use stdin redirect — -p overrides stdin so
    # piping < file would be ignored and gemini would receive "" or the literal flag value.
    # --skip-trust required: without it gemini refuses untrusted workspace and exits silently.
    # -p placeholder "@PROMPT_PATH" is replaced in Invoke-Stage once the path is known.
    $cliArgs = @("-m", $Model, "--skip-trust")
    if ($AutoApprovePermissions) { $cliArgs += "-y" }
    return $cliArgs
  }
  # OpenCode
  $cliArgs = @("run", "-m", $Model)
  if ($PrintOpenCodeLogs)      { $cliArgs += "--print-logs" }
  if ($AutoApprovePermissions) { $cliArgs += "--dangerously-skip-permissions" }
  return $cliArgs
}

function Assert-File($path) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Prompt file not found: $path"
  }
}

function Stop-ProcessTreeBestEffort([int]$processId) {
  if ($processId -le 0) { return }
  try { & taskkill.exe /PID $processId /T /F 2>$null | Out-Null } catch { }
}

function Invoke-Stage {
  param(
    [Parameter(Mandatory)] [string]$Name,
    [Parameter(Mandatory)] [string]$Prompt,
    [Parameter(Mandatory)] [string]$Model,
    [Parameter(Mandatory)] [string]$LogPath
  )

  $cliCommand = Resolve-CliCommand $Provider
  $runArgs = Build-CliArgs $Provider $Model

  $aggregateSeconds = 0

  Write-Host ""
  Write-Host "================================================================"
  Write-Host ("[{0}] {1} run  model={2}" -f $Name.ToUpper(), $Provider, $Model)
  Write-Host ("[{0}] prompt       ={1}" -f $Name.ToUpper(), $Prompt)
  Write-Host ("[{0}] log          ={1}" -f $Name.ToUpper(), $LogPath)
  if ($InactivitySeconds -gt 0) {
    Write-Host ("[{0}] stall-kill   ={1}s no output" -f $Name.ToUpper(), $InactivitySeconds)
  }
  if ($StageWallClockSeconds -gt 0) {
    Write-Host ("[{0}] wall-clock   ={1}s absolute max" -f $Name.ToUpper(), $StageWallClockSeconds)
  }
  Write-Host "================================================================"

  # stageLoop allows retrying the stage when user picks [r] after a stall.
  :stageLoop while ($true) {

    $stageStart = Get-Date
    Set-Content -LiteralPath $LogPath -Value "" -Encoding UTF8
    $exitCodePath = "$LogPath.exitcode"
    if (Test-Path -LiteralPath $exitCodePath) {
      Remove-Item -LiteralPath $exitCodePath -Force -ErrorAction SilentlyContinue
    }

    $argsJoined   = ($runArgs | ForEach-Object { $_ }) -join " "
    $promptRel    = $Prompt.Replace($RepoRoot + "\", "")
    $logRel       = $LogPath.Replace($RepoRoot + "\", "")
    $exitCodeRel  = $exitCodePath.Replace($RepoRoot + "\", "")

    # Gemini: pass prompt via -p "@path" (Gemini's file-include syntax).
    #         Do NOT redirect stdin — -p already supplies the prompt.
    # OpenCode: pass prompt file via stdin redirect (opencode reads instructions from stdin).
    if ($Provider -eq "gemini") {
      $cmdLine = "$cliCommand $argsJoined -p `"@$promptRel`" >> `"$logRel`" 2>&1 & echo %ERRORLEVEL% > `"$exitCodeRel`""
    } else {
      $cmdLine = "$cliCommand $argsJoined < `"$promptRel`" >> `"$logRel`" 2>&1 & echo %ERRORLEVEL% > `"$exitCodeRel`""
    }
    $proc = Start-Process -FilePath "cmd.exe" -ArgumentList @("/d", "/c", $cmdLine) `
              -PassThru -NoNewWindow -WorkingDirectory $RepoRoot

    $printedCount  = 0
    $lastLineCount = 0
    $lastGrowthAt  = Get-Date
    $stallDecision = $null

    while (-not $proc.HasExited) {
      # Wall-clock absolute cap
      if ($StageWallClockSeconds -gt 0) {
        $elapsedSec = [int](((Get-Date) - $stageStart).TotalSeconds)
        if ($elapsedSec -ge $StageWallClockSeconds) {
          Stop-ProcessTreeBestEffort $proc.Id
          throw ("Stage '{0}' hit wall-clock limit of {1}s" -f $Name, $StageWallClockSeconds)
        }
      }

      # Stream new log lines and track growth
      if (Test-Path -LiteralPath $LogPath) {
        $lines = Get-Content -LiteralPath $LogPath
        if ($null -ne $lines) {
          if ($lines.Count -gt $lastLineCount) {
            $lastGrowthAt  = Get-Date
            $lastLineCount = $lines.Count
          }
          for ($i = $printedCount; $i -lt $lines.Count; $i++) {
            Write-Host ("[{0}][{1}] {2}" -f (Get-Date -Format "HH:mm:ss"), $Name.ToUpper(), $lines[$i])
          }
          $printedCount = $lines.Count
        }
      }

      # Inactivity watchdog
      if ($InactivitySeconds -gt 0) {
        $silentSec = [int](((Get-Date) - $lastGrowthAt).TotalSeconds)
        if ($silentSec -ge $InactivitySeconds) {
          Stop-ProcessTreeBestEffort $proc.Id
          Write-Host ""
          Write-Host ("[STALL][{0}] No log output for {1}s. Last lines:" -f $Name.ToUpper(), $InactivitySeconds)
          if (Test-Path -LiteralPath $LogPath) {
            Get-Content -LiteralPath $LogPath -Tail 20 | ForEach-Object { Write-Host "  $_" }
          }
          Write-Host ""
          $stallDecision = Read-Host ("[r]etry stage / [s]kip stage / [a]bort pipeline")
          break
        }
      }

      Start-Sleep -Milliseconds 400
    }

    $elapsedThisAttempt = [int](((Get-Date) - $stageStart).TotalSeconds)
    $aggregateSeconds  += $elapsedThisAttempt

    # Handle stall decision before checking exit code
    if ($null -ne $stallDecision) {
      if ($stallDecision -match '^a') {
        $script:Report.Add([pscustomobject]@{
          Stage = $Name; Model = $Model; Prompt = $Prompt
          LogPath = $LogPath; Seconds = $aggregateSeconds; Status = "aborted"; Error = "stall"
        })
        throw ("Pipeline aborted by user after stall in stage '{0}'" -f $Name)
      }
      if ($stallDecision -match '^s') {
        $script:Report.Add([pscustomobject]@{
          Stage = $Name; Model = $Model; Prompt = $Prompt
          LogPath = $LogPath; Seconds = $aggregateSeconds; Status = "skipped"; Error = $null
        })
        Write-Host ("[{0}] Stage skipped by user decision." -f $Name.ToUpper())
        return
      }
      # [r] or anything else → retry
      Write-Warning ("[{0}] Retrying after stall..." -f $Name.ToUpper())
      continue stageLoop
    }

    # Normal exit — flush remaining lines
    $proc.WaitForExit()
    if (Test-Path -LiteralPath $LogPath) {
      $lines = Get-Content -LiteralPath $LogPath
      if ($null -ne $lines) {
        for ($i = $printedCount; $i -lt $lines.Count; $i++) {
          Write-Host ("[{0}][{1}] {2}" -f (Get-Date -Format "HH:mm:ss"), $Name.ToUpper(), $lines[$i])
        }
      }
    }

    # Parse last non-empty line for STAGE_BLOCKED contract.
    # The model self-aborts cleanly when stuck — must be handled before exit-code check
    # because some agents exit 0 even after declaring themselves blocked.
    $lastNonEmpty = $null
    if (Test-Path -LiteralPath $LogPath) {
      $tail = Get-Content -LiteralPath $LogPath -Tail 10 |
                Where-Object { $_.Trim() -ne "" }
      if ($tail) { $lastNonEmpty = ($tail | Select-Object -Last 1).Trim() }
    }

    if ($lastNonEmpty -match '^STAGE_BLOCKED:\s*(.+)$') {
      $reason = $Matches[1]
      Write-Host ""
      Write-Host ("[BLOCKED][{0}] Model self-aborted. Reason:" -f $Name.ToUpper())
      Write-Host ("  {0}" -f $reason)
      Write-Host ""
      $blockChoice = Read-Host "[r]etry stage / [s]kip stage / [a]bort pipeline"

      if ($blockChoice -match '^a') {
        $script:Report.Add([pscustomobject]@{
          Stage = $Name; Model = $Model; Prompt = $Prompt
          LogPath = $LogPath; Seconds = $aggregateSeconds; Status = "blocked"
          Error = $reason
        })
        throw ("Pipeline aborted by user after model-reported block in stage '{0}'" -f $Name)
      }
      if ($blockChoice -match '^s') {
        $script:Report.Add([pscustomobject]@{
          Stage = $Name; Model = $Model; Prompt = $Prompt
          LogPath = $LogPath; Seconds = $aggregateSeconds; Status = "skipped"
          Error = "model-reported: $reason"
        })
        Write-Host ("[{0}] Stage skipped by user decision after model block." -f $Name.ToUpper())
        return
      }
      Write-Warning ("[{0}] Retrying after model-reported block..." -f $Name.ToUpper())
      continue stageLoop
    }

    # Read exit code written by cmd wrapper
    $exitCode = 0
    if (Test-Path -LiteralPath $exitCodePath) {
      $raw = (Get-Content -LiteralPath $exitCodePath -Raw).Trim()
      $parsed = 0
      if ([int]::TryParse($raw, [ref]$parsed)) { $exitCode = $parsed }
    }

    # Hard fail when the stage did not honor the last-line contract.
    # This catches silent ghost runs (e.g. Gemini refusing an untrusted folder
    # and exiting 0 without doing work) that would otherwise be reported as "ok".
    # Review stage emits PIPELINE_DECISION before STAGE_COMPLETE; tolerate both forms.
    if ($lastNonEmpty -ne "STAGE_COMPLETE" -and $lastNonEmpty -notmatch '^PIPELINE_DECISION:') {
      Write-Host ""
      Write-Host ("[CONTRACT-FAIL][{0}] Stage did not end with STAGE_COMPLETE." -f $Name.ToUpper())
      Write-Host ("  Last log line: '{0}'" -f $lastNonEmpty)
      Write-Host "  This usually means the model never actually executed (e.g. trust prompt, auth failure, empty response)."
      Write-Host ""
      $contractChoice = Read-Host "[r]etry stage / [s]kip stage / [a]bort pipeline"

      if ($contractChoice -match '^a') {
        $script:Report.Add([pscustomobject]@{
          Stage = $Name; Model = $Model; Prompt = $Prompt
          LogPath = $LogPath; Seconds = $aggregateSeconds; Status = "contract-fail"
          Error = "Last line: $lastNonEmpty"
        })
        throw ("Pipeline aborted by user after contract failure in stage '{0}'" -f $Name)
      }
      if ($contractChoice -match '^s') {
        $script:Report.Add([pscustomobject]@{
          Stage = $Name; Model = $Model; Prompt = $Prompt
          LogPath = $LogPath; Seconds = $aggregateSeconds; Status = "skipped"
          Error = "contract-fail: $lastNonEmpty"
        })
        Write-Host ("[{0}] Stage skipped by user decision." -f $Name.ToUpper())
        return
      }
      Write-Warning ("[{0}] Retrying after contract failure..." -f $Name.ToUpper())
      continue stageLoop
    }

    if ($exitCode -ne 0) {
      $script:Report.Add([pscustomobject]@{
        Stage = $Name; Model = $Model; Prompt = $Prompt
        LogPath = $LogPath; Seconds = $aggregateSeconds; Status = "failed"
        Error = "$Provider exit $exitCode"
      })
      throw ("{0} exit {1}" -f $Provider, $exitCode)
    }

    $script:Report.Add([pscustomobject]@{
      Stage = $Name; Model = $Model; Prompt = $Prompt
      LogPath = $LogPath; Seconds = $aggregateSeconds; Status = "ok"; Error = $null
    })
    Write-Host ("[{0}] ok in {1}s" -f $Name.ToUpper(), $aggregateSeconds)
    break stageLoop
  }
}


function Invoke-FastAudit {
  param([Parameter(Mandatory)][string]$Label)
  if ($SkipE2E) { Write-Host "[FAST-AUDIT:$Label] skipped (-SkipE2E)"; return }

  Write-Host ""
  Write-Host "[FAST-AUDIT:$Label] DOM selectors + static code audit  (cwd=$RepoRoot)"
  Push-Location $RepoRoot
  try {
    & node tests/visual/dom-audit.mjs
    if ($LASTEXITCODE -ne 0) {
      throw "DOM audit failed at checkpoint '$Label' (exit $LASTEXITCODE)"
    }
    & python -m pytest tests/test_phase9_audit.py -x -q
    if ($LASTEXITCODE -ne 0) {
      throw "Static audit failed at checkpoint '$Label' (exit $LASTEXITCODE)"
    }
  }
  finally { Pop-Location }
  Write-Host "[FAST-AUDIT:$Label] ok"
}


function Get-RepoStatusHash {
  Push-Location $RepoRoot
  try { (& git status --porcelain) -join "`n" | Out-String } catch { "" }
  finally { Pop-Location }
}

function Test-ReviewApproved {
  param([Parameter(Mandatory)][string]$LogPath)
  if (-not (Test-Path -LiteralPath $LogPath)) { return $false }
  foreach ($line in (Get-Content -LiteralPath $LogPath)) {
    if ($line -match "PIPELINE_DECISION:\s*APPROVED") { return $true }
  }
  return $false
}

function Write-FinalReport {
  param(
    [Parameter(Mandatory)][string]$Path,
    [Parameter(Mandatory)][int]$TotalSeconds,
    [string]$PipelineErrorMessage = ""
  )

  $sb = New-Object System.Text.StringBuilder
  [void]$sb.AppendLine("# Sakura Phase Pipeline Report")
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("- Started: $($startedAt.ToString('u'))")
  [void]$sb.AppendLine("- Duration: ${TotalSeconds}s")
  [void]$sb.AppendLine("- Repo: $RepoRoot")
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("## Stages")
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("| Stage | Model | Status | Seconds | Log |")
  [void]$sb.AppendLine("|---|---|---|---:|---|")
  foreach ($r in $script:Report) {
    [void]$sb.AppendLine("| $($r.Stage) | $($r.Model) | $($r.Status) | $($r.Seconds) | $([System.IO.Path]::GetFileName($r.LogPath)) |")
  }
  [void]$sb.AppendLine("")
  foreach ($r in $script:Report) {
    [void]$sb.AppendLine("## $($r.Stage) - log tail")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine('```')
    if (Test-Path -LiteralPath $r.LogPath) {
      Get-Content -LiteralPath $r.LogPath -Tail 80 | ForEach-Object { [void]$sb.AppendLine($_) }
    }
    [void]$sb.AppendLine('```')
    [void]$sb.AppendLine("")
  }

  if (-not [string]::IsNullOrWhiteSpace($PipelineErrorMessage)) {
    [void]$sb.AppendLine("## Pipeline halt")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine('```')
    foreach ($chunk in ($PipelineErrorMessage -split "`n")) {
      [void]$sb.AppendLine($chunk)
    }
    [void]$sb.AppendLine('```')
    [void]$sb.AppendLine("")
  }

  Set-Content -LiteralPath $Path -Value $sb.ToString() -Encoding UTF8
}

# ---------- preflight ----------

Write-Host "Sakura Phase Pipeline"
Write-Host "  script root       : $PSScriptRoot"
Write-Host "  repo root         : $RepoRoot"
Write-Host ("  provider          : {0}" -f $Provider)
Write-Host ("  models            : tests={0}  build={1}  review={2}" -f $Models.tests, $Models.build, $Models.review)
Write-Host ("  inactivity kill   : {0}s (0 = off)" -f $InactivitySeconds)
Write-Host ("  wall-clock limit  : {0}s per stage (0 = off)" -f $StageWallClockSeconds)
Write-Host ("  max build/review  : {0} loops before human checkpoint" -f $MaxBuildReviewLoops)

if ($Provider -eq "gemini") { Assert-Cmd "gemini" } else { Assert-Cmd "opencode" }
Assert-Cmd "npm"
Assert-Cmd "python"
Assert-Cmd "node"
Assert-File $TestsPrompt
Assert-File $BuildPrompt
Assert-File $ReviewPrompt

if (-not (Test-Path -LiteralPath $LogDir)) {
  New-Item -ItemType Directory -Path $LogDir | Out-Null
}
$stamp       = Get-Date -Format "yyyyMMdd-HHmmss"
$reportPath  = Join-Path $LogDir "$stamp-report.md"

# ---------- preflight: idempotent setup (heavy commands stay out of model prompts) ----------

Write-Host ""
Write-Host "[preflight] Verifying setup..."
Push-Location $RepoRoot
try {
  if (-not (Test-Path "node_modules")) {
    Write-Host "[preflight] node_modules missing -> running npm install (this can take a few minutes)..."
    & npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed (exit $LASTEXITCODE)" }
  } else {
    Write-Host "[preflight] node_modules present, skipping npm install."
  }

  Write-Host "[preflight] Ensuring Playwright Chromium is installed..."
  & npx --yes playwright install chromium 2>&1 | Out-Null

}
finally { Pop-Location }
# Pixel-perfect Playwright baselines are not used in Phase 9 (mockup is
# illustrative SVG, not renderable HTML). Visual fidelity is audited via
# dom-audit.mjs + pytest + adversarial review. See PLAN_B_DEGRADE_AND_FORMALIZE.md.

$preBuildHash = Get-RepoStatusHash

try {
  # ---------- 1. TESTS ----------
  if ($SkipTests) {
    Write-Host ""
    Write-Host "[TESTS] skipped (-SkipTests). Reusing existing test harness from previous run."
  }
  else {
    Invoke-Stage -Name "tests" -Prompt $TestsPrompt -Model $Models.tests `
                 -LogPath (Join-Path $LogDir "$stamp-1-tests.log")
  }

  # ---------- 2/3. BUILD + (optional) REVIEW LOOP ----------
  $loopApproved = $false

  if ($SkipReview) {
    # Single build pass + fast audit, no review. User does review externally
    # (e.g. paste the diff to Claude). Pipeline stops cleanly afterwards.
    Write-Host ""
    Write-Host "---------------- BUILD ONLY (review skipped) ----------------"

    $buildLog = Join-Path $LogDir "$stamp-2-build.log"
    Invoke-Stage -Name "build" -Prompt $BuildPrompt -Model $Models.build -LogPath $buildLog

    $postBuildHash = Get-RepoStatusHash
    if ($preBuildHash -eq $postBuildHash) {
      Write-Warning "BUILD produced no file changes. Verify the agent actually executed edits."
    }

    Invoke-FastAudit -Label "after-build"

    Write-Host ""
    Write-Host "[PIPELINE] Build + fast-audit complete. Review skipped (-SkipReview)."
    Write-Host "[PIPELINE] Run external review (e.g. Claude) on the diff, then re-run with -SkipTests for the next build pass."
    $loopApproved = $true
  }
  else {
    for ($loop = 1; $loop -le $MaxBuildReviewLoops; $loop++) {
      Write-Host ""
      Write-Host ("---------------- BUILD/REVIEW LOOP {0}/{1} ----------------" -f $loop, $MaxBuildReviewLoops)

      $buildLog = Join-Path $LogDir ("{0}-2-build-loop{1}.log" -f $stamp, $loop)
      Invoke-Stage -Name ("build#{0}" -f $loop) -Prompt $BuildPrompt -Model $Models.build -LogPath $buildLog

      $postBuildHash = Get-RepoStatusHash
      if ($preBuildHash -eq $postBuildHash) {
        Write-Warning "BUILD loop produced no file changes. Verify the agent actually executed edits."
      }
      $preBuildHash = $postBuildHash

      # Fast DOM + static audit (replaces full Playwright gate)
      Invoke-FastAudit -Label ("after-build-loop{0}" -f $loop)

      $reviewLog = Join-Path $LogDir ("{0}-3-review-loop{1}.log" -f $stamp, $loop)
      Invoke-Stage -Name ("review#{0}" -f $loop) -Prompt $ReviewPrompt -Model $Models.review -LogPath $reviewLog

      if (Test-ReviewApproved -LogPath $reviewLog) {
        Write-Host ("[REVIEW] Approval marker found in loop {0}." -f $loop)
        $loopApproved = $true
        break
      }

      Write-Warning ("[REVIEW] No approval marker in loop {0}." -f $loop)
    }
  }

  # ---------- Human checkpoint: no approval after max loops ----------
  if (-not $loopApproved) {
    Write-Host ""
    Write-Host ("================================================================")
    Write-Host ("[PIPELINE] {0} build/review loops completed without APPROVED." -f $MaxBuildReviewLoops)
    Write-Host ("================================================================")
    $decision = Read-Host "[a]pprove anyway / [r]retry one more loop / [x]abort"

    if ($decision -match '^a') {
      $loopApproved = $true
      Write-Host "[PIPELINE] Approved by user override."
    }
    elseif ($decision -match '^r') {
      $extraLoop = $MaxBuildReviewLoops + 1
      Write-Host ("[PIPELINE] Running one extra loop ({0})..." -f $extraLoop)

      $buildLog = Join-Path $LogDir ("{0}-2-build-loop{1}.log" -f $stamp, $extraLoop)
      Invoke-Stage -Name ("build#{0}" -f $extraLoop) -Prompt $BuildPrompt -Model $Models.build -LogPath $buildLog

      $postBuildHash = Get-RepoStatusHash
      if ($preBuildHash -eq $postBuildHash) {
        Write-Warning "Extra BUILD loop produced no file changes."
      }

      Invoke-FastAudit -Label ("after-build-loop{0}" -f $extraLoop)

      $reviewLog = Join-Path $LogDir ("{0}-3-review-loop{1}.log" -f $stamp, $extraLoop)
      Invoke-Stage -Name ("review#{0}" -f $extraLoop) -Prompt $ReviewPrompt -Model $Models.review -LogPath $reviewLog

      if (Test-ReviewApproved -LogPath $reviewLog) {
        Write-Host ("[REVIEW] Approval marker found in extra loop {0}." -f $extraLoop)
        $loopApproved = $true
      } else {
        Write-Warning "[REVIEW] Still no approval. Stopping pipeline."
        throw ("No approval after {0} loops + 1 extra. Aborting." -f $MaxBuildReviewLoops)
      }
    }
    else {
      throw ("Pipeline aborted by user after {0} loops." -f $MaxBuildReviewLoops)
    }
  }

  # Final static audit (always runs after approved build)
  if ($loopApproved) {
    Write-Host ""
    Write-Host "[FINAL-AUDIT] Running dom-audit + pytest..."
    Invoke-FastAudit -Label "final"
    Write-Host "[FINAL-AUDIT] ok"
  }
}
catch {
  $script:PipelineError = $_.Exception.Message
  throw
}
finally {
  $total = [int]((Get-Date) - $startedAt).TotalSeconds
  Write-FinalReport -Path $reportPath -TotalSeconds $total `
    -PipelineErrorMessage $(if ($null -eq $script:PipelineError) { "" } else { $script:PipelineError })
  Write-Host ""
  Write-Host "================================================================"
  Write-Host ("Pipeline finished in {0}s" -f $total)
  Write-Host ("Logs:   {0}" -f (Resolve-Path $LogDir))
  Write-Host ("Report: {0}" -f $reportPath)
  Write-Host "================================================================"
}
