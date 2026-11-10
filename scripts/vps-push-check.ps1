# Read-only check of push notifications and the Celery worker on the VPS.
$ErrorActionPreference = "Stop"
$remote = Get-Content -Raw -Path (Join-Path $PSScriptRoot "vps-push-check.sh")
$remote = ($remote -replace "`r`n", "`n") + "`nexit 0`n"
$remote | ssh "root@187.124.20.219" "bash -s"
Write-Host "`nDone (nothing was changed)." -ForegroundColor Green
