import * as assert from 'assert';
import * as vscode from 'vscode';
import {
  TaskListTreeProvider,
  TaskProjectItem,
  TaskListItem,
  CodeTodoTreeProvider,
  CodeTodoGroupItem,
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
});
