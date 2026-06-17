// @ts-check
'use strict';

/**
 * Coverage Badge Generator
 *
 * Reads coverage/coverage-summary.json (produced by `npm run coverage`) and
 * writes .github/badges/coverage.json in shields.io "endpoint badge" format:
 * https://shields.io/badges/endpoint-badge
 *
 * The README points a shields.io badge at the raw GitHub URL of that file,
 * so no external coverage service or account is required.
 */

const fs = require('fs');
const path = require('path');

const summaryPath = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');
const badgePath = path.join(__dirname, '..', '.github', 'badges', 'coverage.json');

if (!fs.existsSync(summaryPath)) {
  console.error(`Coverage summary not found at ${summaryPath}. Run "npm run coverage" first.`);
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const pct = summary.total.lines.pct;

function colorFor(pct) {
  if (pct >= 90) return 'brightgreen';
  if (pct >= 80) return 'green';
  if (pct >= 70) return 'yellowgreen';
  if (pct >= 60) return 'yellow';
  if (pct >= 50) return 'orange';
  return 'red';
}

const badge = {
  schemaVersion: 1,
  label: 'coverage',
  message: `${pct.toFixed(1)}%`,
  color: colorFor(pct),
};

fs.mkdirSync(path.dirname(badgePath), { recursive: true });
fs.writeFileSync(badgePath, JSON.stringify(badge));
console.log(`Wrote ${badgePath}: ${badge.message} (${badge.color})`);
