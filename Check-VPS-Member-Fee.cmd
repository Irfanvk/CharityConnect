@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\vps-member-fee-check.ps1" %*
pause
