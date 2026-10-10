@echo off
REM Double-click to run Sano Sathi on this PC. Phones and tablets on the same Wi-Fi can open the "Network" address it prints.
cd /d "%~dp0"
where node >/dev/null 2>/dev/null || (echo Node.js is not installed. Install the LTS version from https://nodejs.org and run this again. & pause & exit /b 1)
if not exist node_modules (echo Installing packages, first time only... & call npm install || (pause & exit /b 1))
echo Starting Sano Sathi. Press Ctrl+C to stop.
call npm run dev -- --open --host
pause
