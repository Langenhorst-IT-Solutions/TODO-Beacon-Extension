// @ts-check
'use strict';

/**
 * VSIX Packaging Script for semantic-release
 *
 * Problem: VSIX manifests require major.minor.patch (all-numeric) — semver
 * pre-release strings like "1.0.0-rc.1" are invalid in the Identity.Version
 * XML attribute. vsce also validates --packageVersion against semver, so
 * 4-part versions like "1.0.0.1" would fail too.
 *
 * Solution:
 *  - Pre-release "1.0.0-rc.1" → package as "1.0.0" with --pre-release flag.
 *    The output file is named "todo-beacon-1.0.0-rc.1.vsix" so the RC number
 *    is visible in the GitHub release asset.
 *  - Stable "1.0.0" → package as "1.0.0", update package.json.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const semverVersion = process.argv[2];
if (!semverVersion) {
  console.error('Usage: node scripts/vsix-package.js <version>');
  process.exit(1);
}

const preReleaseMatch = /^(\d+\.\d+\.\d+)-(.+)$/.exec(semverVersion);
const isPreRelease = preReleaseMatch !== null;
const vsixVersion = isPreRelease ? preReleaseMatch[1] : semverVersion;
const vsixFileName = `todo-beacon-${semverVersion}.vsix`;

if (!isPreRelease) {
  const pkgPath = path.resolve(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = vsixVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`Updated package.json version → ${vsixVersion}`);
}

// Version is a positional arg for vsce; use --no-git-tag-version and
// --no-update-package-json so vsce doesn't interfere with semantic-release.
const vsceArgs = [
  'package',
  vsixVersion,
  '--out', vsixFileName,
  '--no-git-tag-version',
  '--no-update-package-json',
  '--no-dependencies',
];
if (isPreRelease) vsceArgs.push('--pre-release');

const vscePath = path.resolve(__dirname, '..', 'node_modules', '.bin', 'vsce');

console.log(`Packaging: ${vsixFileName} (${isPreRelease ? 'pre-release' : 'stable'})`);
const result = spawnSync(vscePath, vsceArgs, { stdio: 'inherit', shell: false });

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
