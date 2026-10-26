import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out/test/**/*.test.js',
  workspaceFolder: './marketing-assets/sample-repo',
  // Opening editors in a cold test instance regularly exceeds Mocha's 2s default.
  mocha: { timeout: 10000 },
});
