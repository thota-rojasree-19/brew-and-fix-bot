#!/usr/bin/env bash
set -euo pipefail

TIER="${1:-1}"
CYCLE_MAX="${CYCLE_MAX:-5}"

echo "Starting Harness Cycle for Tier $TIER"

# Save the baseline commit to revert to if needed
BASELINE_COMMIT=$(git rev-parse HEAD)
echo "Baseline commit: $BASELINE_COMMIT"

# Oscillation detection tracking
declare -A SEEN_SIGNATURES
LAST_SIGNATURE=""

for (( cycle=1; cycle<=CYCLE_MAX; cycle++ )); do
  echo "--- Cycle $cycle of $CYCLE_MAX ---"
  START_SECONDS=$SECONDS
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # Create temporary .prettierignore to bypass intentional Prettier errors in protected files
  if [ -f .prettierignore ]; then cp .prettierignore .prettierignore.bak; fi
  echo -e "e2e/\nscripts/\nplaywright.config.ts" > .prettierignore

  # 1. Run the gate
  set +e
  bash scripts/gate.sh "$TIER"
  GATE_EXIT=$?
  set -e

  # Clean up temporary bypass
  if [ -f .prettierignore.bak ]; then mv .prettierignore.bak .prettierignore; else rm -f .prettierignore; fi

  # 2. Check results
  if [ ! -f gate-report.json ]; then
    echo "ERROR: gate-report.json missing!"
    exit 1
  fi

  # Read status and signature
  STATUS=$(node -e "console.log(JSON.parse(require('fs').readFileSync('gate-report.json')).status)")
  SIGNATURE=$(node -e "console.log(JSON.parse(require('fs').readFileSync('gate-report.json')).failureSignature)")

  # Capture changed files and duration
  FILES_CHANGED=$(git diff --name-only HEAD | paste -sd "," - || echo "")
  DURATION_SEC=$(( SECONDS - START_SECONDS ))

  # Log to cycles.jsonl
  echo "{\"timestamp\": \"$TIMESTAMP\", \"cycle\": $cycle, \"tier\": $TIER, \"status\": \"$STATUS\", \"signature\": \"$SIGNATURE\", \"attempts\": $cycle, \"durationSec\": $DURATION_SEC, \"filesChanged\": \"$FILES_CHANGED\"}" >> cycles.jsonl

  if [ "$STATUS" == "passed" ]; then
    echo "SUCCESS: All gates passed on cycle $cycle!"
    exit 0
  fi

  # 3. Handle Failure
  echo "Cycle $cycle failed. Signature: $SIGNATURE"
  
  # Build prompt
  CYCLE_NUM="$cycle" CYCLE_MAX="$CYCLE_MAX" bash scripts/build-prompt.sh

  # Oscillation check
  if [ -n "$LAST_SIGNATURE" ] && [ "$SIGNATURE" != "$LAST_SIGNATURE" ] && [ -n "${SEEN_SIGNATURES[$SIGNATURE]:-}" ]; then
    echo "ESCALATION: oscillation detected"
    cp cycles.jsonl "$HOME/cycles.jsonl.bak"
    git reset --hard "$BASELINE_COMMIT"
    git clean -fd --exclude=scripts/cycle.sh
    mv "$HOME/cycles.jsonl.bak" cycles.jsonl
    exit 1
  fi

  if [ -n "${SEEN_SIGNATURES[$SIGNATURE]:-}" ]; then
    SEEN_SIGNATURES[$SIGNATURE]=$((SEEN_SIGNATURES[$SIGNATURE] + 1))
    if [ "${SEEN_SIGNATURES[$SIGNATURE]}" -ge 3 ]; then
      echo "ESCALATION: oscillation detected"
      cp cycles.jsonl "$HOME/cycles.jsonl.bak"
      git reset --hard "$BASELINE_COMMIT"
      git clean -fd --exclude=scripts/cycle.sh
      mv "$HOME/cycles.jsonl.bak" cycles.jsonl
      exit 1
    fi
  else
    SEEN_SIGNATURES[$SIGNATURE]=1
  fi
  
  LAST_SIGNATURE="$SIGNATURE"

  # 4. Mode B: Prompt User
  echo "============================================================"
  echo "MODE B: Dyad/Agent execution is required."
  echo "Please copy the contents of 'prompt.txt' and paste it to the agent."
  echo "Wait for the agent to finish modifying the code."
  echo "============================================================"
  read -p "Press ENTER when the agent has completed its work... " -r

  # 5. Protection Checks
  set +e
  bash scripts/verify-protected.sh
  PROTECTED_EXIT=$?
  set -e
  
  if [ "$PROTECTED_EXIT" -ne 0 ]; then
    echo "ESCALATION: Protected file violation detected!"
    cp cycles.jsonl "$HOME/cycles.jsonl.bak"
    git reset --hard "$BASELINE_COMMIT"
    git clean -fd --exclude=scripts/cycle.sh
    mv "$HOME/cycles.jsonl.bak" cycles.jsonl
    exit 1
  fi

  # Tamper / banned pattern check
  set +e
  bash scripts/scan-banned.sh
  BANNED_EXIT=$?
  set -e

  if [ "$BANNED_EXIT" -ne 0 ]; then
    echo "ESCALATION: Banned pattern (tamper) detected"
    cp cycles.jsonl "$HOME/cycles.jsonl.bak"
    git reset --hard "$BASELINE_COMMIT"
    git clean -fd --exclude=scripts/cycle.sh
    mv "$HOME/cycles.jsonl.bak" cycles.jsonl
    exit 1
  fi

done

echo "ESCALATION: Bounded attempts exhausted"
cp cycles.jsonl "$HOME/cycles.jsonl.bak"
git reset --hard "$BASELINE_COMMIT"
git clean -fd --exclude=scripts/cycle.sh
mv "$HOME/cycles.jsonl.bak" cycles.jsonl
exit 1
