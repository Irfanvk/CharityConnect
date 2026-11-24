# Copy the server's nightly backups to Google Drive automatically.
# 1. rclone on this PC (installed with winget if missing, after you type YES)
# 2. Google sign-in in the browser, with access limited to files rclone creates ("drive.file"):
#    nothing else in the Drive can be seen, changed or deleted
# 3. the server gets that sign-in, copies today's backups and lists the Drive folder
# The sign-in token is never shown on screen and is sent to the server over SSH only.
param([string]$HostName = "187.124.20.219", [string]$User = "root")
$ErrorActionPreference = "Stop"

# ---- 1. rclone on this PC
function Find-Rclone {
  $cmd = Get-Command rclone -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $link = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Links\rclone.exe"
  if (Test-Path $link) { return $link }
  $found = Get-ChildItem -Path (Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages") -Filter rclone.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($found) { return $found.FullName }
  return $null
}
$rclone = Find-Rclone
if (-not $rclone) {
  Write-Host "rclone (free tool that copies files to Google Drive) is not on this PC." -ForegroundColor Cyan
  $answer = Read-Host "Type YES to install it with winget (anything else cancels)"
  if ($answer -cne "YES") { Write-Host "Cancelled. Nothing was changed." -ForegroundColor Yellow; exit 0 }
  winget install --id Rclone.Rclone -e --accept-source-agreements --accept-package-agreements
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
  $rclone = Find-Rclone
  if (-not $rclone) { throw "rclone was installed but can't be found yet. Close this window and run the script again." }
}
Write-Host "Using rclone: $rclone" -ForegroundColor DarkGray

# ---- 2. Google sign-in (access to files rclone creates only)
Write-Host ""
Write-Host "A browser window opens. Sign in with the Google account for the backups and click Allow." -ForegroundColor Cyan
Write-Host "Google will say the app can only see the files it creates. Then come back here." -ForegroundColor Cyan
$scopeBlob = "eyJzY29wZSI6ImRyaXZlLmZpbGUifQ"   # {"scope":"drive.file"}
$lines = New-Object System.Collections.Generic.List[string]
$shownLink = $false
$ErrorActionPreference = "Continue"
# Nothing rclone prints is echoed except the sign-in link: the result is a secret.
& $rclone authorize "drive" $scopeBlob 2>&1 | ForEach-Object {
  $line = "$_"
  $lines.Add($line)
  $link = [regex]::Match($line, 'http://127\.0\.0\.1:\d+/auth\?state=\S+')
  if ($link.Success -and -not $shownLink) {
    Write-Host "If no browser opened, open this link: $($link.Value)"
    $shownLink = $true
  }
}
$ErrorActionPreference = "Stop"
$text = $lines -join "`n"
$m = [regex]::Match($text, '--->\s*(\S.*?)\s*<---End paste', 'Singleline')
if (-not $m.Success) {
  throw "The Google sign-in did not finish (no result came back). Nothing was changed on the server."
}
$result = ($m.Groups[1].Value -replace "\s+", "").Trim()
$token = $null
if ($result.StartsWith("{")) {
  $token = $result   # older rclone: the token itself
} else {
  # newer rclone: base64 of {"client_id":"","client_secret":"","token":"{...}"}
  try {
    $b64 = $result.Replace('-', '+').Replace('_', '/')
    switch ($b64.Length % 4) { 2 { $b64 += "==" } 3 { $b64 += "=" } }
    $blob = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b64)) | ConvertFrom-Json
    $token = [string]$blob.token
  } catch {
    $token = $null
  }
}
if (-not $token -or $token -notmatch '"refresh_token"') {
  throw "The sign-in result could not be read. Nothing was changed on the server."
}
$token = ($token -replace "\s+", " ").Trim()
Write-Host "Signed in." -ForegroundColor Green

# ---- 3. the server
$remote = Get-Content -Raw -Path (Join-Path $PSScriptRoot "vps-gdrive-setup.sh")
$remote = $remote.Replace("__TOKEN__", $token)
$remote = ($remote -replace "`r`n", "`n") + "`nexit 0`n"
$tmp = Join-Path $env:TEMP ("gdrive-setup-" + [guid]::NewGuid().ToString("N") + ".sh")
try {
  [IO.File]::WriteAllText($tmp, $remote, (New-Object System.Text.UTF8Encoding $false))
  Write-Host ""
  Write-Host "Setting up the server (you will be asked for the server password)..." -ForegroundColor Cyan
  cmd /c "ssh $User@$HostName `"bash -s`" < `"$tmp`""
  if ($LASTEXITCODE -ne 0) { throw "The server step stopped (see above)." }
} finally {
  Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
}
Write-Host ""
Write-Host "Done. Every night the new backup is also copied to the Google Drive folder 'charity-backups'." -ForegroundColor Green
Write-Host "Keep the backup key (E:\CharityHub\Backups\latest\.backup_pass) somewhere else: it is NOT in the Drive." -ForegroundColor Yellow
