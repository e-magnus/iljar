#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOCK_FILE="$PROJECT_DIR/.next/dev/lock"

echo "Leita að keyrandi next dev ferlum..."
pkill -f "next dev" >/dev/null 2>&1 || true

if [ -f "$LOCK_FILE" ]; then
  echo "Hreinsa stale lock: $LOCK_FILE"
  rm -f "$LOCK_FILE"
fi

echo "Ræsi þróunarserver..."
cd "$PROJECT_DIR"
npm run dev
