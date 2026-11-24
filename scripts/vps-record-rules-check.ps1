# Read-only check of the live server before deploying the record rules (nothing is changed):
# duplicate months, new members waiting for approval, and whether backups run and leave the server.
$ErrorActionPreference = "Stop"
$remote = Get-Content -Raw -Path (Join-Path $PSScriptRoot "vps-record-rules-check.sh")
$remote = ($remote -replace "`r`n", "`n") + "`nexit 0`n"
$remote | ssh "root@187.124.20.219" "bash -s"
Write-Host "`nDone (nothing was changed). Copy everything above and paste it to Claude." -ForegroundColor Green
