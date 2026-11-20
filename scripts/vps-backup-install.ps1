# Installs automatic backups on the VPS (see vps-backup-install.sh and vps-backup-daily.sh).
# One SSH login. The script is sent from a file written without a BOM and with Unix line
# endings, because bash reads a BOM or CR as part of the commands.
param([string]$HostName = "187.124.20.219", [string]$User = "root")
$ErrorActionPreference = "Stop"

$install = Get-Content -Raw -Path (Join-Path $PSScriptRoot "vps-backup-install.sh")
$daily = Get-Content -Raw -Path (Join-Path $PSScriptRoot "vps-backup-daily.sh")
$remote = $install.Replace("__DAILY_SCRIPT__", $daily.TrimEnd())
$remote = ($remote -replace "`r`n", "`n") + "`nexit 0`n"

$tmp = Join-Path $env:TEMP ("install-backups-" + [guid]::NewGuid().ToString("N") + ".sh")
try {
  [IO.File]::WriteAllText($tmp, $remote, (New-Object System.Text.UTF8Encoding $false))
  Write-Host "Installing automatic backups on the server (you will be asked for the server password)..." -ForegroundColor Cyan
  cmd /c "ssh $User@$HostName `"bash -s`" < `"$tmp`""
} finally {
  Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
}
Write-Host ""
Write-Host "Next: run Copy-Backups-To-PC.cmd so a copy of the backups AND the backup key are on this PC." -ForegroundColor Yellow
Write-Host "Without the key a backup cannot be opened." -ForegroundColor Yellow
