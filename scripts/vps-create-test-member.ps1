# Creates the temporary test member on the VPS (see vps-create-test-member.sh).
# You type the test member's password here; it is checked locally, never shown or saved.
# -Local runs it against the local backend instead (for testing this script).
param([switch]$Local, [string]$Password)
$ErrorActionPreference = "Stop"

function Test-Rules([string]$p) {
  return ($p.Length -ge 8) -and ($p -cmatch '[A-Z]') -and ($p -cmatch '[a-z]') -and ($p -match '\d') -and ($p -match '[^A-Za-z0-9]')
}

if (-not $Password) {
  Write-Host "Choose a password for the test member (login: testmember)." -ForegroundColor Cyan
  Write-Host "It needs 8+ characters with a capital letter, a small letter, a number and a sign like @ # !"
  while ($true) {
    $a = Read-Host "Password" -AsSecureString
    $b = Read-Host "Type it again" -AsSecureString
    $pa = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($a))
    $pb = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($b))
    if ($pa -ne $pb) { Write-Host "The two passwords are different. Try again." -ForegroundColor Yellow; continue }
    if (-not (Test-Rules $pa)) { Write-Host "That password does not meet the rules. Try again." -ForegroundColor Yellow; continue }
    $Password = $pa
    break
  }
} elseif (-not (Test-Rules $Password)) {
  throw "Password does not meet the rules."
}

$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Password))
$body = Get-Content -Raw -Path (Join-Path $PSScriptRoot "vps-create-test-member.sh")
$remote = "export TEST_PW_B64='$b64'`n" + (($body -replace "`r`n", "`n") -replace '^#!/usr/bin/env bash', '') + "`nexit 0`n"
if ($Local) {
  $remote = "export APP_DIR='/e/CharityHub/charity-connect-backend' PY='.venv/Scripts/python' PYTHONPATH='.'`n" + $remote
}

# Feed the script from a file written without a BOM (piping in Windows PowerShell adds one,
# which bash would read as part of the first command).
$tmp = Join-Path $env:TEMP ("create-test-member-" + [guid]::NewGuid().ToString("N") + ".sh")
try {
  [IO.File]::WriteAllText($tmp, $remote, (New-Object System.Text.UTF8Encoding $false))
  if ($Local) {
    $bash = Join-Path $env:ProgramFiles "Git\bin\bash.exe"
    cmd /c "`"$bash`" -s < `"$tmp`""
  } else {
    cmd /c "ssh root@187.124.20.219 `"bash -s`" < `"$tmp`""
  }
} finally {
  Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue  # it holds the password
}
Write-Host "`nSign in with: testmember and the password you chose." -ForegroundColor Green
