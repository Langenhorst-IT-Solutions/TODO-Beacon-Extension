import * as vscode from 'vscode';
import { Project, Task } from '../types';
import { SidecarIndex } from '../index/SidecarIndex';

export interface WriteBackChange {
  fileUri: vscode.Uri;
  /** Workspace-relative path, for display. */
  file: string;
  /** 0-indexed line in the code file. */
  line: number;
  originalTag: string;
  newTag: string;
  text: string;
  /** The (#xxxx) code ID shared between task and index entry. */
  taskId: string;
}

export class WriteBackEngine {
  constructor(
    private readonly index: SidecarIndex,
    private readonly doneKeyword: string,
    private readonly cancelKeyword: string,
    private readonly onDone: boolean,
    private readonly onCancel: boolean,
  ) {}

  buildChanges(
    projects: Project[],
    workspaceFolder: vscode.WorkspaceFolder,
  ): WriteBackChange[] {
    const changes: WriteBackChange[] = [];
    this.collect(projects, changes, workspaceFolder);
    return changes;
  }

  private collect(
    projects: Project[],
    out: WriteBackChange[],
    folder: vscode.WorkspaceFolder,
  ): void {
    for (const project of projects) {
      for (const task of project.tasks) {
        this.tryBuild(task, out, folder);
      }
      this.collect(project.children, out, folder);
    }
  }

  private tryBuild(
    task: Task,
    out: WriteBackChange[],
    folder: vscode.WorkspaceFolder,
  ): void {
    if (task.status === 'open') return;
    if (task.status === 'done' && !this.onDone) return;
    if (task.status === 'cancelled' && !this.onCancel) return;
    if (!task.id) return;

    const entry = this.index.findByCodeId(task.id);
    if (!entry) return;

    const newTag = task.status === 'done' ? this.doneKeyword : this.cancelKeyword;
    if (entry.tag === newTag) return;

    out.push({
      fileUri: vscode.Uri.joinPath(folder.uri, entry.file),
      file: entry.file,
      line: entry.line,
      originalTag: entry.tag,
      newTag,
      text: entry.text,
      taskId: task.id,
    });
  }

  async applyChanges(
    changes: WriteBackChange[],
  ): Promise<void> {
    const byFile = new Map<string, WriteBackChange[]>();
    for (const c of changes) {
      const arr = byFile.get(c.file) ?? [];
      arr.push(c);
      byFile.set(c.file, arr);
    }
    for (const fileChanges of byFile.values()) {
      await this.applyToFile(fileChanges);
    }
  }

  private async applyToFile(changes: WriteBackChange[]): Promise<void> {
    const uri = changes[0].fileUri;
    let bytes: Uint8Array;
    try {
      bytes = await vscode.workspace.fs.readFile(uri);
    } catch {
      return;
    }

    const content = new TextDecoder().decode(bytes);
    const eol = content.includes('\r\n') ? '\r\n' : '\n';
    const lines = content.split(/\r?\n/);

    for (const change of changes) {
      if (change.line >= lines.length) continue;
      const tagRe = new RegExp(`\\b${escapeRe(change.originalTag)}\\b`, 'i');
      lines[change.line] = lines[change.line].replace(tagRe, change.newTag);

      const existing = this.index.findByCodeId(change.taskId);
      if (existing) {
        this.index.addOrUpdate({ ...existing, tag: change.newTag });
      }
    }

    await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(lines.join(eol)));
  }
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
