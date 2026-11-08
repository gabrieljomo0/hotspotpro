@echo off
REM HotspotPro - one-click start for Windows. Double-click this file.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install version 20 or newer from https://nodejs.org and run this again.
  pause
  exit /b 1
)
start "" /b cmd /c "timeout /t 14 /nobreak >nul & start http://localhost:3000"
node run-all.mjs
pause
