#!/usr/bin/env bash
set -euo pipefail

echo "Running scan-banned.sh..."

P1="(@ts-ign""ore|@ts-exp""ect-error|as a""ny|biome-ign""ore|test\.sk""ip"
P2="|test\.on""ly|xi""t\(|describe\.sk""ip|continue-on-err""or|\|\| tr""ue)"
BANNED_PATTERN="${P1}${P2}"

set +e
MATCHES=$(grep -rnE "$BANNED_PATTERN" src/ e2e/ scripts/ 2>/dev/null)
EXIT_CODE=$?
set -e

if [ "$EXIT_CODE" -eq 0 ]; then
  echo "ERROR: Banned patterns found:"
  echo "$MATCHES"
  exit 1
fi

echo "No banned patterns found."
exit 0
