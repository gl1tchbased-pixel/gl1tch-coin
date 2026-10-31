@echo off
REM Answers comments on @gl1tchbased (used by the Windows scheduled task "GL1TCH X Comments").
cd /d "C:\Users\MSI\Desktop\coin"
set "NODE_OPTIONS=--use-system-ca"
set "LAUNCH_CHROMIUM=1"
"C:\Program Files\nodejs\node.exe" "e2e\social\x-comments.mjs" >> "e2e\social\out\x-comments.log" 2>&1
