import * as vscode from 'vscode';
import { CodeScanner } from './scanner/CodeScanner';
import { TaskPaperParser } from './parser/TaskPaperParser';
import { MarkdownTaskParser } from './parser/MarkdownTaskParser';
import { CodeTodoTreeProvider, TaskListTreeProvider } from './tree/TodoTreeProvider';
import { TagHighlighter } from './decorations/TagHighlighter';
import { LocalConfigLoader, LocalConfigEntry } from './config/LocalConfigLoader';
import { SidecarIndex } from './index/SidecarIndex';
import { ReconcileEngine } from './sync/ReconcileEngine';
import { IdInjector } from './sync/IdInjector';
import { WriteBackEngine } from './sync/WriteBackEngine';
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

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const sidecarIndex = workspaceFolder ? new SidecarIndex(workspaceFolder) : null;
  const reconcileEngine = sidecarIndex ? new ReconcileEngine(sidecarIndex) : null;
  void sidecarIndex?.load();

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

    const getDirective = localConfigEntries.length > 0
      ? (relPath: string) => LocalConfigLoader.getDirective(relPath, localConfigEntries)
      : undefined;

    const [todos] = await Promise.all([
      scanner.scan(scanExcludes, getDirective),
      refreshTaskList(taskFile),
    ]);
    // Promoted TODOs (those with an injected (#xxxx)) live in the task
    // list — hide them from the Code TODOs view so they don't appear twice.
    codeProvider.update(todos.filter(t => t.id === null));
    updateVisibleHighlights();

    if (reconcileEngine) {
      const syncConfig = vscode.workspace.getConfiguration('todo-beacon');
      void reconcileEngine.reconcile(todos, {
        autoAddToInbox: syncConfig.get<boolean>('autoAddToInbox') ?? false,
        inboxHeading: syncConfig.get<string>('sync.inboxHeading') ?? 'Inbox',
        archiveOrphans: syncConfig.get<boolean>('sync.archiveOrphans') ?? false,
        orphanHeading: syncConfig.get<string>('sync.orphanHeading') ?? 'Orphaned',
        taskFileUri: taskFile?.uri ?? null,
        taskFileRelPath: taskFile?.relativePath ?? null,
      });
    }
  }

  function buildCodeTargets(): Map<string, OpenTarget> {
    const map = new Map<string, OpenTarget>();
    if (!sidecarIndex) return map;
    for (const entry of sidecarIndex.all()) {
      if (entry.codeId) {
        map.set(entry.codeId, { file: entry.file, line: entry.line, column: 0 });
      }
    }
    return map;
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
      listProvider.update(parseTaskFile(content, taskFile.relativePath), buildCodeTargets());
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

    vscode.commands.registerCommand('todo-beacon.promote', async () => {
      const promoteConfig = vscode.workspace.getConfiguration('todo-beacon');
      if (!promoteConfig.get<boolean>('idInjection')) {
        void vscode.window.showWarningMessage(
          'TODO Beacon: Enable "todo-beacon.idInjection" in settings to use Promote.',
        );
        return;
      }

      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const line = editor.selection.active.line;
      const relPath = vscode.workspace.asRelativePath(editor.document.uri);
      const todos = scanner.parseLines(editor.document.getText(), relPath);
      const todo = todos.find(t => t.line === line);

      if (!todo) {
        void vscode.window.showInformationMessage(
          'TODO Beacon: No TODO tag found on the current line.',
        );
        return;
      }

      if (todo.id) {
        void vscode.window.showInformationMessage(
          `TODO Beacon: Already promoted — ID #${todo.id}.`,
        );
        return;
      }

      const template = promoteConfig.get<string>('idTemplate') ?? '(#{{id}})';
      const injector = new IdInjector(template);
      const codeId = await injector.inject(editor.document.uri, line);

      if (codeId && sidecarIndex) {
        const existing = sidecarIndex.findByTextAndFile(todo.text, relPath);
        const base = existing ?? {
          id: SidecarIndex.syntheticId(todo.text, relPath),
          tag: todo.tag,
          text: todo.text,
          file: relPath,
          line: todo.line,
          textHash: SidecarIndex.textHash(todo.text),
          codeId: null,
        };
        sidecarIndex.addOrUpdate({ ...base, codeId });
        await sidecarIndex.save();

        const taskFile = await resolveTaskFile();
        if (taskFile) {
          await injectIdIntoTaskEntry(taskFile.uri, codeId, todo.text);
        }

        void vscode.window.showInformationMessage(
          `TODO Beacon: Promoted — #${codeId} injected.`,
        );
      }
    }),

    vscode.commands.registerCommand('todo-beacon.applyWriteBacks', async () => {
      if (!sidecarIndex || !workspaceFolder) {
        void vscode.window.showWarningMessage('TODO Beacon: No workspace folder open.');
        return;
      }

      const taskFile = await resolveTaskFile();
      if (!taskFile) {
        void vscode.window.showWarningMessage('TODO Beacon: No task file found.');
        return;
      }

      const wbConfig = vscode.workspace.getConfiguration('todo-beacon');
      const engine = new WriteBackEngine(
        sidecarIndex,
        wbConfig.get<string>('writeBack.doneKeyword') ?? 'DONE',
        wbConfig.get<string>('writeBack.cancelKeyword') ?? 'CANCELLED',
        wbConfig.get<boolean>('writeBack.onDone') ?? false,
        wbConfig.get<boolean>('writeBack.onCancel') ?? false,
      );

      let content: string;
      try {
        const bytes = await vscode.workspace.fs.readFile(taskFile.uri);
        content = new TextDecoder().decode(bytes);
      } catch {
        void vscode.window.showWarningMessage('TODO Beacon: Could not read task file.');
        return;
      }

      const projects = parseTaskFile(content, taskFile.relativePath);
      const changes = engine.buildChanges(projects, workspaceFolder);

      if (changes.length === 0) {
        void vscode.window.showInformationMessage('TODO Beacon: No write-backs pending.');
        return;
      }

      const items = changes.map(c => ({
        label: `$(arrow-right) ${c.file}:${c.line + 1}`,
        description: `${c.originalTag} → ${c.newTag}: ${c.text}`,
        picked: true,
        change: c,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        canPickMany: true,
        placeHolder: `Apply ${changes.length} write-back${changes.length === 1 ? '' : 's'} to code?`,
      });

      if (!selected || selected.length === 0) return;

      await engine.applyChanges(selected.map(s => s.change));
      await sidecarIndex.save();
      void vscode.window.showInformationMessage(
        `TODO Beacon: Applied ${selected.length} write-back${selected.length === 1 ? '' : 's'}.`,
      );
      void refresh();
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

/**
 * Injects `(#codeId)` into the first task-list line whose text contains
 * `todoText` and doesn't already carry an ID. No-op if no match is found,
 * so it tolerates an absent inbox entry.
 */
export async function injectIdIntoTaskEntry(
  uri: vscode.Uri,
  codeId: string,
  todoText: string,
): Promise<boolean> {
  let bytes: Uint8Array;
  try {
    bytes = await vscode.workspace.fs.readFile(uri);
  } catch {
    return false;
  }
  const content = new TextDecoder().decode(bytes);
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/^\s*-\s+/.test(line)) continue;
    if (/\(#[a-f0-9]{4,8}\)/.test(line)) continue;
    if (!line.includes(todoText)) continue;

    const idStr = `(#${codeId})`;
    const mdComment = line.indexOf(' <!--');
    const tpSource = line.indexOf(' @');
    const insertAt =
      mdComment >= 0 ? mdComment :
      tpSource >= 0 ? tpSource : line.length;
    lines[i] = line.slice(0, insertAt).trimEnd() + ' ' + idStr + line.slice(insertAt);

    await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(lines.join(eol)));
    return true;
  }
  return false;
}
