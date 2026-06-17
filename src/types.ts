export interface TodoComment {
  /** null = raw comment, not yet upgraded with a stable ID */
  id: string | null;
  tag: string;
  text: string;
  /** Workspace-relative file path */
  file: string;
  /** 0-indexed line number */
  line: number;
  /** Column index of the tag keyword */
  column: number;
  rawLine: string;
}

export type TaskStatus = 'open' | 'done' | 'cancelled';

export interface Task {
  id: string | null;
  text: string;
  status: TaskStatus;
  /** @tags as key/value pairs (value is true for bare tags) */
  tags: Record<string, string | boolean>;
  lineNumber: number;
  /** Workspace-relative path of the task file. Set after parsing. */
  file: string;
}

/** Shape needed to open and reveal a location in the editor. */
export interface OpenTarget {
  file: string;
  line: number;
  column: number;
}

export interface Project {
  name: string;
  tasks: Task[];
  lineNumber: number;
  /** Heading depth (1-6 for Markdown headings, 0 when flat/unsupported). */
  level: number;
  /** Sub-projects nested under this one (e.g. a deeper Markdown heading). */
  children: Project[];
}
