<#
.SYNOPSIS
    Outer Supervisor Loop for Antigravity Autonomous Maintenance.
    Runs headless Antigravity sessions sequentially, resuming or refreshing context from durable git/bootloader state.

.DESCRIPTION
    Combines with Antigravity's inner Stop-hook loop to provide dual-layer autonomy:
    - Inner Loop: Stop hook in .agents/hooks.json prevents premature termination inside an Antigravity execution.
    - Outer Loop: supervisor.ps1 resumes or respawns sessions if the process terminates or reaches print-timeout.

.EXAMPLE
    .\.agents\scripts\supervisor.ps1
#>

[CmdletBinding()]
param (
    [int]$MaxSessions = 64,
    [string]$PrintTimeout = "4h",
    [string]$Workspace = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Antigravity Outer Autonomy Supervisor Starting" -ForegroundColor Cyan
Write-Host " Workspace: $Workspace" -ForegroundColor Gray
Write-Host " Max Outer Sessions: $MaxSessions | Timeout per run: $PrintTimeout" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

$sessionCount = 0

while ($sessionCount -lt $MaxSessions) {
    $sessionCount++
    $timestamp = (Get-Date).ToString("u")
    Write-Host "`n[$timestamp] Starting Outer Autonomy Session #$sessionCount of $MaxSessions..." -ForegroundColor Yellow

    # Check for stop sentinels before starting session
    $stopSentinel = Join-Path $Workspace ".agents/STOP_AUTONOMY"
    $completeSentinel = Join-Path $Workspace ".agents/MISSION_COMPLETE"
    $currentMd = Join-Path $Workspace "docs/bootloaders/CURRENT.md"

    if (Test-Path $stopSentinel) {
        Write-Host "STOP_AUTONOMY sentinel detected at $stopSentinel. Exiting supervisor." -ForegroundColor Red
        break
    }

    if (Test-Path $completeSentinel) {
        Write-Host "MISSION_COMPLETE sentinel detected at $completeSentinel. Mission achieved!" -ForegroundColor Green
        break
    }

    if (Test-Path $currentMd) {
        $content = Get-Content -Raw $currentMd
        if ($content -match "(?im)^\s*AUTONOMY_STOP:\s*true") {
            Write-Host "AUTONOMY_STOP: true detected in $currentMd. Exiting supervisor." -ForegroundColor Red
            break
        }
        if ($content -match "(?im)^\s*MISSION_COMPLETE:\s*true") {
            Write-Host "MISSION_COMPLETE: true detected in $currentMd. Mission achieved!" -ForegroundColor Green
            break
        }
    }

    $promptText = @"
Continue the autonomous repository-maintenance mission.
Re-establish state from repository evidence:
1. Re-read docs/bootloaders/CURRENT.md, MAINTAINER_BOOTLOADER.md, and AGENTS.md.
2. Re-read MASTER_OPERATING_PROMPT.md and MASTER_OPERATING_CONSTITUTION.md / CONSTITUTION.md.
3. Inspect git status, recent commits, and verify working tree.
4. Execute the highest-value unfinished objective using thin, verifiable slices.
5. Test all changes rigorously before committing.
6. Persist discoveries and updated state in CURRENT.md and durable memory.
7. Do not stop until the mission has reached genuine terminal completion or explicit stop sentinel.
"@

    # Run agy in headless mode with continue
    try {
        & agy -p $promptText --continue --print-timeout $PrintTimeout
    }
    catch {
        Write-Warning "Session exited with error: $_"
        Start-Sleep -Seconds 5
    }

    # Re-check stop sentinels after session completes
    if (Test-Path $stopSentinel) {
        Write-Host "STOP_AUTONOMY sentinel detected. Exiting supervisor." -ForegroundColor Red
        break
    }

    if (Test-Path $completeSentinel) {
        Write-Host "MISSION_COMPLETE sentinel detected. Mission achieved!" -ForegroundColor Green
        break
    }

    Write-Host "Outer session #$sessionCount finished. Cooling down for 3 seconds before next iteration..." -ForegroundColor DarkGray
    Start-Sleep -Seconds 3
}

Write-Host "`nSupervisor loop finished after $sessionCount sessions." -ForegroundColor Cyan
