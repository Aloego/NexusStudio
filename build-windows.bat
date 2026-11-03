@echo off
setlocal
cd /d "%~dp0"
title Build NexusStudio installer
echo.
echo  NexusStudio installer builder
echo  -----------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js is not installed yet.
  echo  1. Open https://nodejs.org and download the LTS version.
  echo  2. Install it with the default options.
  echo  3. Double-click this file again.
  echo.
  pause
  exit /b 1
)
set CSC_IDENTITY_AUTO_DISCOVERY=false
echo.
echo  Step 1 of 2: downloading the parts the app is made from. This can take a few minutes.
call npm install
if errorlevel 1 goto :fail
echo.
echo  Step 2 of 2: building the installer.
call npm run dist
if errorlevel 1 goto :fail
echo.
echo  Done. The installer is in the "dist" folder: NexusStudio-Setup-1.0.0.exe
start "" "%~dp0dist"
pause
exit /b 0

:fail
echo.
echo  Something went wrong. Read the last few lines above.
echo  If you see "Cannot create symbolic link": turn on Developer Mode in
echo  Settings, System, For developers, then run this file again.
echo.
pause
exit /b 1
