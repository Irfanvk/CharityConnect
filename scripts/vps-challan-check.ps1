# Read-only check of pending payments in the live database (nothing is changed).
param([string]$MemberCode = "MEM-0016")
$ErrorActionPreference = "Stop"
$remote = Get-Content -Raw -Path (Join-Path $PSScriptRoot "vps-challan-check.sh")
$remote = ($remote -replace "`r`n", "`n") + "`nexit 0`n"
$remote | ssh "root@187.124.20.219" "bash -s -- $MemberCode"
Write-Host "`nDone (nothing was changed)." -ForegroundColor Green
