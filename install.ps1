# Homogenous CLI Installer for Windows PowerShell
# Usage: irm https://raw.githubusercontent.com/CODExGAMERZ/homogenous/main/install.ps1 | iex

$ErrorActionPreference = 'Stop'

Write-Host "`n✦ Installing Homogenous CLI v3.4.1 (Local-First Coding Assistant)..." -ForegroundColor Cyan

# 1. Verify Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "✗ Error: Node.js (v20 or higher) is required but not found." -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/ and rerun this installer." -ForegroundColor Yellow
    exit 1
}

$nodeVer = (node -v).Substring(1).Split('.')[0]
if ([int]$nodeVer -lt 20) {
    Write-Host "⚠ Warning: Node.js version $(node -v) detected. Node.js v20+ is recommended." -ForegroundColor Yellow
}

# 2. Check npm
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "✗ Error: npm is required." -ForegroundColor Red
    exit 1
}

Write-Host "✓ Prerequisites verified." -ForegroundColor Green
Write-Host "✦ Installing homogenous globally via npm..." -ForegroundColor Cyan

try {
    npm install -g @codexgamerz/homogenous@latest
} catch {
    # Fallback to local link if run from source repo
    if (Test-Path "package.json") {
        Write-Host "Installing from local package..." -ForegroundColor Cyan
        npm install
        npm run build
        npm link
    } else {
        throw $_
    }
}

Write-Host "`n✓ Homogenous CLI v3.4.1 installed successfully!" -ForegroundColor Green
Write-Host "`nTo get started, simply type:" -ForegroundColor Cyan
Write-Host "  homogenous`n" -ForegroundColor White
