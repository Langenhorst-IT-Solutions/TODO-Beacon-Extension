import tseslint from 'typescript-eslint';

export default tseslint.config(
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-floating-promises': 'off',
      'no-console': 'warn',
    },
  },
  {
    ignores: ['out/', 'dist/', 'esbuild.js', 'commitlint.config.cjs', '.vscode-test.mjs'],
  }
);
