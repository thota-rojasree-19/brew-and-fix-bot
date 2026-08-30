#!/usr/bin/env bash
set -euo pipefail

echo "Running verify-protected.sh..."

set +e
MODIFIED_FILES=$(git diff --name-only HEAD)
UNTRACKED_FILES=$(git ls-files --others --exclude-standard)
set -e

VIOLATIONS=""
ALL_FILES="$MODIFIED_FILES $UNTRACKED_FILES"

for file in $ALL_FILES; do
  if [[ "$file" == e2e/* ]] || [[ "$file" == scripts/* ]] || [[ "$file" == "biome.json" ]] || [[ "$file" == "tsconfig.json" ]] || [[ "$file" == playwright.config.* ]]; then
    VIOLATIONS="$VIOLATIONS\n  - $file"
  fi
done

if [ -n "$VIOLATIONS" ]; then
  echo -e "ERROR: Protected harness files were modified:$VIOLATIONS"
  exit 1
fi

echo "Protected paths verification passed."
exit 0
