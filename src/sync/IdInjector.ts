import * as vscode from 'vscode';
import { randomBytes } from 'crypto';

export class IdInjector {
  constructor(private readonly idTemplate: string) {}

  /**
   * Injects a stable ID into the comment at `line` (0-indexed).
   * Returns the generated codeId, or null if the line already has one
   * or the file could not be read/written.
   */
  async inject(fileUri: vscode.Uri, line: number): Promise<string | null> {
    let bytes: Uint8Array;
    try {
      bytes = await vscode.workspace.fs.readFile(fileUri);
    } catch {
      return null;
    }

    const content = new TextDecoder().decode(bytes);
    const eol = content.includes('\r\n') ? '\r\n' : '\n';
    const lines = content.split(/\r?\n/);

    if (line >= lines.length) return null;
    if (/\(#[a-f0-9]{4,8}\)/.test(lines[line])) return null;

    const codeId = randomBytes(2).toString('hex');
    const idStr = this.idTemplate.replace('{{id}}', codeId);
    lines[line] = lines[line].trimEnd() + ' ' + idStr;

    await vscode.workspace.fs.writeFile(
      fileUri,
      new TextEncoder().encode(lines.join(eol)),
    );
    return codeId;
  }

  /** Generates a unique 4-char hex ID without writing to disk. */
  static generateId(): string {
    return randomBytes(2).toString('hex');
  }
}
