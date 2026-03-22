#!/usr/bin/env bash
set -euo pipefail

# portctl installer
#
# Remote install (after repo is pushed to GitHub):
#   curl -fsSL https://raw.githubusercontent.com/august-andersen/portctl/main/install.sh | bash
#
# Local install (from a local clone):
#   ./install.sh
#   # or: npm run install:local

PORTCTL_DIR="$HOME/.portctl"
REPO_URL="https://github.com/august-andersen/portctl.git"
MIN_NODE_VERSION=18

echo ""
echo "  ▽ portctl installer"
echo "  ────────────────────"
echo ""

# ── Check prerequisites ──

if ! command -v node &> /dev/null; then
  echo "  ✗ Node.js is required but not installed."
  echo "    Install it from https://nodejs.org/ (v${MIN_NODE_VERSION}+)"
  echo "    Or: brew install node"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt "$MIN_NODE_VERSION" ]; then
  echo "  ✗ Node.js v${MIN_NODE_VERSION}+ required (found $(node -v))"
  exit 1
fi
echo "  ✓ Node.js $(node -v)"

if ! command -v npm &> /dev/null; then
  echo "  ✗ npm is required but not installed."
  exit 1
fi

# ── Determine install source ──
# If this script is running from inside a portctl repo (local install),
# use that directory directly. Otherwise, clone from GitHub.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd)"

if [ -f "$SCRIPT_DIR/package.json" ] && grep -q '"name": "portctl"' "$SCRIPT_DIR/package.json" 2>/dev/null; then
  # Local install — use the repo we're already in
  APP_DIR="$SCRIPT_DIR"
  echo "  ✓ Local install from $APP_DIR"
else
  # Remote install — clone from GitHub into ~/.portctl/app
  APP_DIR="$PORTCTL_DIR/app"
  if [ -d "$APP_DIR/.git" ]; then
    echo "  ↻ Updating existing installation..."
    cd "$APP_DIR"
    git pull --quiet
  else
    echo "  ↓ Cloning portctl..."
    mkdir -p "$PORTCTL_DIR"
    git clone --quiet "$REPO_URL" "$APP_DIR"
  fi
fi

cd "$APP_DIR"

# ── Install dependencies ──

if [ ! -d "$APP_DIR/node_modules" ]; then
  echo "  ↓ Installing dependencies..."
  npm install --silent 2>/dev/null || npm install
else
  echo "  ✓ Dependencies already installed"
fi

# ── Build frontend ──

if [ ! -f "$APP_DIR/dist/client/index.html" ]; then
  echo "  ⚙ Building frontend..."
  npx vite build --config client/vite.config.ts 2>/dev/null || npx vite build --config client/vite.config.ts
else
  echo "  ✓ Frontend already built"
fi

# ── Create ~/.portctl directories ──

mkdir -p "$PORTCTL_DIR/logs"

# ── Symlink CLI to /usr/local/bin ──

SYMLINK_PATH="/usr/local/bin/portctl"
CLI_TARGET="$APP_DIR/bin/portctl.js"

chmod +x "$CLI_TARGET"

# Remove stale symlink if it points somewhere else
if [ -L "$SYMLINK_PATH" ]; then
  CURRENT_TARGET="$(readlink "$SYMLINK_PATH")"
  if [ "$CURRENT_TARGET" = "$CLI_TARGET" ]; then
    echo "  ✓ CLI symlink already correct"
  else
    echo "  ↻ Updating CLI symlink..."
    rm -f "$SYMLINK_PATH" 2>/dev/null || sudo rm -f "$SYMLINK_PATH"
    ln -sf "$CLI_TARGET" "$SYMLINK_PATH" 2>/dev/null || sudo ln -sf "$CLI_TARGET" "$SYMLINK_PATH"
    echo "  ✓ CLI updated at $SYMLINK_PATH"
  fi
elif [ -f "$SYMLINK_PATH" ]; then
  echo "  ! $SYMLINK_PATH exists but is not a symlink — skipping"
  echo "    Remove it manually if you want portctl installed there"
else
  if ln -sf "$CLI_TARGET" "$SYMLINK_PATH" 2>/dev/null; then
    echo "  ✓ CLI installed at $SYMLINK_PATH"
  else
    echo "  ! Need sudo to create symlink at $SYMLINK_PATH"
    sudo ln -sf "$CLI_TARGET" "$SYMLINK_PATH"
    echo "  ✓ CLI installed at $SYMLINK_PATH"
  fi
fi

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
