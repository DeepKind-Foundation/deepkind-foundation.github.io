#!/usr/bin/env bash
set -e

# Start Astro + TinaCMS in dev mode.
# TinaCMS runs its local backend and wraps the Astro dev server.
# Site:    http://localhost:4321
# Tina UI: http://localhost:4321/admin
#
# NOTE: TinaCMS requires better-sqlite3, which cannot be compiled on
# Node 24+ with Apple Clang 16. If ./dev.sh fails, use: pnpm dev

pnpm cms
