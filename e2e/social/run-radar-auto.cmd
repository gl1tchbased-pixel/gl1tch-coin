@echo off
title GL1TCH Autonomous Rug Radar X Poster
echo ===================================================
echo   GL1TCH Autonomous Rug Radar Alert Daemon for X
echo   Monitors live pump.fun & Solana launches
echo   Exposes honeypots and rug-pulls automatically
echo ===================================================
cd /d %~dp0
set NODE_OPTIONS=--use-system-ca
set LAUNCH_CHROMIUM=1
node x-radar-auto.mjs --watch
pause
