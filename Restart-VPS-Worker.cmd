@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\vps-restart-worker.ps1"
pause
