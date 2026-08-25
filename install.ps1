# Homogenous CLI Installer for Windows PowerShell
# Usage: irm https://raw.githubusercontent.com/CODExGAMERZ/homogenous/main/install.ps1 | iex

$ErrorActionPreference = 'Stop'

Write-Host "`n✦ Installing Homogenous CLI v4.2.7 (Local-First Coding Assistant)..." -ForegroundColor Cyan

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

# 3. Build package if running from source checkout, or install from registry
$scriptDir = if ($MyInvocation.MyCommand.Path) { Split-Path -Parent $MyInvocation.MyCommand.Path } else { Get-Location }

if (Test-Path (Join-Path $scriptDir "package.json")) {
    Write-Host "Building Homogenous CLI from local repository..." -ForegroundColor Yellow
    Set-Location $scriptDir
    npm install
    npm run build
    npm link
} else {
    Write-Host "Installing Homogenous CLI globally via npm..." -ForegroundColor Yellow
    try {
        npm install -g @codexgamerz/homogenous@latest
    } catch {
        Write-Host "Failed to install from npm registry: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n✓ Homogenous CLI v4.2.7 installed successfully!" -ForegroundColor Green
Write-Host "`nTo get started, simply type:" -ForegroundColor Cyan
Write-Host "  homogenous`n" -ForegroundColor White
