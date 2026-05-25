# ============================================================
# Kalike Asset Management System - Start Script (PowerShell)
# ============================================================
# This script starts both the Express API server and Vite
# dev server, then opens the app in your default browser.
# ============================================================

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Kalike Asset Management System                        ║" -ForegroundColor Cyan
Write-Host "║  Starting servers and opening browser...               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Get the directory where this script is located
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectDir

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️  node_modules not found. Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Check if package.json exists
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found in $ProjectDir" -ForegroundColor Red
    Write-Host "Please run this script from the Kalike Asset directory." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Starting Express API server (port 3000)..." -ForegroundColor Green
Write-Host "✅ Starting Vite dev server (port 5173)..." -ForegroundColor Green
Write-Host ""
Write-Host "🌐 App will open in your browser in 8 seconds..." -ForegroundColor Cyan
Write-Host ""

# Open browser after delay in background
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 8
    Start-Process "http://localhost:5173"
} | Out-Null

# Start the development servers
npm run dev:full

# Pause at the end
Read-Host "Press Enter to close"
