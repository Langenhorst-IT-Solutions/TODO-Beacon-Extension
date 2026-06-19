import * as assert from 'assert';
import { FuzzyMatcher, similarity } from '../../index/FuzzyMatcher';
import { SidecarIndex } from '../../index/SidecarIndex';
import { TodoComment } from '../../types';

function makeIndex(): SidecarIndex {
  return new SidecarIndex(null);
}

function todo(overrides: Partial<TodoComment> = {}): TodoComment {
  return {
    id: null,
    tag: 'TODO',
    text: 'refactor loop',
    file: 'src/a.ts',
    line: 10,
    column: 4,
    rawLine: '// TODO: refactor loop',
    ...overrides,
  };
}

suite('similarity()', () => {
  test('identical strings → 1', () => {
    assert.strictEqual(similarity('hello', 'hello'), 1);
  });

  test('empty strings → 1', () => {
    assert.strictEqual(similarity('', ''), 1);
  });

  test('completely different → 0', () => {
    assert.strictEqual(similarity('abc', 'xyz'), 0);
  });

  test('single char change is above 0.85 for medium text', () => {
    // 'refactor loop' vs 'refactor lop' → 13 vs 12 chars, dist=1 → sim ≈ 0.923
    const s = similarity('refactor loop', 'refactor lop');
    assert.ok(s >= 0.85, `expected ≥0.85, got ${s}`);
  });

  test('very different strings are below threshold', () => {
    const s = similarity('refactor loop', 'completely unrelated text here');
    assert.ok(s < 0.85, `expected <0.85, got ${s}`);
  });
});

suite('FuzzyMatcher', () => {
  test('returns new when index is empty', () => {
    const idx = makeIndex();
    const matcher = new FuzzyMatcher(idx);
    assert.deepStrictEqual(matcher.match(todo()), { kind: 'new' });
  });

  test('matches by stable code ID', () => {
    const idx = makeIndex();
    idx.addOrUpdate({ id: 'syn1', tag: 'TODO', text: 'anything', file: 'src/a.ts', line: 5, textHash: '', codeId: 'ab12' });
    const matcher = new FuzzyMatcher(idx);
    const result = matcher.match(todo({ id: 'ab12' }));
    assert.strictEqual(result.kind, 'matched');
    if (result.kind === 'matched') assert.strictEqual(result.entry.id, 'syn1');
  });

  test('matches by exact text + file', () => {
    const idx = makeIndex();
    idx.addOrUpdate({ id: 'ex1', tag: 'TODO', text: 'refactor loop', file: 'src/a.ts', line: 99, textHash: '', codeId: null });
    const matcher = new FuzzyMatcher(idx);
    const result = matcher.match(todo());
    assert.strictEqual(result.kind, 'matched');
    if (result.kind === 'matched') assert.strictEqual(result.entry.id, 'ex1');
  });

  test('exact text match fails for different file', () => {
    const idx = makeIndex();
    idx.addOrUpdate({ id: 'ex2', tag: 'TODO', text: 'refactor loop', file: 'src/b.ts', line: 0, textHash: '', codeId: null });
    const matcher = new FuzzyMatcher(idx);
    const result = matcher.match(todo({ file: 'src/a.ts' }));
    // No exact or fuzzy match for the right file — could still fuzzy match.
    // With only one candidate from a DIFFERENT file, result is new.
    assert.strictEqual(result.kind, 'new');
  });

  test('fuzzy matches similar text in same file', () => {
    const idx = makeIndex();
    // 'refactor lop' is close enough to 'refactor loop'
    idx.addOrUpdate({ id: 'fuz1', tag: 'TODO', text: 'refactor lop', file: 'src/a.ts', line: 10, textHash: '', codeId: null });
    const matcher = new FuzzyMatcher(idx);
    const result = matcher.match(todo());
    assert.strictEqual(result.kind, 'matched');
  });

  test('ambiguous when two similar entries exist in same file', () => {
    const idx = makeIndex();
    // Both 'refactor lop' and 'refactor loops' have similarity ≥ 0.85 to 'refactor loop'.
    idx.addOrUpdate({ id: 'am1', tag: 'TODO', text: 'refactor lop', file: 'src/a.ts', line: 10, textHash: '', codeId: null });
    idx.addOrUpdate({ id: 'am2', tag: 'TODO', text: 'refactor loops', file: 'src/a.ts', line: 20, textHash: '', codeId: null });
    const matcher = new FuzzyMatcher(idx);
    const result = matcher.match(todo());
    assert.strictEqual(result.kind, 'ambiguous');
  });
});
