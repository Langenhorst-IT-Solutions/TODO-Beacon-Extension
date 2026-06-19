import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { ReconcileEngine } from '../../sync/ReconcileEngine';
import { SidecarIndex } from '../../index/SidecarIndex';
import { TodoComment } from '../../types';

function makeIndex(): SidecarIndex {
  return new SidecarIndex(null);
}

function todo(overrides: Partial<TodoComment> = {}): TodoComment {
  return {
    id: null,
    tag: 'TODO',
    text: 'fix the loop',
    file: 'src/a.ts',
    line: 5,
    column: 2,
    rawLine: '// TODO: fix the loop',
    ...overrides,
  };
}

const NO_INBOX = {
  autoAddToInbox: false,
  inboxHeading: 'Inbox',
  taskFileUri: null,
  taskFileRelPath: null,
};

suite('ReconcileEngine — index updates', () => {
  test('new TODO is added to the index', async () => {
    const idx = makeIndex();
    const engine = new ReconcileEngine(idx);
    // Prevent actual fs.save by stubbing — the engine calls idx.save()
    // but SidecarIndex.save() will throw because folder is null.
    // Override save to a no-op for unit tests.
    idx.save = async () => {};
    await engine.reconcile([todo()], NO_INBOX);
    assert.strictEqual(idx.size(), 1);
    assert.ok(idx.findByTextAndFile('fix the loop', 'src/a.ts'));
  });

  test('existing TODO updates position in the index', async () => {
    const idx = makeIndex();
    idx.addOrUpdate({ id: 'ex1', tag: 'TODO', text: 'fix the loop', file: 'src/a.ts', line: 5, textHash: '', codeId: null });
    const engine = new ReconcileEngine(idx);
    idx.save = async () => {};
    await engine.reconcile([todo({ line: 20 })], NO_INBOX);
    assert.strictEqual(idx.size(), 1, 'should not add a second entry');
    assert.strictEqual(idx.findById('ex1')?.line, 20, 'line should be updated');
  });

  test('ambiguous match leaves index unchanged', async () => {
    const idx = makeIndex();
    idx.addOrUpdate({ id: 'am1', tag: 'TODO', text: 'fix the lop', file: 'src/a.ts', line: 5, textHash: '', codeId: null });
    idx.addOrUpdate({ id: 'am2', tag: 'TODO', text: 'fix the loops', file: 'src/a.ts', line: 10, textHash: '', codeId: null });
    const engine = new ReconcileEngine(idx);
    idx.save = async () => {};
    await engine.reconcile([todo()], NO_INBOX);
    // Ambiguous → not added, existing entries untouched
    assert.strictEqual(idx.size(), 2);
  });
});

suite('ReconcileEngine — inbox writing', () => {
  test('autoAddToInbox:true writes new TODOs to the task file', async () => {
    const taskUri = vscode.Uri.file(path.join(os.tmpdir(), `rengine-test-${Date.now()}.md`));
    const idx = makeIndex();
    const engine = new ReconcileEngine(idx);
    idx.save = async () => {};

    await engine.reconcile([todo()], {
      autoAddToInbox: true,
      inboxHeading: 'Inbox',
      taskFileUri: taskUri,
      taskFileRelPath: 'tasks.md',
    });

    const bytes = await vscode.workspace.fs.readFile(taskUri);
    const content = new TextDecoder().decode(bytes);
    assert.ok(content.includes('fix the loop'), 'task text should appear in file');
  });

  test('autoAddToInbox:false does not touch the task file', async () => {
    const taskUri = vscode.Uri.file(path.join(os.tmpdir(), `rengine-no-inbox-${Date.now()}.md`));
    const idx = makeIndex();
    const engine = new ReconcileEngine(idx);
    idx.save = async () => {};

    await engine.reconcile([todo()], NO_INBOX);

    let exists = false;
    try {
      await vscode.workspace.fs.stat(taskUri);
      exists = true;
    } catch { /* file not created → correct */ }
    assert.strictEqual(exists, false, 'task file should not have been created');
  });
});
