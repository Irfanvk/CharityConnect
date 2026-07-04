@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\open-vps-live-logs.ps1" -Mode connections
pause
