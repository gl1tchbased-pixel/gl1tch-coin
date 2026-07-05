@echo off
REM GL1TCH X growth scheduler launcher (used by the Windows scheduled task "GL1TCH-X-Scheduler").
REM Conservative defaults to protect the @gl1tchbased account — edit here to tune.
cd /d "C:\Users\MSI\Desktop\coin"
set "NODE_OPTIONS=--use-system-ca"
set "LAUNCH_CHROMIUM=1"
set "REPLY_INTERVAL_HOURS=4"
set "MAX=2"
"C:\Program Files\nodejs\node.exe" "e2e\social\x-scheduler.mjs" >> "e2e\social\out\scheduler.log" 2>&1
