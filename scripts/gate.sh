#!/usr/bin/env bash
set -euo pipefail

TIER="${1:-}"

if [ "$TIER" != "0" ] && [ "$TIER" != "1" ]; then
  echo "Usage: bash scripts/gate.sh <tier>"
  echo "tier must be 0 or 1"
  exit 1
fi

trap 'if [ $? -ne 0 ]; then node scripts/gate-report.mjs "$TIER" failed; bash scripts/build-prompt.sh; else node scripts/gate-report.mjs "$TIER" passed; fi' EXIT

echo "=== Tier $TIER Gate Execution ==="

echo "=> Running standards (scan-banned.sh)..."
if ! bash scripts/scan-banned.sh; then
  echo "GATE FAILED: standards"
  exit 1
fi

echo "=> Running lint..."
LINT_FAILED=0
if ! npm run lint; then
  LINT_FAILED=1
fi

set +e
./node_modules/.bin/biome check src --reporter=json > biome-report.json 2>/dev/null
BIOME_EXIT=$?
set -e

if [ "$BIOME_EXIT" -ne 0 ]; then
  LINT_FAILED=1
fi

if [ "$LINT_FAILED" -ne 0 ]; then
  echo "GATE FAILED: lint"
  exit 1
fi

echo "=> Running typecheck..."
set +e
./node_modules/.bin/tsc --noEmit > tsc.log 2>&1
TSC_EXIT=$?
set -e
if [ "$TSC_EXIT" -ne 0 ]; then
  echo "GATE FAILED: typecheck"
  exit 1
fi

echo "=> Running build..."
if ! npm run build; then
  echo "GATE FAILED: build"
  exit 1
fi

if [ "$TIER" -eq 1 ]; then
  echo "=> Running Playwright e2e..."
  set +e
  PLAYWRIGHT_JSON_OUTPUT_NAME=playwright-report.json npx playwright test --reporter=json > /dev/null 2>&1
  E2E_EXIT=$?
  set -e
  if [ "$E2E_EXIT" -ne 0 ]; then
    echo "GATE FAILED: e2e"
    exit 1
  fi
fi

echo "ALL GATES PASSED"
exit 0
