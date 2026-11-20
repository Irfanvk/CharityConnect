@echo off
rem Installs automatic nightly backups on the live server (encrypted, checked, kept 30 days).
rem Safe to run again. Afterwards run Copy-Backups-To-PC.cmd.
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\vps-backup-install.ps1"
pause
