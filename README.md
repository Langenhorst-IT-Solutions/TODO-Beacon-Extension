<div align="center">

<img src="resources/todo-beacon-icon.png" alt="TODO Beacon logo" width="96" height="96">

# TODO Beacon

**Bridges code TODO comments and a managed task list — one task, two faces.**

[![CI](https://github.com/B1GSt4R/TODO-Beacon-Extension/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/B1GSt4R/TODO-Beacon-Extension/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/B1GSt4R/TODO-Beacon-Extension/dev/.github/badges/coverage.json)](https://github.com/B1GSt4R/TODO-Beacon-Extension/actions/workflows/ci.yml)
[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/Langenhorst-IT-Solutions.todo-beacon?label=marketplace)](https://marketplace.visualstudio.com/items?itemName=Langenhorst-IT-Solutions.todo-beacon)
[![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/Langenhorst-IT-Solutions.todo-beacon)](https://marketplace.visualstudio.com/items?itemName=Langenhorst-IT-Solutions.todo-beacon)
[![License: MIT](https://img.shields.io/github/license/B1GSt4R/TODO-Beacon-Extension)](LICENSE)

</div>

---

TODO Beacon scans your codebase for `TODO`/`FIXME`/`BUG`-style comments **and** parses a plain-text task file, then shows both side by side in the Activity Bar — so you never have to choose between "TODOs live in code" and "tasks live in a list."

## Features

### 📋 Code TODOs

Scans every file in the workspace for configurable comment tags (`TODO`, `FIXME`, `BUG`, `HACK`, `NOTE`, `REVIEW`, `DEPRECATED`, …) and groups them by tag in a dedicated tree view.

- Only matches tags that actually sit **inside a comment** — a CSS rule like `.btn-warn:hover {` is never mistaken for a `WARN:` tag.
- Markdown heading titles (`# Code Review: ...`) are never mistaken for a tag either.
- Groups are sorted in a fixed, scannable priority order — `DEPRECATED`, `FIXME`, `BUG`, `XXX`, `WARNING`, `TODO`, `NOTE` — with any other configured tags appended alphabetically. `WARN` is merged into the `WARNING` group.
- Click an item to jump straight to that line in the file.

### ✅ Task List

Auto-detects a task file in your workspace root (`tasks.todo` → `TODO.md` → `todo.md` → `TASKS.md` → `tasks.md`, or a path you configure) and renders it as a tree.

- Supports both **TaskPaper** (`.todo`) and **Markdown checkbox** (`- [ ]`, `- [x]`, `- [-]`) formats.
- Markdown headings are nested by heading depth, so `##` sections sit under their parent `#` section — collapsing a section collapses everything beneath it, and indentation matches the document structure.
- Click a task to jump straight to it in the task file.

### 🔄 Always in sync

A file watcher refreshes both views automatically as files change, or trigger it manually via the refresh button in the view title or the **Refresh TODOs** command.

## Configuration

| Setting | Default | Description |
| --- | --- | --- |
| `todo-beacon.tags` | `TODO`, `FIXME`, `BUG`, `HACK`, `NOTE`, `TEST`, `DEBUG`, `OPTIMIZE`, `PERF`, `REVIEW`, `IDEA`, `WARNING`, `WARN`, `DEPRECATED`, `XXX` | Comment tags to detect in source files. |
| `todo-beacon.taskFile` | `""` (auto-detect) | Path to the task file, relative to the workspace root. Leave empty to auto-detect. Supports TaskPaper (`.todo`) and Markdown (`.md`) formats. |
| `todo-beacon.exclude` | `node_modules`, `.git`, `dist`, `build`, `wwwroot`, `assets`, `out`, `.vscode-test`, and common per-language cache/build folders (`.angular`, `.next`, `.nuxt`, `.turbo`, `.cache`, `__pycache__`, `.pytest_cache`, `.mypy_cache`, `.gradle`, `.dart_tool`, `target`, …) | Glob patterns to exclude from code scanning. |
| `todo-beacon.maxFileSizeKb` | `1024` | Maximum file size in KB to scan. Larger files are skipped. |

## Task file formats

**TaskPaper**

```
Work:
	- Fix bug @done
	- Refactor loop (#7f3a)

Personal:
	- Call dentist
```

**Markdown**

```markdown
## Work
- [x] Fix bug
- [ ] Refactor loop (#7f3a)

### Personal
- [ ] Call dentist
```

## Requirements

VS Code `1.90.0` or newer.

## Contributing

Issues and pull requests are welcome at [github.com/B1GSt4R/TODO-Beacon-Extension](https://github.com/B1GSt4R/TODO-Beacon-Extension). Planned features and design decisions are tracked in [ROADMAP.md](ROADMAP.md).

```sh
npm install
npm test              # run the test suite
npm run coverage      # run tests with a coverage report
```

## License

[MIT](LICENSE)
