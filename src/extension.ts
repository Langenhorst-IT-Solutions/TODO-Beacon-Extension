import * as vscode from 'vscode';
import { CodeScanner } from './scanner/CodeScanner';
import { TaskPaperParser } from './parser/TaskPaperParser';
import { MarkdownTaskParser } from './parser/MarkdownTaskParser';
import { CodeTodoTreeProvider, TaskListTreeProvider } from './tree/TodoTreeProvider';
import { TagHighlighter } from './decorations/TagHighlighter';
import { LocalConfigLoader, LocalConfigEntry } from './config/LocalConfigLoader';
import { OpenTarget, Project } from './types';

const TASK_FILE_CANDIDATES = ['tasks.todo', 'TODO.md', 'todo.md', 'TASKS.md', 'tasks.md'];

export function activate(context: vscode.ExtensionContext): void {
  const config = vscode.workspace.getConfiguration('todo-beacon');

  const scanner = new CodeScanner(
    config.get<string[]>('tags') ?? ['TODO', 'FIXME', 'BUG', 'HACK', 'NOTE'],
    (config.get<number>('maxFileSizeKb') ?? 1024) * 1024,
  );
  const taskPaperParser = new TaskPaperParser();
  const markdownParser = new MarkdownTaskParser();
  const codeProvider = new CodeTodoTreeProvider();
  const listProvider = new TaskListTreeProvider();
  const highlighter = new TagHighlighter(scanner);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('todo-beacon.codeView', codeProvider),
    vscode.window.registerTreeDataProvider('todo-beacon.listView', listProvider),
    highlighter,
  );

  function updateVisibleHighlights(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      highlighter.updateEditor(editor);
    }
  }

  context.subscriptions.push(
    vscode.window.onDidChangeVisibleTextEditors(updateVisibleHighlights),
    vscode.workspace.onDidChangeTextDocument(event => {
      const editor = vscode.window.visibleTextEditors.find(e => e.document === event.document);
      if (editor) highlighter.updateEditor(editor);
    }),
  );

  const excludePatterns = config.get<string[]>('exclude') ?? [];
  // Empty string → auto-detect; any other value → use exactly that path.
  const configuredTaskFile = config.get<string>('taskFile') || undefined;

  let localConfigEntries: LocalConfigEntry[] = [];

  async function resolveTaskFile(): Promise<{ uri: vscode.Uri; relativePath: string } | null> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) return null;

    const candidates = configuredTaskFile ? [configuredTaskFile] : TASK_FILE_CANDIDATES;

    for (const name of candidates) {
      const uri = vscode.Uri.joinPath(folder.uri, name);
      try {
        await vscode.workspace.fs.stat(uri);
        return { uri, relativePath: name };
      } catch {
        // file not found — try next candidate
      }
    }
    return null;
  }

  function parseTaskFile(content: string, relativePath: string): Project[] {
    const projects = /\.md$/i.test(relativePath) || /\.markdown$/i.test(relativePath)
      ? markdownParser.parse(content)
      : taskPaperParser.parse(content);
    attachFile(projects, relativePath);
    return projects;
  }

  function attachFile(projects: Project[], relativePath: string): void {
    for (const project of projects) {
      for (const task of project.tasks) {
        task.file = relativePath;
      }
      attachFile(project.children, relativePath);
    }
  }

  async function refresh(): Promise<void> {
    const [taskFile] = await Promise.all([
      resolveTaskFile(),
      LocalConfigLoader.loadAll().then(entries => { localConfigEntries = entries; }),
    ]);

    // Exclude the task file from the code scanner so its content doesn't
    // appear under "Code TODOs" — it belongs in the "Task List" view only.
    const scanExcludes = taskFile
      ? [...excludePatterns, taskFile.relativePath]
      : excludePatterns;

    const fileFilter = localConfigEntries.length > 0
      ? (relPath: string) => !LocalConfigLoader.isExcluded(relPath, localConfigEntries)
      : undefined;

    const [todos] = await Promise.all([
      scanner.scan(scanExcludes, fileFilter),
      refreshTaskList(taskFile),
    ]);
    codeProvider.update(todos);
    updateVisibleHighlights();
  }

  async function refreshTaskList(
    taskFile: { uri: vscode.Uri; relativePath: string } | null,
  ): Promise<void> {
    if (!taskFile) {
      listProvider.update([]);
      return;
    }
    try {
      const bytes = await vscode.workspace.fs.readFile(taskFile.uri);
      const content = new TextDecoder('utf-8').decode(bytes);
      listProvider.update(parseTaskFile(content, taskFile.relativePath));
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

    vscode.commands.registerCommand('todo-beacon.openFile', (target: OpenTarget | undefined) => {
      if (!target) return;
      const folder = vscode.workspace.workspaceFolders?.[0];
      if (!folder) return;
      const uri = vscode.Uri.joinPath(folder.uri, target.file);
      void vscode.window.showTextDocument(uri, {
        selection: new vscode.Range(target.line, target.column, target.line, target.column),
        preserveFocus: false,
      });
    }),
  );

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

export function deactivate(): void {}
