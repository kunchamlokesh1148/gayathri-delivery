@echo off
set PATH=%~dp0node-bin;%PATH%
echo Starting Delivery Staff Portal Dev Server with portable Node.js...
npm run dev -- --host 127.0.0.1
