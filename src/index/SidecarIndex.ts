import * as vscode from 'vscode';

export interface IndexEntry {
  /** Synthetic key — stable across rescans. */
  id: string;
  tag: string;
  text: string;
  file: string;
  line: number;
  /** djb2 hash of the normalised text for fuzzy matching. */
  textHash: string;
  /** '#xxxx' stable ID injected into the comment, if any (Phase 2). */
  codeId: string | null;
}

interface IndexFile {
  version: number;
  entries: Record<string, IndexEntry>;
}

export class SidecarIndex {
  private entries: Map<string, IndexEntry> = new Map();
  private readonly uri: vscode.Uri | null;

  constructor(workspaceFolder: vscode.WorkspaceFolder | null) {
    this.uri = workspaceFolder
      ? vscode.Uri.joinPath(workspaceFolder.uri, '.vscode', 'todo-beacon-index.json')
      : null;
  }

  async load(): Promise<void> {
    if (!this.uri) return;
    try {
      const bytes = await vscode.workspace.fs.readFile(this.uri);
      const data = JSON.parse(new TextDecoder().decode(bytes)) as IndexFile;
      if (data.version === 1 && data.entries) {
        this.entries = new Map(Object.entries(data.entries));
      }
    } catch {
      this.entries = new Map();
    }
  }

  async save(): Promise<void> {
    if (!this.uri) return;
    const dir = vscode.Uri.joinPath(this.uri, '..');
    try {
      await vscode.workspace.fs.createDirectory(dir);
    } catch { /* already exists */ }
    const data: IndexFile = { version: 1, entries: Object.fromEntries(this.entries) };
    await vscode.workspace.fs.writeFile(
      this.uri,
      new TextEncoder().encode(JSON.stringify(data, null, 2)),
    );
  }

  findById(id: string): IndexEntry | undefined {
    return this.entries.get(id);
  }

  findByCodeId(codeId: string): IndexEntry | undefined {
    for (const e of this.entries.values()) {
      if (e.codeId === codeId) return e;
    }
    return undefined;
  }

  findByTextAndFile(text: string, file: string): IndexEntry | undefined {
    for (const e of this.entries.values()) {
      if (e.text === text && e.file === file) return e;
    }
    return undefined;
  }

  all(): IndexEntry[] {
    return [...this.entries.values()];
  }

  addOrUpdate(entry: IndexEntry): void {
    this.entries.set(entry.id, entry);
  }

  delete(id: string): void {
    this.entries.delete(id);
  }

  size(): number {
    return this.entries.size;
  }

  /** Generates a stable synthetic index ID from text + file. */
  static syntheticId(text: string, file: string): string {
    return djb2hex(`${file}\x00${text}`).slice(0, 8);
  }

  static textHash(text: string): string {
    return djb2hex(normalise(text));
  }
}

function normalise(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function djb2hex(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
