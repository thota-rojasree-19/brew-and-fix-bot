#!/usr/bin/env bash
set -euo pipefail

echo "Running scan-banned.sh..."

BASELINE_COMMIT="9b9f313"

P1="(@ts-ign""ore|@ts-exp""ect-error|as a""ny|biome-ign""ore|test\.sk""ip"
P2="|test\.on""ly|xi""t\(|describe\.sk""ip|continue-on-err""or|\|\| tr""ue)"
BANNED_PATTERN="${P1}${P2}"

set +e
CURRENT_MATCHES=$(grep -rnE "$BANNED_PATTERN" src/ e2e/ scripts/ 2>/dev/null)
BASELINE_MATCHES=$(git grep -I -n -E "$BANNED_PATTERN" "$BASELINE_COMMIT" -- src/ e2e/ scripts/ 2>/dev/null | sed "s/^$BASELINE_COMMIT://")
set -e

node -e "
const fs = require('fs');

const currentMatches = \`$CURRENT_MATCHES\`.split('\n').filter(Boolean);
const baselineMatches = \`$BASELINE_MATCHES\`.split('\n').filter(Boolean);

const normalize = (match) => {
  const parts = match.split(':');
  if (parts.length >= 3) {
    const file = parts[0];
    const content = parts.slice(2).join(':').trim();
    return \`\${file}::\${content}\`;
  }
  return match;
};

const baselineSet = new Set(baselineMatches.map(normalize));

const newFindings = [];
const baselineFindings = [];

currentMatches.forEach(match => {
  const norm = normalize(match);
  if (baselineSet.has(norm)) {
    baselineFindings.push(match);
  } else {
    newFindings.push(match);
  }
});

const report = { newFindings, baselineFindings };
fs.writeFileSync('scan-banned.json', JSON.stringify(report, null, 2));

if (baselineFindings.length > 0) {
  console.log('Baseline banned-pattern findings (inherited, allowed):');
  baselineFindings.forEach(f => console.log('  ' + f));
}

if (newFindings.length > 0) {
  console.error('\nERROR: Newly introduced banned patterns found:');
  newFindings.forEach(f => console.error('  ' + f));
  process.exitCode = 1;
} else {
  console.log('No new banned patterns found.');
  process.exitCode = 0;
}
"
