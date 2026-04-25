#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

mkdir -p data/raw data/clean

echo "=== Belfast UDI — Phase 1: Data Acquisition ==="
echo ""

for script in scripts/0[1-6]_*.py; do
  echo "--- Running $script ---"
  python3 "$script"
  echo ""
done

echo "--- Running sufficiency check ---"
python3 scripts/99_check_sufficiency.py
echo ""
echo "=== Done. See SUFFICIENCY.md ==="
