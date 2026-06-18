import * as assert from 'assert';
import * as vscode from 'vscode';
import {
  TaskListTreeProvider,
  TaskProjectItem,
  TaskListItem,
  CodeTodoTreeProvider,
  CodeTodoGroupItem,
  CodeTodoItem,
} from '../../tree/TodoTreeProvider';
import { Project, Task, TodoComment } from '../../types';

function todo(tag: string): TodoComment {
  return { id: null, tag, text: 'x', file: 'f.ts', line: 0, column: 0, rawLine: '' };
}

function task(text: string, lineNumber: number, file = 'TASKS.md'): Task {
  return { id: null, text, status: 'open', tags: {}, lineNumber, file };
}

suite('CodeTodoTreeProvider', () => {
  test('orders groups as DEPRECATED, FIXME, BUG, XXX, WARNING, TODO, NOTE', () => {
    const provider = new CodeTodoTreeProvider();
    provider.update([
      todo('NOTE'),
      todo('TODO'),
      todo('WARNING'),
      todo('XXX'),
      todo('BUG'),
      todo('FIXME'),
      todo('DEPRECATED'),
    ]);

    const tags = provider
      .getChildren()
      .map(item => (item as CodeTodoGroupItem).tag);

    assert.deepStrictEqual(tags, [
      'DEPRECATED', 'FIXME', 'BUG', 'XXX', 'WARNING', 'TODO', 'NOTE',
    ]);
  });

  test('uses the same icon for a group as for its items', () => {
    const provider = new CodeTodoTreeProvider();
    provider.update([todo('BUG')]);

    const [group] = provider.getChildren() as CodeTodoGroupItem[];
    const [item] = provider.getChildren(group);
    assert.deepStrictEqual(group.iconPath, item.iconPath);
  });

  test('merges WARN items into the WARNING group', () => {
    const provider = new CodeTodoTreeProvider();
    provider.update([todo('WARN'), todo('WARNING'), todo('WARN')]);

    const groups = provider.getChildren() as CodeTodoGroupItem[];
    assert.strictEqual(groups.length, 1);
    assert.strictEqual(groups[0].tag, 'WARNING');
    assert.strictEqual(groups[0].todos.length, 3);
  });

  test('appends tags not in the priority list, alphabetically, after the rest', () => {
    const provider = new CodeTodoTreeProvider();
    provider.update([todo('TODO'), todo('HACK'), todo('FIXME'), todo('IDEA')]);

    const tags = provider
      .getChildren()
      .map(item => (item as CodeTodoGroupItem).tag);

    assert.deepStrictEqual(tags, ['FIXME', 'TODO', 'HACK', 'IDEA']);
  });
});

suite('CodeTodoTreeProvider — empty state and item properties', () => {
  test('shows "No TODOs found" when there are no todos', () => {
    const provider = new CodeTodoTreeProvider();
    provider.update([]);
    const children = provider.getChildren();
    assert.strictEqual(children.length, 1);
    assert.strictEqual((children[0] as vscode.TreeItem).label, 'No TODOs found');
  });

  test('"No TODOs found" item has a check icon', () => {
    const provider = new CodeTodoTreeProvider();
    provider.update([]);
    const [item] = provider.getChildren();
    const icon = (item as vscode.TreeItem).iconPath as vscode.ThemeIcon;
    assert.ok(icon instanceof vscode.ThemeIcon);
    assert.strictEqual((icon as unknown as { id: string }).id, 'check');
  });

  test('getTreeItem returns the element unchanged', () => {
    const provider = new CodeTodoTreeProvider();
    const item = new vscode.TreeItem('test');
    assert.strictEqual(provider.getTreeItem(item), item);
  });

  test('getChildren returns [] for non-group element', () => {
    const provider = new CodeTodoTreeProvider();
    provider.update([todo('TODO')]);
    const item = new vscode.TreeItem('other');
    assert.deepStrictEqual(provider.getChildren(item), []);
  });

  test('CodeTodoItem label falls back to "(no description)" for empty text', () => {
    const empty: TodoComment = { id: null, tag: 'TODO', text: '', file: 'f.ts', line: 0, column: 0, rawLine: '' };
    const item = new CodeTodoItem(empty);
    assert.strictEqual(item.label, '(no description)');
  });

  test('CodeTodoItem description contains file and line number', () => {
    const t: TodoComment = { id: null, tag: 'TODO', text: 'fix', file: 'src/app.ts', line: 4, column: 0, rawLine: '' };
    const item = new CodeTodoItem(t);
    assert.strictEqual(item.description, 'src/app.ts:5');
  });

  test('CodeTodoItem tooltip is the trimmed rawLine', () => {
    const t: TodoComment = { id: null, tag: 'TODO', text: 'fix', file: 'f.ts', line: 0, column: 0, rawLine: '  // TODO: fix  ' };
    const item = new CodeTodoItem(t);
    assert.strictEqual(item.tooltip, '// TODO: fix');
  });

  test('CodeTodoItem command opens the file at the right position', () => {
    const t: TodoComment = { id: null, tag: 'TODO', text: 'fix', file: 'f.ts', line: 3, column: 5, rawLine: '' };
    const item = new CodeTodoItem(t);
    assert.strictEqual(item.command?.command, 'todo-beacon.openFile');
    assert.deepStrictEqual(item.command?.arguments, [t]);
  });

  test('CodeTodoItem iconPath matches its group icon', () => {
    const provider = new CodeTodoTreeProvider();
    provider.update([todo('NOTE')]);
    const [group] = provider.getChildren() as CodeTodoGroupItem[];
    const [item] = provider.getChildren(group) as CodeTodoItem[];
    assert.deepStrictEqual(item.iconPath, group.iconPath);
  });
});

suite('TaskListTreeProvider', () => {
  test('renders sub-projects as children of their parent, not as siblings', () => {
    const provider = new TaskListTreeProvider();
    const child: Project = { name: 'Subsection', tasks: [], lineNumber: 1, level: 2, children: [] };
    const root: Project = { name: 'Work', tasks: [], lineNumber: 0, level: 1, children: [child] };
    provider.update([root]);

    const topLevel = provider.getChildren();
    assert.strictEqual(topLevel.length, 1);
    assert.ok(topLevel[0] instanceof TaskProjectItem);

    const nested = provider.getChildren(topLevel[0]);
    assert.strictEqual(nested.length, 1);
    assert.ok(nested[0] instanceof TaskProjectItem);
    assert.strictEqual((nested[0] as TaskProjectItem).project.name, 'Subsection');
  });

  test('a project with tasks and children is collapsible', () => {
    const provider = new TaskListTreeProvider();
    const root: Project = {
      name: 'Work',
      tasks: [task('do thing', 1)],
      lineNumber: 0,
      level: 1,
      children: [],
    };
    provider.update([root]);

    const [item] = provider.getChildren();
    assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.Expanded);
  });

  test('an empty project (no tasks, no children) is not collapsible', () => {
    const provider = new TaskListTreeProvider();
    const root: Project = { name: 'Empty', tasks: [], lineNumber: 0, level: 1, children: [] };
    provider.update([root]);

    const [item] = provider.getChildren();
    assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.None);
  });

  test('combines sub-projects and tasks in source order under a parent', () => {
    const provider = new TaskListTreeProvider();
    const child: Project = { name: 'Sub', tasks: [], lineNumber: 1, level: 2, children: [] };
    const root: Project = {
      name: 'Work',
      tasks: [task('after sub', 2)],
      lineNumber: 0,
      level: 1,
      children: [child],
    };
    provider.update([root]);

    const [rootItem] = provider.getChildren();
    const children = provider.getChildren(rootItem);
    assert.strictEqual(children.length, 2);
    assert.ok(children[0] instanceof TaskProjectItem);
    assert.ok(children[1] instanceof TaskListItem);
  });

  test('clicking a task item opens its file at the task line', () => {
    const provider = new TaskListTreeProvider();
    const root: Project = {
      name: 'Work',
      tasks: [task('do thing', 5, 'TODO.md')],
      lineNumber: 0,
      level: 1,
      children: [],
    };
    provider.update([root]);

    const [projectItem] = provider.getChildren();
    const [item] = provider.getChildren(projectItem) as TaskListItem[];
    assert.strictEqual(item.command?.command, 'todo-beacon.openFile');
    assert.deepStrictEqual(item.command?.arguments, [{ file: 'TODO.md', line: 5, column: 0 }]);
  });

  test('shows "No task file found" when there are no projects', () => {
    const provider = new TaskListTreeProvider();
    provider.update([]);
    const children = provider.getChildren();
    assert.strictEqual(children.length, 1);
    assert.strictEqual((children[0] as vscode.TreeItem).label, 'No task file found');
  });

  test('"No task file found" item has an info icon', () => {
    const provider = new TaskListTreeProvider();
    provider.update([]);
    const [item] = provider.getChildren();
    const icon = (item as vscode.TreeItem).iconPath as vscode.ThemeIcon;
    assert.ok(icon instanceof vscode.ThemeIcon);
    assert.strictEqual((icon as unknown as { id: string }).id, 'info');
  });

  test('getTreeItem returns the element unchanged', () => {
    const provider = new TaskListTreeProvider();
    const item = new vscode.TreeItem('test');
    assert.strictEqual(provider.getTreeItem(item), item);
  });

  test('getChildren returns [] for non-project element', () => {
    const provider = new TaskListTreeProvider();
    provider.update([]);
    const item = new vscode.TreeItem('other');
    assert.deepStrictEqual(provider.getChildren(item), []);
  });

  test('TaskProjectItem with empty name shows "Inbox"', () => {
    const p: Project = { name: '', tasks: [], lineNumber: 0, level: 0, children: [] };
    const item = new TaskProjectItem(p);
    assert.strictEqual(item.label, 'Inbox');
  });

  test('TaskListItem with empty text shows "(empty)"', () => {
    const t: Task = { id: null, text: '', status: 'open', tags: {}, lineNumber: 0, file: 'f.md' };
    const item = new TaskListItem(t);
    assert.strictEqual(item.label, '(empty)');
  });

  test('TaskListItem with done status has check icon', () => {
    const t: Task = { id: null, text: 'done task', status: 'done', tags: {}, lineNumber: 0, file: 'f.md' };
    const item = new TaskListItem(t);
    const icon = item.iconPath as unknown as { id: string };
    assert.strictEqual(icon.id, 'check');
  });

  test('TaskListItem with cancelled status has close icon', () => {
    const t: Task = { id: null, text: 'cancelled task', status: 'cancelled', tags: {}, lineNumber: 0, file: 'f.md' };
    const item = new TaskListItem(t);
    const icon = item.iconPath as unknown as { id: string };
    assert.strictEqual(icon.id, 'close');
  });

  test('TaskListItem with open status has circle-outline icon', () => {
    const t: Task = { id: null, text: 'open task', status: 'open', tags: {}, lineNumber: 0, file: 'f.md' };
    const item = new TaskListItem(t);
    const icon = item.iconPath as unknown as { id: string };
    assert.strictEqual(icon.id, 'circle-outline');
  });

  test('TaskListItem description lists bare tags with @ prefix', () => {
    const t: Task = { id: null, text: 'task', status: 'open', tags: { today: true, priority: 'high' }, lineNumber: 0, file: 'f.md' };
    const item = new TaskListItem(t);
    assert.ok((item.description as string).includes('@today'));
    assert.ok((item.description as string).includes('@priority(high)'));
  });

  test('TaskListItem description is empty string when task has no tags', () => {
    const t: Task = { id: null, text: 'task', status: 'open', tags: {}, lineNumber: 0, file: 'f.md' };
    const item = new TaskListItem(t);
    assert.strictEqual(item.description, '');
  });
});
