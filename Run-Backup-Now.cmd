@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\vps-backup-now.ps1" -Mode both
pause
