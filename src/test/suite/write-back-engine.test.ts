import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { WriteBackEngine } from '../../sync/WriteBackEngine';
import { SidecarIndex } from '../../index/SidecarIndex';
import { Project, Task } from '../../types';

function makeIndex(): SidecarIndex {
  return new SidecarIndex(null);
}

function makeFolder(): vscode.WorkspaceFolder {
  return {
    uri: vscode.Uri.file(os.tmpdir()),
    name: 'tmp',
    index: 0,
  };
}

function project(tasks: Partial<Task>[]): Project {
  return {
    name: 'Test',
    tasks: tasks.map(t => ({
      id: null,
      text: 'task',
      status: 'open' as const,
      tags: {},
      lineNumber: 0,
      file: 'tasks.md',
      ...t,
    })),
    lineNumber: 0,
    level: 1,
    children: [],
  };
}

async function writeTmp(name: string, content: string): Promise<{ uri: vscode.Uri; name: string }> {
  const uri = vscode.Uri.file(path.join(os.tmpdir(), name));
  await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(content));
  return { uri, name };
}

async function readTmp(uri: vscode.Uri): Promise<string> {
  return new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
}

suite('WriteBackEngine — buildChanges', () => {
  test('returns no changes when no tasks are done/cancelled', () => {
    const idx = makeIndex();
    idx.addOrUpdate({ id: 'syn1', tag: 'TODO', text: 'fix loop', file: 'a.ts', line: 5, textHash: '', codeId: 'ab12' });
    const engine = new WriteBackEngine(idx, 'DONE', 'CANCELLED', true, true);
    const changes = engine.buildChanges([project([{ id: 'ab12', status: 'open' }])], makeFolder());
    assert.strictEqual(changes.length, 0);
  });

  test('returns no changes when onDone is false', () => {
    const idx = makeIndex();
    idx.addOrUpdate({ id: 'syn1', tag: 'TODO', text: 'fix loop', file: 'a.ts', line: 5, textHash: '', codeId: 'ab12' });
    const engine = new WriteBackEngine(idx, 'DONE', 'CANCELLED', false, false);
    const changes = engine.buildChanges([project([{ id: 'ab12', status: 'done' }])], makeFolder());
    assert.strictEqual(changes.length, 0);
  });

  test('returns a change when a done task has an index entry', () => {
    const idx = makeIndex();
    idx.addOrUpdate({ id: 'syn1', tag: 'TODO', text: 'fix loop', file: 'a.ts', line: 5, textHash: '', codeId: 'ab12' });
    const engine = new WriteBackEngine(idx, 'DONE', 'CANCELLED', true, false);
    const changes = engine.buildChanges([project([{ id: 'ab12', status: 'done' }])], makeFolder());
    assert.strictEqual(changes.length, 1);
    assert.strictEqual(changes[0].originalTag, 'TODO');
    assert.strictEqual(changes[0].newTag, 'DONE');
    assert.strictEqual(changes[0].line, 5);
  });

  test('skips task without id', () => {
    const idx = makeIndex();
    idx.addOrUpdate({ id: 'syn1', tag: 'TODO', text: 'fix loop', file: 'a.ts', line: 5, textHash: '', codeId: 'ab12' });
    const engine = new WriteBackEngine(idx, 'DONE', 'CANCELLED', true, true);
    const changes = engine.buildChanges([project([{ id: null, status: 'done' }])], makeFolder());
    assert.strictEqual(changes.length, 0);
  });

  test('skips when tag already matches newTag', () => {
    const idx = makeIndex();
    idx.addOrUpdate({ id: 'syn1', tag: 'DONE', text: 'fix loop', file: 'a.ts', line: 5, textHash: '', codeId: 'ab12' });
    const engine = new WriteBackEngine(idx, 'DONE', 'CANCELLED', true, false);
    const changes = engine.buildChanges([project([{ id: 'ab12', status: 'done' }])], makeFolder());
    assert.strictEqual(changes.length, 0, 'already written back — should not re-apply');
  });

  test('cancelled task uses cancelKeyword', () => {
    const idx = makeIndex();
    idx.addOrUpdate({ id: 'syn1', tag: 'FIXME', text: 'fix x', file: 'b.ts', line: 3, textHash: '', codeId: 'cd34' });
    const engine = new WriteBackEngine(idx, 'DONE', 'CANCELLED', false, true);
    const changes = engine.buildChanges([project([{ id: 'cd34', status: 'cancelled' }])], makeFolder());
    assert.strictEqual(changes.length, 1);
    assert.strictEqual(changes[0].newTag, 'CANCELLED');
  });
});

suite('WriteBackEngine — applyChanges', () => {
  test('replaces tag keyword in the code file', async () => {
    const file = await writeTmp(`wb-apply-${Date.now()}.ts`, '// TODO: fix loop (#ab12)\n// other line\n');
    const idx = makeIndex();
    idx.addOrUpdate({ id: 'syn1', tag: 'TODO', text: 'fix loop', file: file.name, line: 0, textHash: '', codeId: 'ab12' });

    const engine = new WriteBackEngine(idx, 'DONE', 'CANCELLED', true, false);
    const changes = engine.buildChanges(
      [project([{ id: 'ab12', status: 'done' }])],
      makeFolder(),
    );
    assert.strictEqual(changes.length, 1);

    await engine.applyChanges(changes);

    const result = await readTmp(file.uri);
    assert.ok(result.startsWith('// DONE:'), `expected DONE, got: ${result}`);
    assert.ok(result.includes('// other line'));
  });

  test('updates index tag after apply', async () => {
    const file = await writeTmp(`wb-idx-${Date.now()}.ts`, '// TODO: refactor (#ef56)\n');
    const idx = makeIndex();
    idx.addOrUpdate({ id: 'syn2', tag: 'TODO', text: 'refactor', file: file.name, line: 0, textHash: '', codeId: 'ef56' });

    const engine = new WriteBackEngine(idx, 'DONE', 'CANCELLED', true, false);
    await engine.applyChanges([{
      fileUri: file.uri,
      file: file.name,
      line: 0,
      originalTag: 'TODO',
      newTag: 'DONE',
      text: 'refactor',
      taskId: 'ef56',
    }]);

    assert.strictEqual(idx.findByCodeId('ef56')?.tag, 'DONE');
  });
});
