#!/usr/bin/env bash
# Homogenous CLI Installer for Linux / macOS
# Usage: curl -fsSL https://raw.githubusercontent.com/CODExGAMERZ/homogenous/main/install.sh | bash

set -e

echo -e "\n\033[1;36m✦ Installing Homogenous CLI v4.2.6 (Local-First Coding Assistant)...\033[0m"

# 1. Verify Node.js
if ! command -v node &> /dev/null; then
    echo -e "\033[1;31m✗ Error: Node.js (v18+) is required to install Homogenous CLI.\033[0m"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "\033[0;31mError: npm is required to install Homogenous CLI.\033[0m"
    exit 1
fi

# Detect installation type
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$SCRIPT_DIR/package.json" ]; then
    echo -e "Installing globally from local repository..."
    cd "$SCRIPT_DIR"
    npm run build
    npm install -g .
else
    echo -e "Installing latest release from npm..."
    npm install -g @codexgamerz/homogenous@latest
fi

# Verify installation
if command -v homogenous &> /dev/null; then
    echo -e "\n\033[1;32m✓ Homogenous CLI v4.2.6 installed successfully!\033[0m"
    echo -e "\n\033[1;36mTo start coding with Homogenous, run:\033[0m"
    echo -e "  \033[1;37mhomogenous\033[0m\n"
fi
