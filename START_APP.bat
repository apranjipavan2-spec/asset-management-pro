@echo off
REM ============================================================
REM Kalike Asset Management System - Start Script
REM ============================================================
REM This script starts both the Express API server and Vite
REM dev server, then opens the app in your default browser.
REM ============================================================

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║  Kalike Asset Management System                        ║
echo ║  Starting servers...                                   ║
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
echo 📋 Servers starting. This may take 10-15 seconds...
echo.

REM Start the development servers
call npm run dev:full

REM This line will only execute if npm run dev:full exits
if errorlevel 1 (
    echo.
    echo ❌ Error starting servers
    pause
    exit /b 1
)

pause
