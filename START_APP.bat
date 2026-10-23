@echo off
title Course Registration & Prerequisite Management System
color 0A

:: Switch to root directory
cd /d "%~dp0"

echo ======================================================================
echo    Starting Course Registration System
echo ======================================================================
echo.

:: 1. Ensure MySQL service is running
echo [1/3] Checking MySQL service...
net start MySQL80 >nul 2>nul
if %errorlevel% neq 0 net start MySQL >nul 2>nul

:: 2. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] Node.js is not found on your system!
    echo Please download and install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 3. Open Web Browser
echo [2/3] Opening application in your browser...
start http://localhost:3000

:: 4. Run Node.js server
echo [3/3] Starting server on port 3000...
echo.
echo ======================================================================
echo App URL: http://localhost:3000
echo Keep this window OPEN while using the app.
echo To stop the app, press Ctrl + C or close this window.
echo ======================================================================
echo.

cd /d "%~dp0backend"
node server.js

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] Server encountered an error and stopped.
    echo Please check the error message above.
    pause
)
