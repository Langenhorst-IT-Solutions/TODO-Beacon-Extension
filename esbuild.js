// @ts-check
const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  format: 'cjs',
  minify: production,
  sourcemap: !production,
  sourcesContent: false,
  platform: 'node',
  outfile: 'dist/extension.js',
  external: ['vscode'],
};

async function main() {
  if (watch) {
    const ctx = await esbuild.context({
      ...buildOptions,
      plugins: [
        {
          name: 'watch-logger',
          setup(build) {
            build.onStart(() => { process.stdout.write('[watch] build started\n'); });
            build.onEnd(() => { process.stdout.write('[watch] build finished\n'); });
          },
        },
      ],
    });
    await ctx.watch();
  } else {
    await esbuild.build(buildOptions);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
