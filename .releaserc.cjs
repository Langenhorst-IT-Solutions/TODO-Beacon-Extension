const NOTE_TITLES = {
  'BREAKING CHANGE': '💥 Breaking Changes',
  'BREAKING-CHANGE': '💥 Breaking Changes',
  'BREAKING CHANGES': '💥 Breaking Changes',
  DEPRECATED: '🗑️ Deprecated',
  REMOVED: '🚫 Removed',
};

function finalizeContext(context) {
  if (context.noteGroups) {
    for (const group of context.noteGroups) {
      if (NOTE_TITLES[group.title]) {
        group.title = NOTE_TITLES[group.title];
      }
    }
  }
  return context;
}

module.exports = {
  branches: [
    'main',
    {
      name: 'dev',
      prerelease: 'rc',
    },
  ],
  plugins: [
    '@semantic-release/commit-analyzer',
    [
      '@semantic-release/release-notes-generator',
      {
        presetConfig: {
          noteKeywords: ['BREAKING CHANGE', 'DEPRECATED', 'REMOVED'],
          types: [
            { type: 'feat', section: '✨ New Features' },
            { type: 'fix', section: '🐛 Bug Fixes' },
            { type: 'perf', section: '⚡ Performance Improvements' },
            { type: 'revert', section: '⏪ Reverts' },
            { type: 'docs', hidden: true },
            { type: 'style', hidden: true },
            { type: 'chore', hidden: true },
            { type: 'refactor', hidden: true },
            { type: 'test', hidden: true },
            { type: 'build', hidden: true },
            { type: 'ci', hidden: true },
          ],
        },
        writerOpts: {
          finalizeContext,
        },
      },
    ],
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md',
      },
    ],
    [
      '@semantic-release/exec',
      {
        prepareCmd: 'node scripts/vsix-package.js ${nextRelease.version}',
      },
    ],
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json'],
        message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
    [
      '@semantic-release/github',
      {
        assets: [
          {
            path: '*.vsix',
            label: 'VS Code Extension (${nextRelease.gitTag})',
          },
        ],
      },
    ],
  ],
};
