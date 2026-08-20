#!/usr/bin/env bash
# Homogenous CLI Installer for Linux / macOS
# Usage: curl -fsSL https://raw.githubusercontent.com/CODExGAMERZ/homogenous/main/install.sh | bash

set -e

echo -e "\n\033[1;36m✦ Installing Homogenous CLI v4.0.3 (Local-First Coding Assistant)...\033[0m"

# 1. Verify Node.js
if ! command -v node &> /dev/null; then
    echo -e "\033[1;31m✗ Error: Node.js is required but not found.\033[0m"
    echo -e "\033[1;33mPlease install Node.js (v20 or higher) from https://nodejs.org/\033[0m"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ -n "$NODE_VERSION" ] && [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "\033[1;33m⚠ Warning: Node.js version $(node -v) detected. Node.js v20+ is recommended.\033[0m"
fi

# 2. Verify npm
if ! command -v npm &> /dev/null; then
    echo -e "\033[1;31m✗ Error: npm is required.\033[0m"
    exit 1
fi

echo -e "\033[1;32m✓ Prerequisites verified.\033[0m"
echo -e "\033[1;36m✦ Installing homogenous globally via npm...\033[0m"

if [ -f "package.json" ]; then
    npm install
    npm run build
    npm link
else
    npm install -g @codexgamerz/homogenous@latest
fi

echo -e "\n\033[1;32m✓ Homogenous CLI v4.0.3 installed successfully!\033[0m"
echo -e "\n\033[1;36mTo start coding with Homogenous, run:\033[0m"
echo -e "  \033[1;37mhomogenous\033[0m\n"

