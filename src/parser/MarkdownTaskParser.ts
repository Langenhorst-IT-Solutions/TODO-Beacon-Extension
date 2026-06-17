import { Task, Project, TaskStatus } from '../types';

export class MarkdownTaskParser {
  parse(content: string): Project[] {
    const lines = content.split(/\r?\n/);
    const roots: Project[] = [];
    // Stack of ancestor headings, shallowest first, used to nest a new
    // heading under the closest heading with a smaller level.
    const stack: Project[] = [];
    let currentProject: Project | null = null;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) continue;

      // Markdown heading → new project / section, nested under the closest
      // shallower heading still on the stack (e.g. "##" nests under "#").
      const headingMatch = /^(#{1,6})\s+(.+)$/.exec(trimmed);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const project: Project = {
          name: headingMatch[2].trim(),
          tasks: [],
          lineNumber: i,
          level,
          children: [],
        };

        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
          stack.pop();
        }

        if (stack.length === 0) {
          roots.push(project);
        } else {
          stack[stack.length - 1].children.push(project);
        }
        stack.push(project);

        currentProject = project;
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

      const task: Task = { id, text, status, tags: {}, lineNumber: i, file: '' };

      if (!currentProject) {
        currentProject = { name: '', tasks: [], lineNumber: -1, level: 0, children: [] };
        roots.push(currentProject);
      }
      currentProject.tasks.push(task);
    }

    return roots;
  }
}

function extractId(text: string): string | null {
  const match = /\(#([a-f0-9]{4,8})\)/.exec(text);
  return match ? match[1] : null;
}
