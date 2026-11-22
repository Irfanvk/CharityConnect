# Bulk payments approved month by month: mark the bulk payment approved too (receipt, no "Approve all").
# Step 1 previews (read-only); type YES; step 2 backs up and fixes them in one transaction.
$ErrorActionPreference = "Stop"
$Server = "root@187.124.20.219"
$remote = Get-Content -Raw -Path (Join-Path $PSScriptRoot "vps-bulk-sync.sh")
$remote = ($remote -replace "`r`n", "`n") + "`nexit 0`n"
function Invoke-Remote([string]$mode) {
    $remote | ssh $Server "bash -s -- $mode"
    if ($LASTEXITCODE -ne 0) { throw "The '$mode' step stopped (see above). Nothing was changed by it." }
}
Write-Host "`nStep 1 of 2: preview (nothing is changed)" -ForegroundColor Cyan
Invoke-Remote "preview"
$answer = Read-Host "`nType YES to make these changes (anything else cancels)"
if ($answer -cne "YES") { Write-Host "Cancelled. Nothing was changed." -ForegroundColor Yellow; exit 0 }
Write-Host "`nStep 2 of 2: changing..." -ForegroundColor Cyan
Invoke-Remote "apply"
Write-Host "`nDone." -ForegroundColor Green
