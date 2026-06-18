import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { CodeScanner } from '../../scanner/CodeScanner';

suite('CodeScanner — VS Code API integration', () => {
  const scanner = new CodeScanner(['TODO', 'FIXME', 'BUG']);

  // ─── scanDocument ────────────────────────────────────────────────────────

  test('scanDocument returns TODOs from an in-memory document', async () => {
    const doc = await vscode.workspace.openTextDocument({
      content: '// TODO: from document',
      language: 'typescript',
    });
    const result = scanner.scanDocument(doc);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].tag, 'TODO');
    assert.strictEqual(result[0].text, 'from document');
  });

  test('scanDocument returns empty array when document has no tags', async () => {
    const doc = await vscode.workspace.openTextDocument({
      content: 'const x = 1;\nconst y = 2;',
      language: 'typescript',
    });
    const result = scanner.scanDocument(doc);
    assert.deepStrictEqual(result, []);
  });

  test('scanDocument handles multiple tags in one document', async () => {
    const doc = await vscode.workspace.openTextDocument({
      content: '// TODO: first\n// FIXME: second\n// BUG: third',
      language: 'typescript',
    });
    const result = scanner.scanDocument(doc);
    assert.strictEqual(result.length, 3);
    assert.strictEqual(result[0].tag, 'TODO');
    assert.strictEqual(result[1].tag, 'FIXME');
    assert.strictEqual(result[2].tag, 'BUG');
  });

  // ─── scanFile ────────────────────────────────────────────────────────────

  test('scanFile returns empty array for a non-existent file', async () => {
    const uri = vscode.Uri.file('/this/path/does/not/exist/ever.ts');
    const result = await scanner.scanFile(uri);
    assert.deepStrictEqual(result, []);
  });

  test('scanFile returns array for a real file on disk', async () => {
    // __dirname is out/test/suite — scanner.test.js definitely exists there
    const uri = vscode.Uri.file(path.join(__dirname, 'scanner.test.js'));
    const result = await scanner.scanFile(uri);
    assert.ok(Array.isArray(result));
  });

  test('scanFile returns empty array when file exceeds the size limit', async () => {
    const uri = vscode.Uri.file(path.join(__dirname, 'scanner.test.js'));
    const tinyScanner = new CodeScanner(['TODO'], 1); // 1-byte max → any real file is over limit
    const result = await tinyScanner.scanFile(uri);
    assert.deepStrictEqual(result, []);
  });
});
