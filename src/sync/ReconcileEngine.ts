import * as vscode from 'vscode';
import { TodoComment } from '../types';
import { SidecarIndex } from '../index/SidecarIndex';
import { FuzzyMatcher } from '../index/FuzzyMatcher';
import { InboxWriter } from './InboxWriter';
import { OrphanWriter } from './OrphanWriter';

export interface ReconcileOptions {
  autoAddToInbox: boolean;
  inboxHeading: string;
  archiveOrphans: boolean;
  orphanHeading: string;
  taskFileUri: vscode.Uri | null;
  taskFileRelPath: string | null;
}

export class ReconcileEngine {
  private readonly matcher: FuzzyMatcher;

  constructor(private readonly index: SidecarIndex) {
    this.matcher = new FuzzyMatcher(index);
  }

  async reconcile(todos: TodoComment[], opts: ReconcileOptions): Promise<void> {
    const matchedIds = new Set<string>();
    const newTodos: TodoComment[] = [];

    for (const todo of todos) {
      const result = this.matcher.match(todo);

      if (result.kind === 'matched') {
        matchedIds.add(result.entry.id);
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
        matchedIds.add(entry.id);
        newTodos.push(todo);
      }
      // 'ambiguous' → leave unchanged, do not add to inbox (safer).
    }

    const orphaned = this.index.all().filter(e => !matchedIds.has(e.id));

    await this.index.save();

    if (opts.autoAddToInbox && newTodos.length > 0 && opts.taskFileUri && opts.taskFileRelPath) {
      const writer = new InboxWriter(opts.taskFileUri, opts.taskFileRelPath, opts.inboxHeading);
      await writer.write(newTodos);
    }

    if (opts.archiveOrphans && orphaned.length > 0 && opts.taskFileUri && opts.taskFileRelPath) {
      const writer = new OrphanWriter(opts.taskFileUri, opts.taskFileRelPath, opts.orphanHeading);
      await writer.write(orphaned);
      for (const entry of orphaned) {
        this.index.delete(entry.id);
      }
      await this.index.save();
    }
  }
}
