import * as vscode from 'vscode';
import { IndexEntry } from '../index/SidecarIndex';

export class OrphanWriter {
  constructor(
    private readonly taskFileUri: vscode.Uri,
    private readonly taskFileRelPath: string,
    private readonly orphanHeading: string,
  ) {}

  /**
   * Appends `orphaned` entries to the orphan section of the task file.
   * Creates the section if it does not exist.
   * Skips any entry whose source reference already appears in the file.
   */
  async write(orphaned: IndexEntry[]): Promise<void> {
    if (orphaned.length === 0) return;

    let content: string;
    try {
      const bytes = await vscode.workspace.fs.readFile(this.taskFileUri);
      content = new TextDecoder().decode(bytes);
    } catch {
      content = '';
    }

    const isMarkdown = /\.mdx?$/i.test(this.taskFileRelPath);
    const lines = content.split(/\r?\n/);

    const toAppend = orphaned.filter(e => !alreadyPresent(lines, e));
    if (toAppend.length === 0) return;

    const result = buildOrphanBlock(lines, this.orphanHeading, isMarkdown, toAppend);
    await vscode.workspace.fs.writeFile(
      this.taskFileUri,
      new TextEncoder().encode(result.join('\n')),
    );
  }
}

function alreadyPresent(lines: string[], entry: IndexEntry): boolean {
  const ref = sourceRef(entry);
  return lines.some(l => l.includes(ref));
}

function sourceRef(entry: IndexEntry): string {
  return `${entry.file}:${entry.line + 1}`;
}

function buildOrphanBlock(
  lines: string[],
  heading: string,
  isMarkdown: boolean,
  entries: IndexEntry[],
): string[] {
  const result = [...lines];

  while (result.length > 0 && result[result.length - 1].trim() === '') {
    result.pop();
  }

  const sectionHeader = isMarkdown ? `## ${heading}` : `${heading}:`;
  const headerIdx = result.findIndex(l => l.trim() === sectionHeader.trim());

  if (headerIdx === -1) {
    if (result.length > 0) result.push('');
    result.push(sectionHeader);
  }

  for (const entry of entries) {
    const ref = sourceRef(entry);
    const idPart = entry.codeId ? ` (#${entry.codeId})` : '';
    if (isMarkdown) {
      result.push(`- [ ] ${entry.tag}: ${entry.text}${idPart} <!-- orphaned · was: ${ref} -->`);
    } else {
      result.push(`- ${entry.tag}: ${entry.text}${idPart} @orphaned @wasAt(${ref})`);
    }
  }

  result.push('');
  return result;
}
