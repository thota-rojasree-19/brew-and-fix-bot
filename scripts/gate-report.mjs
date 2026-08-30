import fs from "fs";
import crypto from "crypto";
import { execSync } from "child_process";

const args = process.argv.slice(2);
const tier = args[0] ? parseInt(args[0], 10) : 0;
const status = args[1] || "failed";

let commit = "";
try {
  commit = execSync("git rev-parse HEAD").toString().trim();
} catch (e) {}

const failures = [];

try {
  if (fs.existsSync("scan-banned.json")) {
    const scanData = JSON.parse(fs.readFileSync("scan-banned.json", "utf8"));
    if (scanData && scanData.newFindings) {
      scanData.newFindings.forEach((finding) => {
        const parts = finding.split(':');
        const file = parts[0] || "unknown";
        const line = parts[1] ? parseInt(parts[1], 10) : 0;
        const message = parts.slice(2).join(':');
        failures.push({
          gate: "standards",
          file,
          line,
          code: "BANNED_PATTERN",
          message,
        });
      });
    }
  }
} catch (e) {}

try {
  if (fs.existsSync("biome-report.json")) {
    const biomeData = JSON.parse(fs.readFileSync("biome-report.json", "utf8"));
    if (biomeData && biomeData.diagnostics) {
      biomeData.diagnostics.forEach((diag) => {
        if (diag.severity === "error") {
          failures.push({
            gate: "lint",
            file: diag.location?.path || "unknown",
            line: diag.location?.start?.line || 0,
            column: diag.location?.start?.column || 0,
            code: diag.category,
            message: diag.message,
          });
        }
      });
    }
  }
} catch (e) {}

try {
  if (fs.existsSync("tsc.log")) {
    const tscLog = fs.readFileSync("tsc.log", "utf8");
    const tscRegex = /(.+)\((\d+),\d+\):\s+(error\s+TS\d+):\s+(.+)/g;
    let match;
    while ((match = tscRegex.exec(tscLog)) !== null) {
      failures.push({
        gate: "typecheck",
        file: match[1].trim(),
        line: parseInt(match[2], 10),
        code: match[3],
        message: match[4],
      });
    }
  }
} catch (e) {}

try {
  if (fs.existsSync("playwright-report.json")) {
    const pwData = JSON.parse(fs.readFileSync("playwright-report.json", "utf8"));
    if (pwData && pwData.suites) {
      const extractTests = (suites) => {
        suites.forEach((suite) => {
          if (suite.specs) {
            suite.specs.forEach((spec) => {
              if (!spec.ok) {
                const error = spec.tests[0]?.results[0]?.error;
                failures.push({
                  gate: "e2e",
                  file: spec.file,
                  line: spec.line,
                  code: "Playwright",
                  message: error?.message || "Test failed",
                });
              }
            });
          }
          if (suite.suites) extractTests(suite.suites);
        });
      };
      extractTests(pwData.suites);
    }
  }
} catch (e) {}

const sortedTuples = failures.map((f) => `${f.gate}:${f.file}:${f.code}`).sort();
let hash = "passed";
if (failures.length > 0) {
  hash = crypto.createHash("sha256").update(sortedTuples.join("|")).digest("hex");
}

const report = {
  tier,
  commit,
  status,
  failureSignature: failures.length > 0 ? `sha256:${hash}` : "none",
  gates: [],
};

const grouped = {};
failures.forEach((f) => {
  if (!grouped[f.gate]) grouped[f.gate] = [];
  grouped[f.gate].push(f);
});

Object.keys(grouped).forEach((gate) => {
  report.gates.push({
    gate,
    status: "failed",
    failures: grouped[gate],
  });
});

if (status === "passed") {
  report.gates.push({ gate: "all", status: "passed", failures: [] });
}

fs.writeFileSync("gate-report.json", JSON.stringify(report, null, 2));
console.log("Generated gate-report.json");
