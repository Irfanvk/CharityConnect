# Sets up (or removes) the Celery worker + Redis on the VPS.
#   -Mode setup : read-only check, asks for YES, then installs (two password prompts)
#   -Mode undo  : asks for YES, then removes the worker (backend sends notifications directly again)
param([ValidateSet("setup", "undo")][string]$Mode = "setup")
$ErrorActionPreference = "Stop"
$Server = "root@187.124.20.219"
$remote = Get-Content -Raw -Path (Join-Path $PSScriptRoot "vps-celery.sh")
# bash needs Unix line endings; PowerShell adds a Windows line break after piped text,
# and every mode exits before bash reaches it.
$remote = ($remote -replace "`r`n", "`n") + "`nexit 0`n"

function Invoke-Remote([string]$step) {
    $remote | ssh $Server "bash -s -- $step"
    if ($LASTEXITCODE -ne 0) { throw "The '$step' step stopped (see the messages above)." }
}

if ($Mode -eq "setup") {
    Write-Host "`nStep 1 of 3: checking the server (nothing is changed)..." -ForegroundColor Cyan
    Invoke-Remote "check"
    Write-Host ""
    $answer = Read-Host "Step 2 of 3: type YES to install Redis + the Celery worker (anything else cancels)"
    if ($answer -cne "YES") { Write-Host "Cancelled. Nothing was changed." -ForegroundColor Yellow; exit 0 }
    Write-Host "`nStep 3 of 3: installing..." -ForegroundColor Cyan
    Invoke-Remote "install"
} else {
    $answer = Read-Host "Type YES to remove the Celery worker (anything else cancels)"
    if ($answer -cne "YES") { Write-Host "Cancelled. Nothing was changed." -ForegroundColor Yellow; exit 0 }
    Invoke-Remote "undo"
}
Write-Host "`nDone." -ForegroundColor Green
