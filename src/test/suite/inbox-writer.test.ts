import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { InboxWriter } from '../../sync/InboxWriter';
import { TodoComment } from '../../types';

function todo(overrides: Partial<TodoComment> = {}): TodoComment {
  return {
    id: null,
    tag: 'TODO',
    text: 'fix the thing',
    file: 'src/app.ts',
    line: 41,        // 0-indexed → displayed as line 42
    column: 4,
    rawLine: '// TODO: fix the thing',
    ...overrides,
  };
}

async function writeTmpFile(name: string, content: string): Promise<vscode.Uri> {
  const uri = vscode.Uri.file(path.join(os.tmpdir(), `todo-beacon-test-${name}`));
  await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(content));
  return uri;
}

async function readTmpFile(uri: vscode.Uri): Promise<string> {
  const bytes = await vscode.workspace.fs.readFile(uri);
  return new TextDecoder().decode(bytes);
}

suite('InboxWriter — Markdown', () => {
  test('creates Inbox section when file has no inbox', async () => {
    const uri = await writeTmpFile('md-no-inbox.md', '## Existing\n- [ ] old task\n');
    const writer = new InboxWriter(uri, 'tasks.md', 'Inbox');
    await writer.write([todo()]);

    const result = await readTmpFile(uri);
    assert.ok(result.includes('## Inbox'), 'should contain ## Inbox heading');
    assert.ok(result.includes('- [ ] TODO: fix the thing'), 'should contain task line');
    assert.ok(result.includes('src/app.ts:42'), 'should include source reference');
  });

  test('appends to existing Inbox section', async () => {
    const uri = await writeTmpFile('md-existing-inbox.md', '## Inbox\n- [ ] already there\n');
    const writer = new InboxWriter(uri, 'tasks.md', 'Inbox');
    await writer.write([todo({ text: 'another task' })]);

    const result = await readTmpFile(uri);
    const occurrences = (result.match(/## Inbox/g) ?? []).length;
    assert.strictEqual(occurrences, 1, 'should not duplicate ## Inbox heading');
    assert.ok(result.includes('another task'));
    assert.ok(result.includes('already there'));
  });

  test('does not duplicate an already-present item', async () => {
    const ref = 'src/app.ts:42';
    const uri = await writeTmpFile('md-dupe.md', `## Inbox\n- [ ] TODO: fix the thing <!-- ${ref} -->\n`);
    const writer = new InboxWriter(uri, 'tasks.md', 'Inbox');
    await writer.write([todo()]);

    const result = await readTmpFile(uri);
    const count = (result.match(/fix the thing/g) ?? []).length;
    assert.strictEqual(count, 1, 'item should not be duplicated');
  });

  test('creates file from scratch when it does not exist', async () => {
    const uri = vscode.Uri.file(path.join(os.tmpdir(), `todo-beacon-test-nonexistent-${Date.now()}.md`));
    const writer = new InboxWriter(uri, 'tasks.md', 'Inbox');
    await writer.write([todo()]);

    const result = await readTmpFile(uri);
    assert.ok(result.includes('## Inbox'));
    assert.ok(result.includes('fix the thing'));
  });
});

suite('InboxWriter — TaskPaper', () => {
  test('creates Inbox project in TaskPaper file', async () => {
    const uri = await writeTmpFile('tp-no-inbox.todo', 'Work:\n- existing task\n');
    const writer = new InboxWriter(uri, 'tasks.todo', 'Inbox');
    await writer.write([todo()]);

    const result = await readTmpFile(uri);
    assert.ok(result.includes('Inbox:'), 'should contain Inbox: project header');
    assert.ok(result.includes('- TODO: fix the thing'), 'should contain task line');
    assert.ok(result.includes('@source(src/app.ts:42)'), 'should include @source tag');
    assert.ok(result.includes('@fromCode'));
  });
});
