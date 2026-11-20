# Copies the server's backups and the backup key to this PC (one SSH login).
# Folder: E:\CharityHub\Backups (change with -Dest). Keep it private: the key opens every backup.
param([string]$HostName = "187.124.20.219", [string]$User = "root", [string]$Dest = "E:\CharityHub\Backups")
$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path $Dest | Out-Null
$tar = Join-Path $Dest ("server-backups-" + (Get-Date -Format "yyyy-MM-dd_HH-mm") + ".tar")
Write-Host "Copying backups from the server (you will be asked for the server password)..." -ForegroundColor Cyan
# cmd's ">" keeps the bytes as they are (PowerShell's would change them).
cmd /c "ssh $User@$HostName `"tar -C /root/backups -cf - daily weekly .backup_pass last_ok`" > `"$tar`""
if ($LASTEXITCODE -ne 0 -or (Get-Item $tar).Length -lt 1024) { throw "The copy failed. Nothing was changed on the server." }

$into = Join-Path $Dest "latest"
New-Item -ItemType Directory -Force -Path $into | Out-Null
tar -xf $tar -C $into
Remove-Item -LiteralPath $tar -Force
$files = Get-ChildItem -Path (Join-Path $into "daily") -Filter "*.enc" | Sort-Object Name
Write-Host ""
Write-Host ("Copied {0} daily backups to {1}" -f $files.Count, $into) -ForegroundColor Green
if ($files.Count) { Write-Host ("Newest: {0}" -f $files[-1].Name) }
Write-Host ("Backup key: {0}" -f (Join-Path $into ".backup_pass")) -ForegroundColor Yellow
Write-Host "Keep this folder private, and also copy it to a USB stick or your own cloud drive." -ForegroundColor Yellow
