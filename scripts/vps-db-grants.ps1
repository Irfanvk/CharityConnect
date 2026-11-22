# Give the role you use in pgAdmin rights on the live app tables (including newly created ones).
# Step 1 shows which login roles can't read which tables (read-only); then you type the role name.
$ErrorActionPreference = "Stop"
$Server = "root@187.124.20.219"
$remote = Get-Content -Raw -Path (Join-Path $PSScriptRoot "vps-db-grants.sh")
$remote = ($remote -replace "`r`n", "`n") + "`nexit 0`n"
function Invoke-Remote([string]$args2) {
    $remote | ssh $Server "bash -s -- $args2"
    if ($LASTEXITCODE -ne 0) { throw "The step stopped (see above). Nothing was changed by it." }
}
Write-Host "`nStep 1 of 2: check (nothing is changed)" -ForegroundColor Cyan
Invoke-Remote "check"
$role = Read-Host "`nType the role name you log into pgAdmin with (empty cancels)"
if ([string]::IsNullOrWhiteSpace($role)) { Write-Host "Cancelled. Nothing was changed." -ForegroundColor Yellow; exit 0 }
if ($role -notmatch '^[A-Za-z0-9_]+$') { Write-Host "Role names here are letters, digits and _ only. Cancelled." -ForegroundColor Yellow; exit 0 }
$answer = Read-Host "Type YES to give '$role' read/write rights on the app tables (anything else cancels)"
if ($answer -cne "YES") { Write-Host "Cancelled. Nothing was changed." -ForegroundColor Yellow; exit 0 }
Write-Host "`nStep 2 of 2: granting..." -ForegroundColor Cyan
Invoke-Remote "apply $role"
Write-Host "`nDone. In pgAdmin, right-click the database > Refresh." -ForegroundColor Green
