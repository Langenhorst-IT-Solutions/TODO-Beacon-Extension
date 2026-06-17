import * as vscode from 'vscode';
import { CodeScanner } from '../scanner/CodeScanner';
import { tagColor } from '../tagStyles';

/**
 * Highlights recognized tag keywords (e.g. `TODO`, `FIXME`) directly in the
 * editor, using the same per-tag color shown in the tree views.
 */
export class TagHighlighter implements vscode.Disposable {
  private readonly decorationTypes = new Map<string, vscode.TextEditorDecorationType>();

  constructor(private scanner: CodeScanner) {}

  setScanner(scanner: CodeScanner): void {
    this.scanner = scanner;
  }

  updateEditor(editor: vscode.TextEditor | undefined): void {
    if (!editor) return;

    const todos = this.scanner.scanDocument(editor.document);
    const rangesByTag = new Map<string, vscode.Range[]>();
    for (const todo of todos) {
      const ranges = rangesByTag.get(todo.tag) ?? [];
      ranges.push(new vscode.Range(todo.line, todo.column, todo.line, todo.column + todo.tag.length));
      rangesByTag.set(todo.tag, ranges);
    }

    // Apply ranges for tags found, and clear any previously-decorated tag
    // that no longer has matches in this document.
    const seen = new Set(rangesByTag.keys());
    for (const tag of seen) {
      editor.setDecorations(this.decorationTypeFor(tag), rangesByTag.get(tag) ?? []);
    }
    for (const [tag, type] of this.decorationTypes) {
      if (!seen.has(tag)) editor.setDecorations(type, []);
    }
  }

  private decorationTypeFor(tag: string): vscode.TextEditorDecorationType {
    let type = this.decorationTypes.get(tag);
    if (!type) {
      type = vscode.window.createTextEditorDecorationType({
        color: tagColor(tag),
        fontWeight: 'bold',
      });
      this.decorationTypes.set(tag, type);
    }
    return type;
  }

  dispose(): void {
    for (const type of this.decorationTypes.values()) type.dispose();
    this.decorationTypes.clear();
  }
}
