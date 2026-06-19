import * as vscode from 'vscode';
import { TodoComment } from '../types';
import { SidecarIndex } from '../index/SidecarIndex';
import { FuzzyMatcher } from '../index/FuzzyMatcher';
import { InboxWriter } from './InboxWriter';

export interface ReconcileOptions {
  autoAddToInbox: boolean;
  inboxHeading: string;
  taskFileUri: vscode.Uri | null;
  taskFileRelPath: string | null;
}

export class ReconcileEngine {
  private readonly matcher: FuzzyMatcher;

  constructor(private readonly index: SidecarIndex) {
    this.matcher = new FuzzyMatcher(index);
  }

  async reconcile(todos: TodoComment[], opts: ReconcileOptions): Promise<void> {
    const newTodos: TodoComment[] = [];

    for (const todo of todos) {
      const result = this.matcher.match(todo);

      if (result.kind === 'matched') {
        // Update position and tag in case either changed.
        this.index.addOrUpdate({
          ...result.entry,
          line: todo.line,
          tag: todo.tag,
          text: todo.text,
          textHash: SidecarIndex.textHash(todo.text),
        });
      } else if (result.kind === 'new') {
        const entry = {
          id: SidecarIndex.syntheticId(todo.text, todo.file),
          tag: todo.tag,
          text: todo.text,
          file: todo.file,
          line: todo.line,
          textHash: SidecarIndex.textHash(todo.text),
          codeId: todo.id,
        };
        this.index.addOrUpdate(entry);
        newTodos.push(todo);
      }
      // 'ambiguous' → leave unchanged, do not add to inbox (safer).
    }

    await this.index.save();

    if (opts.autoAddToInbox && newTodos.length > 0 && opts.taskFileUri && opts.taskFileRelPath) {
      const writer = new InboxWriter(opts.taskFileUri, opts.taskFileRelPath, opts.inboxHeading);
      await writer.write(newTodos);
    }
  }
}
