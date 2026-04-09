#!/usr/bin/env bash
# install.sh — set up DeepKind dev environment
# Run once after cloning: ./install.sh
set -e

RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; NC='\033[0m'

ok()   { echo -e "${GREEN}  ✓ $1${NC}"; }
warn() { echo -e "${YELLOW}  ⚠ $1${NC}"; }
fail() { echo -e "${RED}  ✗ $1${NC}"; exit 1; }

echo ""
echo "DeepKind — install"
echo "──────────────────────────────────────"

# ── 1. Node.js ───────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  fail "Node.js not found. Install from https://nodejs.org (v18+ required)"
fi
NODE_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  fail "Node.js v18+ required (found $(node --version))"
fi
ok "Node.js $(node --version)"

# ── 2. pnpm ──────────────────────────────────────────────────────────────────
if ! command -v pnpm &>/dev/null; then
  echo "  pnpm not found — installing via npm..."
  npm install -g pnpm
fi
ok "pnpm $(pnpm --version)"

# ── 3. Native build tools (required by better-sqlite3 via @tinacms/cli) ─────
MISSING_TOOLS=()
command -v python3 &>/dev/null || MISSING_TOOLS+=("python3")
command -v make    &>/dev/null || MISSING_TOOLS+=("make")
command -v g++     &>/dev/null || MISSING_TOOLS+=("g++")

if [ ${#MISSING_TOOLS[@]} -gt 0 ]; then
  warn "Missing native build tools: ${MISSING_TOOLS[*]}"
  warn "TinaCMS requires these to compile better-sqlite3."
  echo ""

  # Offer to install automatically on Debian/Ubuntu
  if command -v apt-get &>/dev/null; then
    echo -n "  Install build-essential + python3 via apt? [Y/n] "
    read -r answer
    if [[ "${answer,,}" != "n" ]]; then
      sudo apt-get update -qq
      sudo apt-get install -y build-essential python3
      ok "Build tools installed"
    else
      fail "Cannot continue without build tools. Install them and re-run ./install.sh"
    fi
  else
    echo "  On macOS:          xcode-select --install"
    echo "  On Arch/Manjaro:   sudo pacman -S base-devel python"
    echo "  On Fedora/RHEL:    sudo dnf groupinstall 'Development Tools' && sudo dnf install python3"
    echo ""
    fail "Install the tools above and re-run ./install.sh"
  fi
else
  ok "Build tools (python3, make, g++)"
fi

# ── 4. Clean install ─────────────────────────────────────────────────────────
echo ""
echo "Installing dependencies..."

# Remove stale node_modules to avoid cache errors
if [ -d node_modules ]; then
  echo "  Removing existing node_modules..."
  rm -rf node_modules
fi

# Install without running build scripts so a single failing native addon
# (better-sqlite3) can't abort the entire install.
pnpm install --ignore-scripts

echo ""
echo "Building native addons..."

# esbuild and sharp use prebuilt binaries — always succeed.
pnpm rebuild esbuild sharp core-js protobufjs 2>/dev/null || true
ok "esbuild, sharp, core-js, protobufjs"

# better-sqlite3 is pulled in by @tinacms/cli (CMS editing only).
# On Node 24+ with Apple Clang 16, Node's V8 headers require C++20
# aggregate NTTPs (P0732) which Apple Clang 16 does not implement.
# Source compilation is impossible; there are no prebuilt binaries yet
# for Node 24+ arm64 darwin. Astro dev (pnpm dev) is unaffected.
if [ "$NODE_MAJOR" -ge 24 ]; then
  warn "Node $NODE_MAJOR + Apple Clang 16: better-sqlite3 cannot compile."
  warn "TinaCMS CMS mode (./dev.sh) is unavailable on this configuration."
  warn "To use TinaCMS: switch to Node 22 LTS  →  nvm use 22"
  warn "Astro-only dev still works:  pnpm dev"
else
  pnpm rebuild better-sqlite3 2>/dev/null \
    && ok "better-sqlite3" \
    || warn "better-sqlite3 failed to build — TinaCMS CMS mode unavailable"
fi

echo ""
ok "All done."
if [ "$NODE_MAJOR" -lt 24 ]; then
  ok "Start site:  ./dev.sh  (TinaCMS + Astro)"
else
  ok "Start Astro dev:  pnpm dev  (TinaCMS unavailable on Node $NODE_MAJOR)"
fi
echo ""
