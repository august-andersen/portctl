#!/usr/bin/env bash
set -euo pipefail

# portctl installer
# Usage: curl -fsSL https://raw.githubusercontent.com/august-andersen/portctl/main/install.sh | bash

PORTCTL_DIR="$HOME/.portctl"
APP_DIR="$PORTCTL_DIR/app"
REPO_URL="https://github.com/august-andersen/portctl.git"
MIN_NODE_VERSION=18

echo ""
echo "  ▽ portctl installer"
echo "  ────────────────────"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
  echo "  ✗ Node.js is required but not installed."
  echo "    Install it from https://nodejs.org/ (v${MIN_NODE_VERSION}+)"
  echo "    Or: brew install node"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt "$MIN_NODE_VERSION" ]; then
  echo "  ✗ Node.js v${MIN_NODE_VERSION}+ required (found v$(node -v))"
  exit 1
fi

echo "  ✓ Node.js $(node -v) detected"

# Check for npm
if ! command -v npm &> /dev/null; then
  echo "  ✗ npm is required but not installed."
  exit 1
fi

# Clone or update
if [ -d "$APP_DIR/.git" ]; then
  echo "  ↻ Updating existing installation..."
  cd "$APP_DIR"
  git pull --quiet
else
  echo "  ↓ Cloning portctl..."
  mkdir -p "$PORTCTL_DIR"
  git clone --quiet "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# Install dependencies
echo "  ↓ Installing dependencies..."
npm install --silent 2>/dev/null

# Build frontend
echo "  ⚙ Building frontend..."
npx vite build --config client/vite.config.ts --silent 2>/dev/null || npx vite build --config client/vite.config.ts

# Create symlink
SYMLINK_PATH="/usr/local/bin/portctl"
if [ -L "$SYMLINK_PATH" ] || [ -f "$SYMLINK_PATH" ]; then
  echo "  ↻ Updating CLI symlink..."
  rm -f "$SYMLINK_PATH" 2>/dev/null || sudo rm -f "$SYMLINK_PATH"
fi

# Try symlink without sudo first
if ln -sf "$APP_DIR/bin/portctl.js" "$SYMLINK_PATH" 2>/dev/null; then
  echo "  ✓ CLI installed at $SYMLINK_PATH"
else
  echo "  ! Need sudo to create symlink at $SYMLINK_PATH"
  sudo ln -sf "$APP_DIR/bin/portctl.js" "$SYMLINK_PATH"
  echo "  ✓ CLI installed at $SYMLINK_PATH"
fi

# Make CLI executable
chmod +x "$APP_DIR/bin/portctl.js"

# Create directories
mkdir -p "$PORTCTL_DIR/logs"

echo ""
echo "  ✓ portctl installed successfully!"
echo ""
echo "  Quick start:"
echo "    portctl start    Start the dashboard daemon"
echo "    portctl open     Open dashboard in browser"
echo "    portctl status   Check daemon status"
echo ""
echo "  Dashboard: http://127.0.0.1:47777"
echo ""
