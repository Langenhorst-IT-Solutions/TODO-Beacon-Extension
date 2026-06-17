import { Task, Project, TaskStatus } from '../types';

export class TaskPaperParser {
  parse(content: string): Project[] {
    const lines = content.split(/\r?\n/);
    const projects: Project[] = [];
    let currentProject: Project | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('//')) continue;

      // Project: non-task line ending with ":"
      if (!trimmed.startsWith('-') && trimmed.endsWith(':')) {
        currentProject = {
          name: trimmed.slice(0, -1).trim(),
          tasks: [],
          lineNumber: i,
          level: 0,
          children: [],
        };
        projects.push(currentProject);
        continue;
      }

      // Task: starts with "- "
      if (trimmed.startsWith('- ')) {
        const task = parseTask(trimmed.slice(2), i);
        if (!currentProject) {
          currentProject = { name: '', tasks: [], lineNumber: -1, level: 0, children: [] };
          projects.unshift(currentProject);
        }
        currentProject.tasks.push(task);
      }
    }

    return projects;
  }
}

function parseTask(text: string, lineNumber: number): Task {
  const tags: Record<string, string | boolean> = {};
  let status: TaskStatus = 'open';

  const tagPattern = /@(\w+)(?:\(([^)]*)\))?/g;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(text)) !== null) {
    const name = match[1];
    const value: string | boolean = match[2] !== undefined ? match[2] : true;

    if (name === 'done') {
      status = 'done';
    } else if (name === 'cancelled' || name === 'canceled') {
      status = 'cancelled';
    } else {
      tags[name] = value;
    }
  }

  const id = extractId(text);

  const cleanText = text
    .replace(/@\w+(?:\([^)]*\))?/g, '')
    .replace(/\(#[a-f0-9]{4,8}\)/g, '')
    .trim();

  return { id, text: cleanText, status, tags, lineNumber, file: '' };
}

function extractId(text: string): string | null {
  const match = /\(#([a-f0-9]{4,8})\)/.exec(text);
  return match ? match[1] : null;
}
