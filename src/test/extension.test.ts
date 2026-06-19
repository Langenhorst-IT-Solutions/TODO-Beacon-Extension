import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';

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

  test('todo-beacon.promote command is registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('todo-beacon.promote'), 'Command todo-beacon.promote not found');
  });

  test('todo-beacon.applyWriteBacks command is registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('todo-beacon.applyWriteBacks'),
      'Command todo-beacon.applyWriteBacks not found',
    );
  });

  test('todo-beacon.promote without idInjection enabled shows warning and does not throw', async () => {
    // idInjection defaults to false — command should show a warning and return cleanly.
    await assert.doesNotReject(
      Promise.resolve(vscode.commands.executeCommand('todo-beacon.promote')),
    );
  });

  test('todo-beacon.applyWriteBacks with no task file does not throw', async () => {
    // No task file in the test workspace — command shows a warning and returns cleanly.
    await assert.doesNotReject(
      Promise.resolve(vscode.commands.executeCommand('todo-beacon.applyWriteBacks')),
    );
  });

  test('todo-beacon.promote with idInjection enabled, no TODO on active line', async () => {
    const cfg = vscode.workspace.getConfiguration('todo-beacon');
    await cfg.update('idInjection', true, vscode.ConfigurationTarget.Global);
    try {
      const doc = await vscode.workspace.openTextDocument({
        content: 'just a plain line — no TODO tag here\n',
        language: 'typescript',
      });
      await vscode.window.showTextDocument(doc);
      await assert.doesNotReject(
        Promise.resolve(vscode.commands.executeCommand('todo-beacon.promote')),
      );
    } finally {
      await cfg.update('idInjection', undefined, vscode.ConfigurationTarget.Global);
    }
  });

  test('todo-beacon.promote with idInjection enabled on already-promoted TODO', async () => {
    const cfg = vscode.workspace.getConfiguration('todo-beacon');
    await cfg.update('idInjection', true, vscode.ConfigurationTarget.Global);
    try {
      const doc = await vscode.workspace.openTextDocument({
        content: '// TODO: already done (#ab12)\n',
        language: 'typescript',
      });
      const editor = await vscode.window.showTextDocument(doc);
      editor.selection = new vscode.Selection(0, 0, 0, 0);
      await assert.doesNotReject(
        Promise.resolve(vscode.commands.executeCommand('todo-beacon.promote')),
      );
    } finally {
      await cfg.update('idInjection', undefined, vscode.ConfigurationTarget.Global);
    }
  });

  test('todo-beacon.promote success path injects ID into a real file', async () => {
    const tmpUri = vscode.Uri.file(path.join(os.tmpdir(), `promote-ext-test-${Date.now()}.ts`));
    await vscode.workspace.fs.writeFile(tmpUri, new TextEncoder().encode('// TODO: inject me\n'));
    const cfg = vscode.workspace.getConfiguration('todo-beacon');
    await cfg.update('idInjection', true, vscode.ConfigurationTarget.Global);
    try {
      const doc = await vscode.workspace.openTextDocument(tmpUri);
      const editor = await vscode.window.showTextDocument(doc);
      editor.selection = new vscode.Selection(0, 0, 0, 0);
      await assert.doesNotReject(
        Promise.resolve(vscode.commands.executeCommand('todo-beacon.promote')),
      );
      // File should now contain a (#xxxx) ID
      const updated = new TextDecoder().decode(await vscode.workspace.fs.readFile(tmpUri));
      assert.match(updated, /\(#[a-f0-9]{4}\)/, 'ID should have been injected');
    } finally {
      await cfg.update('idInjection', undefined, vscode.ConfigurationTarget.Global);
    }
  });

  test('todo-beacon.applyWriteBacks with task file but no pending write-backs', async () => {
    const tmpFile = path.join(os.tmpdir(), `ext-tasks-${Date.now()}.md`);
    const tmpUri = vscode.Uri.file(tmpFile);
    await vscode.workspace.fs.writeFile(tmpUri, new TextEncoder().encode('## Work\n- [ ] open task\n'));
    const cfg = vscode.workspace.getConfiguration('todo-beacon');
    await cfg.update('taskFile', tmpFile, vscode.ConfigurationTarget.Global);
    await cfg.update('writeBack.onDone', true, vscode.ConfigurationTarget.Global);
    try {
      await assert.doesNotReject(
        Promise.resolve(vscode.commands.executeCommand('todo-beacon.applyWriteBacks')),
      );
    } finally {
      await cfg.update('taskFile', undefined, vscode.ConfigurationTarget.Global);
      await cfg.update('writeBack.onDone', undefined, vscode.ConfigurationTarget.Global);
    }
  });
});
