import { Task, Project, TaskStatus } from '../types';

export class MarkdownTaskParser {
  parse(content: string): Project[] {
    const lines = content.split(/\r?\n/);
    const projects: Project[] = [];
    let currentProject: Project | null = null;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) continue;

      // Markdown heading → new project / section
      const headingMatch = /^#{1,6}\s+(.+)$/.exec(trimmed);
      if (headingMatch) {
        currentProject = { name: headingMatch[1].trim(), tasks: [], lineNumber: i };
        projects.push(currentProject);
        continue;
      }

      // Checkbox task: - [ ], - [x], - [X], - [-]
      const taskMatch = /^-\s+\[([xX\-\s])\]\s+(.+)$/.exec(trimmed);
      if (!taskMatch) continue;

      const status: TaskStatus =
        /[xX]/.test(taskMatch[1]) ? 'done' :
        taskMatch[1] === '-'      ? 'cancelled' : 'open';

      const rawText = taskMatch[2];
      const id = extractId(rawText);
      const text = rawText.replace(/\(#[a-f0-9]{4,8}\)/g, '').trim();

      const task: Task = { id, text, status, tags: {}, lineNumber: i };

      if (!currentProject) {
        currentProject = { name: '', tasks: [], lineNumber: -1 };
        projects.push(currentProject);
      }
      currentProject.tasks.push(task);
    }

    return projects;
  }
}

function extractId(text: string): string | null {
  const match = /\(#([a-f0-9]{4,8})\)/.exec(text);
  return match ? match[1] : null;
}
