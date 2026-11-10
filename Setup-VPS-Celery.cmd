@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\vps-celery.ps1" -Mode setup
pause
