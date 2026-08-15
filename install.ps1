# Homogenous CLI Installer for Windows PowerShell
# Usage: irm https://raw.githubusercontent.com/CODExGAMERZ/homogenous/main/install.ps1 | iex

$ErrorActionPreference = 'Stop'

Write-Host "`n✦ Installing Homogenous CLI v3.8.0 (Local-First Coding Assistant)..." -ForegroundColor Cyan

# 1. Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Node.js is not installed. Please install Node.js >= 18.0.0 from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# 2. Check npm
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "Error: npm is not installed. Please install npm from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# 3. Build package if running from source checkout
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (Test-Path (Join-Path $scriptDir "package.json")) {
    Write-Host "Building Homogenous CLI from local repository..." -ForegroundColor Yellow
    Set-Location $scriptDir
    npm run build
    npm link
} else {
    Write-Host "Installing Homogenous CLI from npm package registry..." -ForegroundColor Yellow
    npm install -g @codexgamerz/homogenous@latest
    if (Test-Path "package.json") {
        Write-Host "Installing from local package..." -ForegroundColor Cyan
        npm install
        npm run build
        npm link
    } else {
        throw $_
    }
}

Write-Host "`n✓ Homogenous CLI v3.8.0 installed successfully!" -ForegroundColor Green
Write-Host "`nTo get started, simply type:" -ForegroundColor Cyan
Write-Host "  homogenous`n" -ForegroundColor White
