@echo off
REM ============================================================
REM Kalike Asset Management System - Start Script with Auto-Browser
REM ============================================================
REM This script starts both the Express API server and Vite
REM dev server, then automatically opens the app in your
REM default browser.
REM ============================================================

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║  Kalike Asset Management System                        ║
echo ║  Starting servers and opening browser...               ║
echo ╚════════════════════════════════════════════════════════╝
echo.

REM Get the directory where this batch file is located
set PROJECT_DIR=%~dp0

REM Change to project directory
cd /d "%PROJECT_DIR%"

REM Check if node_modules exists
if not exist "node_modules" (
    echo ⚠️  node_modules not found. Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Check if package.json exists
if not exist "package.json" (
    echo ❌ Error: package.json not found in %PROJECT_DIR%
    echo Please run this script from the Kalike Asset directory.
    pause
    exit /b 1
)

echo ✅ Starting Express API server (port 3000)...
echo ✅ Starting Vite dev server (port 5173)...
echo.
echo 🌐 App will open in your browser in 8-10 seconds...
echo.

REM Create a temporary VBS script to open the browser after delay
setlocal
set TEMP_VBS=%temp%\open_browser.vbs
(
    echo Dim WshShell
    echo Set WshShell = CreateObject("WScript.Shell"^)
    echo WshShell.Exec("timeout /t 8"^)
    echo WshShell.Run "http://localhost:5173"
) > %TEMP_VBS%

REM Start the VBS script in the background
cscript.exe //nologo %TEMP_VBS% >nul 2>&1

REM Start the development servers
call npm run dev:full

REM Clean up temp file
if exist %TEMP_VBS% del %TEMP_VBS%

REM This line will only execute if npm run dev:full exits
if errorlevel 1 (
    echo.
    echo ❌ Error starting servers
    pause
    exit /b 1
)

pause
