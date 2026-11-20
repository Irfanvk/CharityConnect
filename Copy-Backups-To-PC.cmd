@echo off
rem Copies the server backups and the backup key to E:\CharityHub\Backups\latest.
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\vps-backup-copy-to-pc.ps1"
pause
