@echo off
REM A separate TEST COPY of HotspotPro: its own data, ports (web 3100, backend 4100) and build.
REM The real site (start.bat) is never touched. Open http://127.0.0.1:3100
REM Add "--copy-live" to start the test copy with a copy of your real data.
cd /d "%~dp0"
node run-all.mjs --test %*
pause
