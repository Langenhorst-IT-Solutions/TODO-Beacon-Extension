import * as vscode from 'vscode';
import { CodeScanner } from './scanner/CodeScanner';
import { TaskPaperParser } from './parser/TaskPaperParser';
import { CodeTodoTreeProvider, TaskListTreeProvider } from './tree/TodoTreeProvider';
import { TodoComment } from './types';

export function activate(context: vscode.ExtensionContext): void {
  const config = vscode.workspace.getConfiguration('todo-beacon');

  const scanner = new CodeScanner(
    config.get<string[]>('tags') ?? ['TODO', 'FIXME', 'BUG', 'HACK', 'NOTE'],
    (config.get<number>('maxFileSizeKb') ?? 1024) * 1024,
  );
  const parser = new TaskPaperParser();
  const codeProvider = new CodeTodoTreeProvider();
  const listProvider = new TaskListTreeProvider();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('todo-beacon.codeView', codeProvider),
    vscode.window.registerTreeDataProvider('todo-beacon.listView', listProvider),
  );

  const excludePatterns = config.get<string[]>('exclude') ?? [];
  const taskFile = config.get<string>('taskFile') ?? 'tasks.todo';

  async function refresh(): Promise<void> {
    const [todos] = await Promise.all([
      scanner.scan(excludePatterns),
      refreshTaskList(),
    ]);
    codeProvider.update(todos);
  }

  async function refreshTaskList(): Promise<void> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      listProvider.update([]);
      return;
    }
    const uri = vscode.Uri.joinPath(folder.uri, taskFile);
    try {
      const bytes = await vscode.workspace.fs.readFile(uri);
      const content = new TextDecoder('utf-8').decode(bytes);
      listProvider.update(parser.parse(content));
    } catch {
      listProvider.update([]);
    }
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('todo-beacon.refresh', async () => {
      try {
        await refresh();
      } catch (err) {
        void vscode.window.showErrorMessage(`TODO Beacon: Refresh failed — ${String(err)}`);
      }
    }),

    // Internal command — invoked only via tree item clicks, not the command palette.
    // openFile is intentionally absent from contributes.commands to hide it from the palette.
    vscode.commands.registerCommand('todo-beacon.openFile', (todo: TodoComment | undefined) => {
      if (!todo) return;
      const folder = vscode.workspace.workspaceFolders?.[0];
      if (!folder) return;
      const uri = vscode.Uri.joinPath(folder.uri, todo.file);
      void vscode.window.showTextDocument(uri, {
        selection: new vscode.Range(todo.line, todo.column, todo.line, todo.column),
        preserveFocus: false,
      });
    }),
  );

  // Incremental: re-scan only on file save (not on every keystroke)
  const watcher = vscode.workspace.createFileSystemWatcher('**/*');
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;

  function scheduleRefresh(): void {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => { void refresh(); }, 300);
  }

  context.subscriptions.push(
    watcher,
    watcher.onDidChange(scheduleRefresh),
    watcher.onDidCreate(scheduleRefresh),
    watcher.onDidDelete(scheduleRefresh),
  );

  void refresh();
}

export function deactivate(): void {
  // nothing to clean up — subscriptions handle disposal
}
