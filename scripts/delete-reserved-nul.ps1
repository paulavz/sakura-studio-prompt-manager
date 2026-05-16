# Deletes a file literally named "nul" in the repo root (Windows reserved device name).
# Close any editor tab showing "nul" before running.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/delete-reserved-nul.ps1

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$extended = "\\?\$repoRoot\nul"

Write-Host "Trying: $extended"

if (-not [System.IO.File]::Exists($extended)) {
  Write-Host "File not found at extended path (maybe already deleted)."
  exit 0
}

try {
  [System.IO.File]::Delete($extended)
  Write-Host "Deleted OK."
  exit 0
}
catch {
  Write-Host ".NET delete failed: $($_.Exception.Message)"
}

$cmd = 'cmd.exe /c del /f /q "' + $extended + '"'
Write-Host "Trying: $cmd"
cmd.exe /c "del /f /q `"$extended`""
if ($LASTEXITCODE -eq 0) {
  Write-Host "cmd del OK."
  exit 0
}

Write-Host @"

Still failing? Try manually in Command Prompt (cmd.exe), not PowerShell:

  del \\?\$repoRoot\nul

Close Cursor/VS Code tabs for that file first so Windows releases the lock.
"@

exit 1
