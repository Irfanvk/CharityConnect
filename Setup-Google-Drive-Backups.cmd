@echo off
rem Copies the nightly server backups to Google Drive too (folder "charity-backups").
rem Google access is limited to files this backup creates: nothing else in the Drive is touched.
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\setup-gdrive-backups.ps1"
pause
