// @ts-check
'use strict';

/**
 * Fails the build if line coverage drops below the required threshold.
 * Reads coverage/coverage-summary.json, produced by `npm run coverage`.
 */

const fs = require('fs');
const path = require('path');

const THRESHOLD = 95;
const summaryPath = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');

if (!fs.existsSync(summaryPath)) {
  console.error(`Coverage summary not found at ${summaryPath}. Run "npm run coverage" first.`);
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const pct = summary.total.lines.pct;

if (pct < THRESHOLD) {
  console.error(`Line coverage ${pct.toFixed(1)}% is below the required ${THRESHOLD}% threshold.`);
  process.exit(1);
}

console.log(`Line coverage ${pct.toFixed(1)}% meets the required ${THRESHOLD}% threshold.`);
