import * as assert from 'assert';
import { SidecarIndex } from '../../index/SidecarIndex';

suite('SidecarIndex — pure logic', () => {
  test('syntheticId is stable for the same input', () => {
    const a = SidecarIndex.syntheticId('refactor loop', 'src/foo.ts');
    const b = SidecarIndex.syntheticId('refactor loop', 'src/foo.ts');
    assert.strictEqual(a, b);
  });

  test('syntheticId differs for different files', () => {
    const a = SidecarIndex.syntheticId('refactor loop', 'src/foo.ts');
    const b = SidecarIndex.syntheticId('refactor loop', 'src/bar.ts');
    assert.notStrictEqual(a, b);
  });

  test('syntheticId differs for different texts', () => {
    const a = SidecarIndex.syntheticId('refactor loop', 'src/foo.ts');
    const b = SidecarIndex.syntheticId('fix bug', 'src/foo.ts');
    assert.notStrictEqual(a, b);
  });

  test('syntheticId is 8 hex chars', () => {
    const id = SidecarIndex.syntheticId('hello', 'file.ts');
    assert.match(id, /^[0-9a-f]{8}$/);
  });

  test('textHash is stable', () => {
    assert.strictEqual(SidecarIndex.textHash('Hello World'), SidecarIndex.textHash('Hello World'));
  });

  test('textHash normalises whitespace and case', () => {
    assert.strictEqual(SidecarIndex.textHash('  hello  world  '), SidecarIndex.textHash('hello world'));
    assert.strictEqual(SidecarIndex.textHash('Hello World'), SidecarIndex.textHash('hello world'));
  });
});

suite('SidecarIndex — in-memory operations', () => {
  function makeIndex(): SidecarIndex {
    return new SidecarIndex(null);
  }

  test('addOrUpdate + findById round-trip', () => {
    const idx = makeIndex();
    idx.addOrUpdate({
      id: 'abc12345',
      tag: 'TODO',
      text: 'fix loop',
      file: 'src/a.ts',
      line: 10,
      textHash: SidecarIndex.textHash('fix loop'),
      codeId: null,
    });
    const found = idx.findById('abc12345');
    assert.ok(found);
    assert.strictEqual(found.text, 'fix loop');
  });

  test('findByTextAndFile returns correct entry', () => {
    const idx = makeIndex();
    idx.addOrUpdate({ id: 'x1', tag: 'TODO', text: 'task a', file: 'a.ts', line: 1, textHash: '', codeId: null });
    idx.addOrUpdate({ id: 'x2', tag: 'FIXME', text: 'task b', file: 'b.ts', line: 2, textHash: '', codeId: null });
    assert.strictEqual(idx.findByTextAndFile('task a', 'a.ts')?.id, 'x1');
    assert.strictEqual(idx.findByTextAndFile('task b', 'a.ts'), undefined);
  });

  test('findByCodeId locates entry by code-injected id', () => {
    const idx = makeIndex();
    idx.addOrUpdate({ id: 'syn1', tag: 'TODO', text: 't', file: 'f.ts', line: 0, textHash: '', codeId: '7f3a' });
    assert.strictEqual(idx.findByCodeId('7f3a')?.id, 'syn1');
    assert.strictEqual(idx.findByCodeId('0000'), undefined);
  });

  test('delete removes entry', () => {
    const idx = makeIndex();
    idx.addOrUpdate({ id: 'del1', tag: 'NOTE', text: 'n', file: 'f.ts', line: 0, textHash: '', codeId: null });
    assert.strictEqual(idx.size(), 1);
    idx.delete('del1');
    assert.strictEqual(idx.size(), 0);
  });

  test('all() returns all entries', () => {
    const idx = makeIndex();
    idx.addOrUpdate({ id: 'a', tag: 'TODO', text: 'a', file: 'f.ts', line: 0, textHash: '', codeId: null });
    idx.addOrUpdate({ id: 'b', tag: 'BUG', text: 'b', file: 'f.ts', line: 1, textHash: '', codeId: null });
    assert.strictEqual(idx.all().length, 2);
  });
});
