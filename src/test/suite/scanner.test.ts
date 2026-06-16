import * as assert from 'assert';
import { CodeScanner } from '../../scanner/CodeScanner';

suite('CodeScanner.parseLines', () => {
  const scanner = new CodeScanner(['TODO', 'FIXME', 'BUG', 'NOTE']);

  test('finds a simple TODO', () => {
    const result = scanner.parseLines('// TODO: fix this', 'file.ts');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].tag, 'TODO');
    assert.strictEqual(result[0].text, 'fix this');
  });

  test('finds a FIXME', () => {
    const result = scanner.parseLines('  # FIXME: broken logic', 'file.py');
    assert.strictEqual(result[0].tag, 'FIXME');
    assert.strictEqual(result[0].text, 'broken logic');
  });

  test('assigns correct line number (0-indexed)', () => {
    const content = 'line one\nline two\n// TODO: here';
    const result = scanner.parseLines(content, 'f.ts');
    assert.strictEqual(result[0].line, 2);
  });

  test('returns empty for content without tags', () => {
    const result = scanner.parseLines('const x = 1;\nconst y = 2;', 'f.ts');
    assert.deepStrictEqual(result, []);
  });

  test('does not match tags not in the configured list', () => {
    const result = scanner.parseLines('// HACK: workaround', 'f.ts');
    assert.deepStrictEqual(result, []);
  });

  test('finds multiple TODOs across lines', () => {
    const content = '// TODO: first\ncode\n// TODO: second';
    const result = scanner.parseLines(content, 'f.ts');
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].text, 'first');
    assert.strictEqual(result[1].text, 'second');
  });

  test('handles Windows CRLF line endings', () => {
    const result = scanner.parseLines('// TODO: first\r\n// TODO: second', 'f.ts');
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].line, 0);
    assert.strictEqual(result[1].line, 1);
  });

  test('extracts stable ID from comment', () => {
    const result = scanner.parseLines('// TODO: refactor loop (#7f3a)', 'f.ts');
    assert.strictEqual(result[0].id, '7f3a');
    assert.strictEqual(result[0].text, 'refactor loop');
  });

  test('sets id to null when no ID present', () => {
    const result = scanner.parseLines('// TODO: plain comment', 'f.ts');
    assert.strictEqual(result[0].id, null);
  });

  test('records correct column for the tag keyword', () => {
    const result = scanner.parseLines('    // TODO: indented', 'f.ts');
    const line = '    // TODO: indented';
    assert.strictEqual(result[0].column, line.indexOf('TODO'));
  });
});
