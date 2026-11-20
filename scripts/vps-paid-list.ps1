# Compare the committee's full paid list with the live app, and (with -Update) add what is clearly missing.
# Without -Update it only reads. With -Update: preview first, type YES, then one transaction.
param([string]$Sheet = "$env:USERPROFILE\Downloads\CASH RECIEVED.xlsx", [switch]$Update)
$ErrorActionPreference = "Stop"
$Server = "root@187.124.20.219"
$Py = "E:\CharityHub\charity-connect-backend\.venv\Scripts\python.exe"
$OutDir = "E:\CharityHub\Backups\paid-list"
if (-not (Test-Path $Sheet)) { throw "Sheet not found: $Sheet" }
New-Item -ItemType Directory -Force $OutDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$name = "paid-list-$stamp"
$json = Join-Path $OutDir "$name.json"
Write-Host "`nReading the sheet: $Sheet" -ForegroundColor Cyan
& $Py -I (Join-Path $PSScriptRoot "cash-sheet-to-json.py") $Sheet $json
if ($LASTEXITCODE -ne 0) { throw "Could not read the sheet." }
$remoteDir = "/root/backups/manual"
ssh $Server "mkdir -p $remoteDir && chmod 700 $remoteDir"
scp -q $json "${Server}:$remoteDir/$name.json"
if ($LASTEXITCODE -ne 0) { throw "Could not copy the sheet to the server." }
$remote = Get-Content -Raw -Path (Join-Path $PSScriptRoot "vps-paid-list.sh")
$remote = ($remote -replace "`r`n", "`n") + "`nexit 0`n"
function Invoke-Remote([string]$mode) {
    $remote | ssh $Server "bash -s -- $mode $remoteDir/$name.json"
    if ($LASTEXITCODE -ne 0) { throw "The '$mode' step stopped (see above). Nothing was changed by it." }
}
Write-Host "`nComparing with the app (nothing is changed)..." -ForegroundColor Cyan
Invoke-Remote "check"
scp -q "${Server}:$remoteDir/$name-report.csv" (Join-Path $OutDir "$name-report.csv")
Write-Host "`nFull list with names (keep private): $(Join-Path $OutDir "$name-report.csv")" -ForegroundColor Green
if (-not $Update) { Write-Host "Nothing in the app was changed."; exit 0 }
$answer = Read-Host "`nType YES to update ONLY the 'WILL BE UPDATED' months above (anything else cancels)"
if ($answer -cne "YES") { Write-Host "Cancelled. Nothing was changed." -ForegroundColor Yellow; exit 0 }
$adv = Read-Host "Also add the months PAID IN ADVANCE listed above? Type YES to add them too (anything else skips them)"
$mode = if ($adv -ceq "YES") { "apply-with-advance" } else { "apply" }
Write-Host "`nUpdating..." -ForegroundColor Cyan
Invoke-Remote $mode
scp -q "${Server}:$remoteDir/$name-changes.csv" (Join-Path $OutDir "$name-changes.csv")
Write-Host "`nDone. Changed records: $(Join-Path $OutDir "$name-changes.csv")" -ForegroundColor Green
