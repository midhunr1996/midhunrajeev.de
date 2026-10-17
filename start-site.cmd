@echo off
rem Double-click to put the portfolio online. Close this window to take it offline.
title Midhun Rajeev portfolio (online while this window is open)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-site.ps1" %*
pause
