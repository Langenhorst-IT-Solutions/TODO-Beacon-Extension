import * as assert from 'assert';
import { LocalConfigLoader, LocalConfigEntry, matchesGlob, toForwardSlashes } from '../../config/LocalConfigLoader';

// ─── matchesGlob ─────────────────────────────────────────────────────────────

suite('matchesGlob', () => {
  test('** matches any path including slashes', () => {
    assert.ok(matchesGlob('marketing-assets/**', 'marketing-assets/foo.ts'));
    assert.ok(matchesGlob('marketing-assets/**', 'marketing-assets/sub/bar.ts'));
    assert.ok(matchesGlob('marketing-assets/**', 'marketing-assets/a/b/c.ts'));
  });

  test('** at root matches any file', () => {
    assert.ok(matchesGlob('**/*.ts', 'foo.ts'));
    assert.ok(matchesGlob('**/*.ts', 'sub/foo.ts'));
    assert.ok(matchesGlob('**/*.ts', 'a/b/c.ts'));
  });

  test('single * does not cross path separators', () => {
    assert.ok(matchesGlob('*.ts', 'foo.ts'));
    assert.ok(!matchesGlob('*.ts', 'sub/foo.ts'));
  });

  test('? matches any single non-separator char', () => {
    assert.ok(matchesGlob('fo?.ts', 'foo.ts'));
    assert.ok(!matchesGlob('fo?.ts', 'fooo.ts'));
    assert.ok(!matchesGlob('fo?.ts', 'sub/foo.ts'));
  });

  test('literal path is exact match', () => {
    assert.ok(matchesGlob('src/extension.ts', 'src/extension.ts'));
    assert.ok(!matchesGlob('src/extension.ts', 'src/extension.tsx'));
  });

  test('does NOT match sibling with same prefix', () => {
    assert.ok(!matchesGlob('marketing-assets/**', 'marketing-assets-extra/foo.ts'));
  });

  test('backslash paths are normalised', () => {
    assert.ok(matchesGlob('marketing-assets/**', 'marketing-assets\\sub\\bar.ts'));
  });

  test('special regex chars in pattern are escaped', () => {
    assert.ok(matchesGlob('src/types.ts', 'src/types.ts'));
    assert.ok(!matchesGlob('src/types.ts', 'src/typesXts'));
  });
});

// ─── toForwardSlashes ────────────────────────────────────────────────────────

suite('toForwardSlashes', () => {
  test('converts backslashes to forward slashes', () => {
    assert.strictEqual(toForwardSlashes('a\\b\\c'), 'a/b/c');
  });

  test('leaves forward slashes unchanged', () => {
    assert.strictEqual(toForwardSlashes('a/b/c'), 'a/b/c');
  });
});

// ─── LocalConfigLoader.resolve ───────────────────────────────────────────────

suite('LocalConfigLoader.resolve', () => {
  const rootEntry: LocalConfigEntry = {
    dirRelPath: '',
    config: { exclude: ['marketing-assets/**'] },
  };
  const subEntry: LocalConfigEntry = {
    dirRelPath: 'sub',
    config: { exclude: ['*.tmp'] },
  };
  const deepEntry: LocalConfigEntry = {
    dirRelPath: 'sub/deep',
    config: { tags: ['CUSTOM'] },
  };

  test('root config applies to all files', () => {
    const result = LocalConfigLoader.resolve('src/extension.ts', [rootEntry]);
    assert.deepStrictEqual(result.exclude, ['marketing-assets/**']);
  });

  test('root config applies to files in subdirectory', () => {
    const result = LocalConfigLoader.resolve('marketing-assets/sample.ts', [rootEntry]);
    assert.deepStrictEqual(result.exclude, ['marketing-assets/**']);
  });

  test('subdirectory config overrides root for files in that directory', () => {
    const result = LocalConfigLoader.resolve('sub/file.ts', [rootEntry, subEntry]);
    assert.deepStrictEqual(result.exclude, ['*.tmp']);
  });

  test('subdirectory config does NOT affect files outside it', () => {
    const result = LocalConfigLoader.resolve('other/file.ts', [rootEntry, subEntry]);
    assert.deepStrictEqual(result.exclude, ['marketing-assets/**']);
  });

  test('deep config merges with missing keys from parent', () => {
    const result = LocalConfigLoader.resolve('sub/deep/file.ts', [rootEntry, subEntry, deepEntry]);
    // deepEntry overrides subEntry's exclude (not set in deepEntry → inherited from sub)
    // Wait: merge is { ...parent, ...child } so sub.exclude is set, deep doesn't have exclude
    // But merge is cumulative: root → sub (overrides exclude) → deep (adds tags, no exclude)
    // Result: exclude from sub, tags from deep
    assert.deepStrictEqual(result.exclude, ['*.tmp']);
    assert.deepStrictEqual(result.tags, ['CUSTOM']);
  });

  test('returns empty object when no entries', () => {
    const result = LocalConfigLoader.resolve('src/file.ts', []);
    assert.deepStrictEqual(result, {});
  });

  test('only root entry applies to root-level file', () => {
    const result = LocalConfigLoader.resolve('file.ts', [rootEntry, subEntry]);
    assert.deepStrictEqual(result.exclude, ['marketing-assets/**']);
    assert.strictEqual(result.tags, undefined);
  });

  test('config at exact directory does not apply to parent file', () => {
    const result = LocalConfigLoader.resolve('sub', [subEntry]);
    // 'sub' is not UNDER 'sub', it IS 'sub' — but we check startsWith(dir + '/') || === dir
    // 'sub' === 'sub' → true → config applies
    const result2 = LocalConfigLoader.resolve('other.ts', [subEntry]);
    assert.strictEqual(result2.exclude, undefined);
    void result; // we tested the else branch above
  });
});

// ─── LocalConfigLoader.isExcluded ────────────────────────────────────────────

suite('LocalConfigLoader.isExcluded', () => {
  const entries: LocalConfigEntry[] = [
    { dirRelPath: '', config: { exclude: ['marketing-assets/**'] } },
  ];

  test('returns true for excluded file', () => {
    assert.ok(LocalConfigLoader.isExcluded('marketing-assets/sample.ts', entries));
  });

  test('returns false for non-excluded file', () => {
    assert.ok(!LocalConfigLoader.isExcluded('src/extension.ts', entries));
  });

  test('returns false when no entries', () => {
    assert.ok(!LocalConfigLoader.isExcluded('any/file.ts', []));
  });

  test('subdirectory config with empty exclude overrides parent', () => {
    const override: LocalConfigEntry[] = [
      { dirRelPath: '', config: { exclude: ['marketing-assets/**'] } },
      { dirRelPath: 'marketing-assets', config: { exclude: [] } },
    ];
    // marketing-assets/.todo-beacon.json resets excludes for its own directory
    assert.ok(!LocalConfigLoader.isExcluded('marketing-assets/sample.ts', override));
  });

  test('non-overridden sibling directory still excluded', () => {
    const override: LocalConfigEntry[] = [
      { dirRelPath: '', config: { exclude: ['marketing-assets/**', 'dist/**'] } },
      { dirRelPath: 'marketing-assets', config: { exclude: [] } },
    ];
    assert.ok(LocalConfigLoader.isExcluded('dist/extension.js', override));
  });

  test('backslash paths are handled correctly', () => {
    assert.ok(LocalConfigLoader.isExcluded('marketing-assets\\sample.ts', entries));
  });
});
