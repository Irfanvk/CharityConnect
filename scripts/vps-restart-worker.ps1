# Restarts only the Celery worker on the VPS (no data is changed).
$ErrorActionPreference = "Stop"
$remote = Get-Content -Raw -Path (Join-Path $PSScriptRoot "vps-restart-worker.sh")
$remote = ($remote -replace "`r`n", "`n") + "`nexit 0`n"
$remote | ssh "root@187.124.20.219" "bash -s"
Write-Host "`nDone. Now send a test push from Profile -> Notifications." -ForegroundColor Green
