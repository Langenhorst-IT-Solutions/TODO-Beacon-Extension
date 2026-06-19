import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { IdInjector } from '../../sync/IdInjector';

async function writeTmp(name: string, content: string): Promise<vscode.Uri> {
  const uri = vscode.Uri.file(path.join(os.tmpdir(), `todo-beacon-id-${name}`));
  await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(content));
  return uri;
}

async function readTmp(uri: vscode.Uri): Promise<string> {
  return new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
}

suite('IdInjector', () => {
  test('injects an ID at the end of the target line', async () => {
    const uri = await writeTmp('inject.ts', '// TODO: fix loop\n// other line\n');
    const injector = new IdInjector('(#{{id}})');
    const codeId = await injector.inject(uri, 0);

    assert.ok(codeId, 'should return a codeId');
    assert.match(codeId, /^[a-f0-9]{4}$/, 'codeId should be 4 hex chars');

    const result = await readTmp(uri);
    const lines = result.split('\n');
    assert.ok(lines[0].endsWith(`(#${codeId})`), 'first line should end with the ID');
    assert.strictEqual(lines[1], '// other line', 'second line should be unchanged');
  });

  test('respects a custom idTemplate', async () => {
    const uri = await writeTmp('template.ts', '// TODO: custom\n');
    const injector = new IdInjector('[id:{{id}}]');
    const codeId = await injector.inject(uri, 0);

    const result = await readTmp(uri);
    assert.ok(result.includes(`[id:${codeId}]`));
  });

  test('does not inject if line already has an ID', async () => {
    const uri = await writeTmp('already.ts', '// TODO: done (#ab12)\n');
    const injector = new IdInjector('(#{{id}})');
    const codeId = await injector.inject(uri, 0);

    assert.strictEqual(codeId, null, 'should return null for already-promoted line');
    const result = await readTmp(uri);
    assert.strictEqual(result, '// TODO: done (#ab12)\n', 'file should be unchanged');
  });

  test('returns null when line index is out of bounds', async () => {
    const uri = await writeTmp('short.ts', '// TODO: x\n');
    const injector = new IdInjector('(#{{id}})');
    const codeId = await injector.inject(uri, 99);
    assert.strictEqual(codeId, null);
  });

  test('returns null when file does not exist', async () => {
    const uri = vscode.Uri.file(path.join(os.tmpdir(), 'nonexistent-file-xyz.ts'));
    const injector = new IdInjector('(#{{id}})');
    const codeId = await injector.inject(uri, 0);
    assert.strictEqual(codeId, null);
  });

  test('preserves CRLF line endings', async () => {
    const uri = await writeTmp('crlf.ts', '// TODO: crlf\r\n// line2\r\n');
    const injector = new IdInjector('(#{{id}})');
    const codeId = await injector.inject(uri, 0);

    const result = await readTmp(uri);
    assert.ok(result.includes('\r\n'), 'should preserve CRLF');
    assert.ok(result.includes(`(#${codeId})`));
  });

  test('generateId returns 4 hex chars', () => {
    const id = IdInjector.generateId();
    assert.match(id, /^[a-f0-9]{4}$/);
  });
});
