@echo off
rem Creates ONE temporary test member on the live server (login: testmember, ID: TEST-0001).
rem Run only after the backend with the member-ID fix is live.
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\vps-create-test-member.ps1"
pause
