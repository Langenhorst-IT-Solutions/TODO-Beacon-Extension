import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Activation', () => {
  test('extension is registered', () => {
    const ext = vscode.extensions.getExtension('langenhorst-it-solutions.todo-beacon');
    assert.ok(ext, 'Extension not found — check publisher.name in package.json');
  });

  test('extension activates without error', async () => {
    const ext = vscode.extensions.getExtension('langenhorst-it-solutions.todo-beacon');
    if (ext && !ext.isActive) {
      await ext.activate();
    }
    assert.ok(ext?.isActive, 'Extension did not activate');
  });

  test('todo-beacon.refresh command is registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('todo-beacon.refresh'),
      'Command todo-beacon.refresh not found',
    );
  });

  test('todo-beacon.openFile command is registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('todo-beacon.openFile'),
      'Command todo-beacon.openFile not found',
    );
  });

  test('todo-beacon.refresh executes without error', async () => {
    await assert.doesNotReject(Promise.resolve(vscode.commands.executeCommand('todo-beacon.refresh')));
  });

  test('todo-beacon.openFile with undefined target returns without error', async () => {
    await assert.doesNotReject(
      Promise.resolve(vscode.commands.executeCommand('todo-beacon.openFile', undefined)),
    );
  });

  test('todo-beacon.openFile with a valid target does not throw', async () => {
    const target = { file: 'TASKS.md', line: 0, column: 0 };
    await assert.doesNotReject(
      Promise.resolve(vscode.commands.executeCommand('todo-beacon.openFile', target)),
    );
  });
});
