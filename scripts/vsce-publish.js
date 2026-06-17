// @ts-check
'use strict';

/**
 * Marketplace Publish Script for semantic-release
 *
 * Only stable versions (no semver pre-release suffix, i.e. releases from
 * "main") are published to the Visual Studio Marketplace. RC builds from
 * "dev" (e.g. "1.0.0-rc.1") are skipped here — they only get a GitHub
 * pre-release with the .vsix attached (see scripts/vsix-package.js), since
 * pre-release versions are invalid for the Marketplace and shouldn't be
 * public anyway.
 *
 * Publishes the exact .vsix produced by the "prepare" step
 * (scripts/vsix-package.js), so what's published is what was tested.
 *
 * This runs as a *separate* @semantic-release/exec entry placed after
 * @semantic-release/github in .releaserc.json's plugin list (deliberately
 * split from the prepareCmd entry). semantic-release calls publish hooks in
 * plugin-list order, so the GitHub release is always created first — if the
 * Marketplace publish then fails (e.g. missing/expired VSCE_PAT), GitHub
 * still has the release and the .vsix, which stays the source of truth.
 */

const { spawnSync } = require('child_process');
const path = require('path');

const semverVersion = process.argv[2];
if (!semverVersion) {
  console.error('Usage: node scripts/vsce-publish.js <version>');
  process.exit(1);
}

const isPreRelease = /^(\d+\.\d+\.\d+)-(.+)$/.test(semverVersion);
if (isPreRelease) {
  console.log(`Skipping Marketplace publish for pre-release ${semverVersion}.`);
  process.exit(0);
}

if (!process.env.VSCE_PAT) {
  console.error('VSCE_PAT is not set — cannot publish to the Marketplace.');
  process.exit(1);
}

const vsixFileName = `todo-beacon-${semverVersion}.vsix`;
const vscePath = path.resolve(__dirname, '..', 'node_modules', '.bin', 'vsce');

console.log(`Publishing ${vsixFileName} to the Visual Studio Marketplace…`);
const result = spawnSync(vscePath, ['publish', '--packagePath', vsixFileName], {
  stdio: 'inherit',
  shell: false,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
