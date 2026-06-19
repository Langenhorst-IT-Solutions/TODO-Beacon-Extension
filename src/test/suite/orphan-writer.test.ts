import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { OrphanWriter } from '../../sync/OrphanWriter';
import { IndexEntry } from '../../index/SidecarIndex';

function entry(overrides: Partial<IndexEntry> = {}): IndexEntry {
  return {
    id: 'syn1',
    tag: 'TODO',
    text: 'fix the loop',
    file: 'src/app.ts',
    line: 41,
    textHash: '',
    codeId: '7f3a',
    ...overrides,
  };
}

async function writeTmp(name: string, content: string): Promise<vscode.Uri> {
  const uri = vscode.Uri.file(path.join(os.tmpdir(), `todo-beacon-orphan-${name}`));
  await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(content));
  return uri;
}

async function readTmp(uri: vscode.Uri): Promise<string> {
  return new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
}

suite('OrphanWriter — Markdown', () => {
  test('creates Orphaned section in Markdown file', async () => {
    const uri = await writeTmp('md-orphan.md', '## Inbox\n- [ ] some task\n');
    const writer = new OrphanWriter(uri, 'tasks.md', 'Orphaned');
    await writer.write([entry()]);

    const result = await readTmp(uri);
    assert.ok(result.includes('## Orphaned'));
    assert.ok(result.includes('fix the loop'));
    assert.ok(result.includes('(#7f3a)'));
    assert.ok(result.includes('orphaned · was: src/app.ts:42'));
  });

  test('does not duplicate already-present orphan', async () => {
    const ref = 'was: src/app.ts:42';
    const uri = await writeTmp('md-orphan-dupe.md', `## Orphaned\n- [ ] TODO: fix the loop <!-- orphaned · ${ref} -->\n`);
    const writer = new OrphanWriter(uri, 'tasks.md', 'Orphaned');
    await writer.write([entry()]);

    const result = await readTmp(uri);
    const count = (result.match(/fix the loop/g) ?? []).length;
    assert.strictEqual(count, 1);
  });

  test('includes entry without codeId without (#...)', async () => {
    const uri = await writeTmp('md-orphan-noid.md', '');
    const writer = new OrphanWriter(uri, 'tasks.md', 'Orphaned');
    await writer.write([entry({ codeId: null })]);

    const result = await readTmp(uri);
    assert.ok(!result.includes('(#'), 'should not include id marker when codeId is null');
    assert.ok(result.includes('fix the loop'));
  });
});

suite('OrphanWriter — TaskPaper', () => {
  test('creates Orphaned project in TaskPaper file', async () => {
    const uri = await writeTmp('tp-orphan.todo', 'Work:\n- existing task\n');
    const writer = new OrphanWriter(uri, 'tasks.todo', 'Orphaned');
    await writer.write([entry()]);

    const result = await readTmp(uri);
    assert.ok(result.includes('Orphaned:'));
    assert.ok(result.includes('@orphaned'));
    assert.ok(result.includes('@wasAt(src/app.ts:42)'));
    assert.ok(result.includes('(#7f3a)'));
  });
});
