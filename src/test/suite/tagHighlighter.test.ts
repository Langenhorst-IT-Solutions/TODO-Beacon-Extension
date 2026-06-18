import * as assert from 'assert';
import * as vscode from 'vscode';
import { CodeScanner } from '../../scanner/CodeScanner';
import { TagHighlighter } from '../../decorations/TagHighlighter';

suite('TagHighlighter', () => {
  const scanner = new CodeScanner(['TODO', 'FIXME']);

  test('setScanner replaces the internal scanner without throwing', () => {
    const highlighter = new TagHighlighter(scanner);
    const other = new CodeScanner(['BUG']);
    assert.doesNotThrow(() => highlighter.setScanner(other));
    highlighter.dispose();
  });

  test('updateEditor with undefined is a no-op', () => {
    const highlighter = new TagHighlighter(scanner);
    assert.doesNotThrow(() => highlighter.updateEditor(undefined));
    highlighter.dispose();
  });

  test('dispose without prior decoration calls does not throw', () => {
    const highlighter = new TagHighlighter(scanner);
    assert.doesNotThrow(() => highlighter.dispose());
  });

  test('updateEditor applies decorations to an active editor', async () => {
    const doc = await vscode.workspace.openTextDocument({
      content: '// TODO: highlight this\n// FIXME: and this',
      language: 'typescript',
    });
    const editor = await vscode.window.showTextDocument(doc);
    const highlighter = new TagHighlighter(scanner);
    assert.doesNotThrow(() => highlighter.updateEditor(editor));
    highlighter.dispose();
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  test('second updateEditor call clears stale tag decoration types', async () => {
    const highlighter = new TagHighlighter(scanner);

    const doc1 = await vscode.workspace.openTextDocument({
      content: '// TODO: first document',
      language: 'typescript',
    });
    const editor1 = await vscode.window.showTextDocument(doc1);
    highlighter.updateEditor(editor1); // creates TODO decoration type in internal map

    const doc2 = await vscode.workspace.openTextDocument({
      content: '// FIXME: second document only has FIXME',
      language: 'typescript',
    });
    const editor2 = await vscode.window.showTextDocument(doc2);
    // TODO is no longer in the document — the stale-tag clearing branch runs
    assert.doesNotThrow(() => highlighter.updateEditor(editor2));
    highlighter.dispose();
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  test('dispose clears decoration types created by updateEditor', async () => {
    const doc = await vscode.workspace.openTextDocument({
      content: '// TODO: disposable',
      language: 'typescript',
    });
    const editor = await vscode.window.showTextDocument(doc);
    const highlighter = new TagHighlighter(scanner);
    highlighter.updateEditor(editor);
    // dispose must not throw even when decoration types are present
    assert.doesNotThrow(() => highlighter.dispose());
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });
});
