# Read-only check of one member's login, linked record and fee in the live database (nothing is changed).
param([string]$Who = "noumicool")
$ErrorActionPreference = "Stop"
$remote = Get-Content -Raw -Path (Join-Path $PSScriptRoot "vps-member-fee-check.sh")
$remote = ($remote -replace "`r`n", "`n") + "`nexit 0`n"
$remote | ssh "root@187.124.20.219" "bash -s -- $Who"
Write-Host "`nDone (nothing was changed)." -ForegroundColor Green
