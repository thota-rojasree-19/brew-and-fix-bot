#!/usr/bin/env bash
set -euo pipefail

if [ ! -f gate-report.json ]; then
  echo "No gate-report.json found."
  exit 1
fi

node -e "
const fs = require('fs');
const report = JSON.parse(fs.readFileSync('gate-report.json', 'utf8'));

if (report.status !== 'failed') {
  fs.writeFileSync('prompt.txt', 'All gates passed.');
} else {

let cycleNum = process.env.CYCLE_NUM || '1';
let cycleMax = process.env.CYCLE_MAX || '10';

let prompt = \`CYCLE \${cycleNum} of \${cycleMax} — gates failed
Tier: \${report.tier}
Commit: \${report.commit}
Signature: \${report.failureSignature}

FAILURES (\${report.gates.reduce((acc, g) => acc + g.failures.length, 0)}, first 20):
\`;

let count = 0;
const failuresToProcess = [];

for (const gate of report.gates) {
  for (const failure of gate.failures) {
    if (count < 20) {
      prompt += \`\${failure.file}:\${failure.line} [\${failure.code}] \${failure.message}\n\`;
      failuresToProcess.push(failure);
      count++;
    }
  }
}

prompt += \`\nRELEVANT SOURCE:\n\`;

failuresToProcess.forEach(f => {
  try {
    if (fs.existsSync(f.file)) {
      const lines = fs.readFileSync(f.file, 'utf8').split('\n');
      const start = Math.max(0, f.line - 15);
      const end = Math.min(lines.length, f.line + 15);
      prompt += \`\n--- \${f.file}:\${f.line} ---\n\`;
      for (let i = start; i < end; i++) {
        prompt += \`\${i + 1}: \${lines[i]}\n\`;
      }
    }
  } catch (e) {}
});

prompt += \`\nPRIOR ATTEMPTS ON THIS SIGNATURE:\nNone recorded yet.\n
CONSTRAINTS:
- Do NOT modify: e2e/, scripts/, biome.json, tsconfig.json, playwright.config.*
- Do NOT add: @ts-ign\" + \"ore, @ts-expect-err\" + \"or, as a\" + \"ny, biome-ign\" + \"ore, test.sk\" + \"ip, test.on\" + \"ly, xi\" + \"t, describe.sk\" + \"ip
- Do NOT weaken assertions or reduce assertion count
- Fix the source cause.
- If a test is genuinely wrong, STOP and say so.\`;

fs.writeFileSync('prompt.txt', prompt);
console.log('Generated prompt.txt');
}
"
