import * as vscode from 'vscode';
import { TodoComment } from '../types';

/** Per-file directive returned by the optional scan callback in `scan()`. */
export interface FileScanDirective {
  /** When true, the file is skipped entirely. */
  skip?: boolean;
  /** When true, TODO tags found inside string literals are suppressed. */
  maskStringLiterals?: boolean;
}

/** Options forwarded from a `FileScanDirective` into `parseLines()`. */
export interface ParseOptions {
  maskStringLiterals?: boolean;
}

export class CodeScanner {
  // Matches the start of a line/block comment (//, #, /*, <!--). A tag is
  // only treated as a TODO when it appears at or after one of these, so
  // e.g. CSS selectors like ".btn-warn:hover {" aren't picked up.
  private static readonly commentMarkerPattern = /\/\/|\/\*|<!--|#/;

  private readonly tagPattern: RegExp;

  constructor(
    private readonly tags: string[],
    private readonly maxFileSizeBytes: number = 1024 * 1024,
  ) {
    const escaped = tags
      .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');
    // Tag must be followed by a colon (e.g. "TODO:" not "TODO text").
    // Case-insensitive so Todo:, todo:, TODO: all match.
    // Optional whitespace before/after the colon is allowed.
    this.tagPattern = new RegExp(`\\b(${escaped})\\b\\s*:\\s*(.*)`, 'i');
  }

  async scan(
    excludePatterns: string[],
    getDirective?: (relPath: string) => FileScanDirective,
  ): Promise<TodoComment[]> {
    const excludeGlob =
      excludePatterns.length > 0 ? `{${excludePatterns.join(',')}}` : undefined;
    const files = await vscode.workspace.findFiles('**/*', excludeGlob);

    const results: TodoComment[] = [];
    for (const file of files) {
      const relPath = vscode.workspace.asRelativePath(file);
      const directive = getDirective?.(relPath);
      if (directive?.skip) continue;
      const todos = await this.scanFile(file, directive ?? undefined);
      results.push(...todos);
    }
    return results;
  }

  async scanFile(uri: vscode.Uri, options?: ParseOptions): Promise<TodoComment[]> {
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.size > this.maxFileSizeBytes) return [];
    } catch {
      return [];
    }

    let bytes: Uint8Array;
    try {
      bytes = await vscode.workspace.fs.readFile(uri);
    } catch {
      return [];
    }

    if (isBinary(bytes)) return [];

    const content = new TextDecoder('utf-8').decode(bytes);
    const relativePath = vscode.workspace.asRelativePath(uri);
    return this.parseLines(content, relativePath, options);
  }

  scanDocument(doc: vscode.TextDocument): TodoComment[] {
    const relativePath = vscode.workspace.asRelativePath(doc.uri);
    return this.parseLines(doc.getText(), relativePath);
  }

  parseLines(content: string, filePath: string, options?: ParseOptions): TodoComment[] {
    const lines = content.split(/\r?\n/);
    const results: TodoComment[] = [];
    const isMarkdown = /\.mdx?$/i.test(filePath);
    let inFencedBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (isMarkdown) {
        // Toggle fenced code block state on opening/closing fence (``` or ~~~)
        if (/^\s*(`{3,}|~{3,})/.test(line)) {
          inFencedBlock = !inFencedBlock;
          continue;
        }
        if (inFencedBlock) continue;
        // Markdown headings (e.g. "# Code Review: ...") are titles, not TODO
        // comments, even when a tag word happens to appear before the colon.
        if (/^\s*#{1,6}\s+/.test(line)) continue;
      }

      // Build the line used for tag matching:
      // - Markdown: mask inline code spans so `WARN:` inside backticks is ignored.
      // - Non-Markdown with maskStringLiterals: mask single/double/template-literal
      //   string contents so tags in test fixtures or string arguments are ignored.
      // Masks replace chars with spaces, preserving string length so match positions
      // stay aligned with the original line.
      let matchLine: string;
      if (isMarkdown) {
        matchLine = maskInlineCode(line);
      } else if (options?.maskStringLiterals) {
        matchLine = maskStringLiterals(line);
      } else {
        matchLine = line;
      }

      const match = this.tagPattern.exec(matchLine);
      if (!match) continue;

      // Markdown prose has no comment syntax of its own, so the colon-tag
      // check above is sufficient there. Everywhere else, require the tag
      // to actually sit inside a comment (fixes e.g. CSS selectors like
      // ".btn-warn:hover {" being mistaken for a "WARN:" tag).
      // When string masking is active we check against the masked line so
      // a // inside a string is not mistaken for a real comment marker.
      if (!isMarkdown) {
        const checkLine = options?.maskStringLiterals ? matchLine : line;
        const commentMarker = CodeScanner.commentMarkerPattern.exec(checkLine);
        if (!commentMarker || commentMarker.index > match.index) continue;
      }

      const column = line.indexOf(match[1]);
      const id = extractId(match[2] ?? '');

      results.push({
        id,
        tag: match[1].toUpperCase(),
        text: (match[2] ?? '').replace(/\(#[a-f0-9]{4,8}\)/, '').trim(),
        file: filePath,
        line: i,
        column,
        rawLine: line.trimEnd(),
      });
    }

    return results;
  }
}

function isBinary(bytes: Uint8Array): boolean {
  const sample = Math.min(512, bytes.length);
  for (let i = 0; i < sample; i++) {
    if (bytes[i] === 0) return true;
  }
  return false;
}

function extractId(text: string): string | null {
  const match = /\(#([a-f0-9]{4,8})\)/.exec(text);
  return match ? match[1] : null;
}

function maskInlineCode(line: string): string {
  return line.replace(/`[^`]*`/g, m => ' '.repeat(m.length));
}

/**
 * Replaces the contents of single-quoted, double-quoted, and backtick
 * string literals with spaces, preserving string length so match positions
 * stay aligned. Handles basic escape sequences (e.g. \', \", \\).
 * Single-line only — multiline template literals are not handled.
 */
function maskStringLiterals(line: string): string {
  return line
    .replace(/'(?:[^'\\]|\\.)*'/g, m => ' '.repeat(m.length))
    .replace(/"(?:[^"\\]|\\.)*"/g, m => ' '.repeat(m.length))
    .replace(/`(?:[^`\\]|\\.)*`/g, m => ' '.repeat(m.length));
}
