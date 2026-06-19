import * as vscode from 'vscode';
import * as path from 'path';

export interface LocalConfig {
  exclude?: string[];
  tags?: string[];
  /** When true, TODO tags inside string literals ('', "", ``) are ignored. */
  maskStringLiterals?: boolean;
}

export interface LocalConfigEntry {
  /** Relative path from workspace root (empty string = root). Always uses forward slashes. */
  dirRelPath: string;
  config: LocalConfig;
}

export class LocalConfigLoader {
  static readonly CONFIG_FILENAME = '.todo-beacon.json';

  /**
   * Reads all .todo-beacon.json files in the workspace and returns their parsed entries.
   * Malformed files are silently skipped.
   */
  static async loadAll(): Promise<LocalConfigEntry[]> {
    const configFiles = await vscode.workspace.findFiles(
      `**/${this.CONFIG_FILENAME}`,
      undefined,
    );

    const entries: LocalConfigEntry[] = [];
    for (const file of configFiles) {
      try {
        const bytes = await vscode.workspace.fs.readFile(file);
        const content = new TextDecoder('utf-8').decode(bytes);
        const config = JSON.parse(content) as LocalConfig;
        const relFile = toForwardSlashes(vscode.workspace.asRelativePath(file));
        const dirRelPath = relFile === this.CONFIG_FILENAME
          ? ''
          : toForwardSlashes(path.posix.dirname(relFile));
        entries.push({ dirRelPath, config });
      } catch {
        // ignore unreadable or malformed files
      }
    }

    return entries;
  }

  /**
   * Returns the effective LocalConfig for the given workspace-relative file path.
   * The deepest matching config wins per key; missing keys fall through to the parent.
   */
  static resolve(fileRelPath: string, entries: LocalConfigEntry[]): LocalConfig {
    const normalized = toForwardSlashes(fileRelPath);

    const applicable = entries.filter(e => isUnder(normalized, e.dirRelPath));
    applicable.sort((a, b) => depthOf(a.dirRelPath) - depthOf(b.dirRelPath));

    let result: LocalConfig = {};
    for (const entry of applicable) {
      result = { ...result, ...entry.config };
    }
    return result;
  }

  /**
   * Returns true if the given workspace-relative file path is excluded
   * according to the effective local config that applies to it.
   */
  static isExcluded(fileRelPath: string, entries: LocalConfigEntry[]): boolean {
    const effective = this.resolve(fileRelPath, entries);
    const excludes = effective.exclude ?? [];
    const normalized = toForwardSlashes(fileRelPath);
    return excludes.some(pattern => matchesGlob(pattern, normalized));
  }

  /**
   * Returns a combined directive for a file: whether to skip it entirely
   * and which scan-time options to apply.
   */
  static getDirective(
    fileRelPath: string,
    entries: LocalConfigEntry[],
  ): { skip: boolean; maskStringLiterals?: boolean } {
    const effective = this.resolve(fileRelPath, entries);
    const normalized = toForwardSlashes(fileRelPath);
    const skip = (effective.exclude ?? []).some(p => matchesGlob(p, normalized));
    return { skip, maskStringLiterals: effective.maskStringLiterals };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Converts backslashes to forward slashes. */
export function toForwardSlashes(p: string): string {
  return p.replace(/\\/g, '/');
}

/** Returns true when `fileRelPath` is inside `dirRelPath` (or dirRelPath is root ''). */
function isUnder(fileRelPath: string, dirRelPath: string): boolean {
  if (dirRelPath === '') return true;
  return fileRelPath === dirRelPath ||
    fileRelPath.startsWith(dirRelPath + '/');
}

/** Returns the nesting depth of a directory path (root = 0). */
function depthOf(dirRelPath: string): number {
  return dirRelPath === '' ? 0 : dirRelPath.split('/').length;
}

/**
 * Tests whether a workspace-relative file path matches a glob pattern.
 * Supports `*` (any chars except `/`), `**` (any chars including `/`), and `?`.
 * Patterns are matched against the full relative path (forward-slash normalised).
 */
export function matchesGlob(pattern: string, filePath: string): boolean {
  const normalPattern = toForwardSlashes(pattern);
  const normalPath = toForwardSlashes(filePath);
  const regex = globToRegex(normalPattern);
  return regex.test(normalPath);
}

function globToRegex(pattern: string): RegExp {
  let regStr = '';
  let i = 0;
  while (i < pattern.length) {
    if (pattern[i] === '*' && pattern[i + 1] === '*') {
      // ** — match any sequence of chars (including path separators)
      // Consume optional trailing slash so "foo/**" matches "foo/bar" and "foo/bar/baz"
      i += 2;
      if (pattern[i] === '/') i++;
      regStr += '.*';
    } else if (pattern[i] === '*') {
      regStr += '[^/]*';
      i++;
    } else if (pattern[i] === '?') {
      regStr += '[^/]';
      i++;
    } else {
      regStr += escapeRegex(pattern[i]);
      i++;
    }
  }
  return new RegExp(`^${regStr}$`);
}

function escapeRegex(char: string): string {
  return char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
}
