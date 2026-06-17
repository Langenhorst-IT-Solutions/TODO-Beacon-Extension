import * as vscode from 'vscode';
import { TodoComment, Project, Task, OpenTarget } from '../types';

// ─── Code TODO Tree ──────────────────────────────────────────────────────────

export class CodeTodoGroupItem extends vscode.TreeItem {
  constructor(
    public readonly tag: string,
    public readonly todos: TodoComment[],
  ) {
    super(`${tag} (${todos.length})`, vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = 'codeTodoGroup';
    this.iconPath = tagIcon(tag);
  }
}

export class CodeTodoItem extends vscode.TreeItem {
  constructor(public readonly todo: TodoComment) {
    super(todo.text || '(no description)', vscode.TreeItemCollapsibleState.None);
    this.description = `${todo.file}:${todo.line + 1}`;
    this.tooltip = todo.rawLine.trim();
    this.command = {
      command: 'todo-beacon.openFile',
      title: 'Open in Editor',
      arguments: [todo],
    };
    this.contextValue = 'codeTodoItem';
    this.iconPath = tagIcon(todo.tag);
  }
}

export class CodeTodoTreeProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private todos: TodoComment[] = [];

  update(todos: TodoComment[]): void {
    this.todos = todos;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
    if (!element) {
      const groups = groupByTag(this.todos);

      if (groups.size === 0) {
        const empty = new vscode.TreeItem('No TODOs found');
        empty.iconPath = new vscode.ThemeIcon('check');
        return [empty];
      }

      return sortGroupsByTagPriority(groups).map(
        ([tag, items]) => new CodeTodoGroupItem(tag, items),
      );
    }

    if (element instanceof CodeTodoGroupItem) {
      return element.todos.map(t => new CodeTodoItem(t));
    }

    return [];
  }
}

// ─── Task List Tree ───────────────────────────────────────────────────────────

export class TaskProjectItem extends vscode.TreeItem {
  constructor(public readonly project: Project) {
    const hasChildren = project.tasks.length > 0 || project.children.length > 0;
    super(
      project.name || 'Inbox',
      hasChildren ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None,
    );
    this.contextValue = 'taskProject';
    this.iconPath = new vscode.ThemeIcon('folder');
  }
}

export class TaskListItem extends vscode.TreeItem {
  constructor(public readonly task: Task) {
    super(task.text || '(empty)', vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'taskListItem';
    this.iconPath = statusIcon(task.status);
    this.description = tagSummary(task.tags);
    const target: OpenTarget = { file: task.file, line: task.lineNumber, column: 0 };
    this.command = {
      command: 'todo-beacon.openFile',
      title: 'Open in Editor',
      arguments: [target],
    };
  }
}

export class TaskListTreeProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private projects: Project[] = [];

  update(projects: Project[]): void {
    this.projects = projects;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
    if (!element) {
      if (this.projects.length === 0) {
        const empty = new vscode.TreeItem('No task file found');
        empty.iconPath = new vscode.ThemeIcon('info');
        return [empty];
      }
      return this.projects.map(p => new TaskProjectItem(p));
    }

    if (element instanceof TaskProjectItem) {
      const { project } = element;
      return [
        ...project.children.map(p => ({ lineNumber: p.lineNumber, item: new TaskProjectItem(p) })),
        ...project.tasks.map(t => ({ lineNumber: t.lineNumber, item: new TaskListItem(t) })),
      ]
        .sort((a, b) => a.lineNumber - b.lineNumber)
        .map(({ item }) => item);
    }

    return [];
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Display order for Code TODO groups. Tags not listed here are appended
// afterwards, alphabetically.
const TAG_DISPLAY_ORDER = ['DEPRECATED', 'FIXME', 'BUG', 'XXX', 'WARNING', 'TODO', 'NOTE'];

function sortGroupsByTagPriority(
  groups: Map<string, TodoComment[]>,
): [string, TodoComment[]][] {
  return [...groups.entries()].sort(([a], [b]) => {
    const indexA = TAG_DISPLAY_ORDER.indexOf(a);
    const indexB = TAG_DISPLAY_ORDER.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });
}

// Tags that are folded into another group's bucket instead of getting
// their own (e.g. WARN items are listed alongside WARNING).
const TAG_ALIASES: Record<string, string> = {
  WARN: 'WARNING',
};

function groupByTag(todos: TodoComment[]): Map<string, TodoComment[]> {
  const map = new Map<string, TodoComment[]>();
  for (const todo of todos) {
    const key = TAG_ALIASES[todo.tag] ?? todo.tag;
    const group = map.get(key) ?? [];
    group.push(todo);
    map.set(key, group);
  }
  return map;
}

function tagIcon(tag: string): vscode.ThemeIcon {
  const icons: Record<string, string> = {
    TODO: 'circle-outline',
    FIXME: 'tools',
    BUG: 'bug',
    HACK: 'flame',
    NOTE: 'note',
    TEST: 'beaker',
    DEBUG: 'terminal',
    OPTIMIZE: 'dashboard',
    PERF: 'dashboard',
    REVIEW: 'eye',
    IDEA: 'lightbulb',
    WARNING: 'warning',
    WARN: 'warning',
    DEPRECATED: 'archive',
    XXX: 'error',
  };
  return new vscode.ThemeIcon(icons[tag] ?? 'circle-outline');
}

function statusIcon(status: string): vscode.ThemeIcon {
  if (status === 'done') return new vscode.ThemeIcon('check');
  if (status === 'cancelled') return new vscode.ThemeIcon('close');
  return new vscode.ThemeIcon('circle-outline');
}

function tagSummary(tags: Record<string, string | boolean>): string {
  return Object.entries(tags)
    .map(([k, v]) => (v === true ? `@${k}` : `@${k}(${v})`))
    .join(' ');
}
