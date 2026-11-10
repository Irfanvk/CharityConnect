# Turns on phone (web push) notifications on the VPS with new keys generated there.
$ErrorActionPreference = "Stop"
$answer = Read-Host "Type YES to create push keys on the VPS and restart the backend (anything else cancels)"
if ($answer -cne "YES") { Write-Host "Cancelled. Nothing was changed." -ForegroundColor Yellow; exit 0 }
$remote = Get-Content -Raw -Path (Join-Path $PSScriptRoot "vps-enable-push.sh")
$remote = ($remote -replace "`r`n", "`n") + "`nexit 0`n"
$remote | ssh "root@187.124.20.219" "bash -s"
if ($LASTEXITCODE -ne 0) { throw "Stopped (see the messages above)." }
Write-Host "`nDone." -ForegroundColor Green
