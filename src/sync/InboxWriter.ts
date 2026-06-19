import * as vscode from 'vscode';
import { TodoComment } from '../types';

export class InboxWriter {
  constructor(
    private readonly taskFileUri: vscode.Uri,
    private readonly taskFileRelPath: string,
    private readonly inboxHeading: string,
  ) {}

  /**
   * Appends `newTodos` to the inbox section of the task file.
   * Creates the inbox section if it does not yet exist.
   * Skips any TODO whose source reference already appears in the file.
   */
  async write(newTodos: TodoComment[]): Promise<void> {
    if (newTodos.length === 0) return;

    let content: string;
    try {
      const bytes = await vscode.workspace.fs.readFile(this.taskFileUri);
      content = new TextDecoder().decode(bytes);
    } catch {
      content = '';
    }

    const isMarkdown = /\.mdx?$/i.test(this.taskFileRelPath);
    const lines = content.split(/\r?\n/);

    const toAppend = newTodos.filter(t => !alreadyPresent(lines, t));
    if (toAppend.length === 0) return;

    const inboxBlock = buildInboxBlock(lines, this.inboxHeading, isMarkdown, toAppend);
    const updated = inboxBlock.join('\n');
    await vscode.workspace.fs.writeFile(
      this.taskFileUri,
      new TextEncoder().encode(updated),
    );
  }
}

function alreadyPresent(lines: string[], todo: TodoComment): boolean {
  const ref = sourceRef(todo);
  return lines.some(l => l.includes(ref));
}

function sourceRef(todo: TodoComment): string {
  return `${todo.file}:${todo.line + 1}`;
}

function buildInboxBlock(
  lines: string[],
  heading: string,
  isMarkdown: boolean,
  todos: TodoComment[],
): string[] {
  const result = [...lines];

  // Remove trailing empty lines to avoid double-blank gaps.
  while (result.length > 0 && result[result.length - 1].trim() === '') {
    result.pop();
  }

  const inboxHeader = isMarkdown ? `## ${heading}` : `${heading}:`;
  const headerIdx = result.findIndex(l => l.trim() === inboxHeader.trim());

  if (headerIdx === -1) {
    // Create a new inbox section at the end.
    if (result.length > 0) result.push('');
    result.push(inboxHeader);
  }

  for (const todo of todos) {
    const ref = sourceRef(todo);
    if (isMarkdown) {
      result.push(`- [ ] ${todo.tag}: ${todo.text} <!-- ${ref} -->`);
    } else {
      result.push(`- ${todo.tag}: ${todo.text} @fromCode @source(${ref})`);
    }
  }

  result.push('');
  return result;
}
