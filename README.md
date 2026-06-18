<div align="center">

<img src="resources/todo-beacon-icon.png" alt="TODO Beacon logo" width="96" height="96">

# TODO Beacon

**See your code's TODO/FIXME/BUG comments and your Markdown or TaskPaper task list in one Activity Bar view.**

[![CI](https://github.com/Langenhorst-IT-Solutions/TODO-Beacon-Extension/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Langenhorst-IT-Solutions/TODO-Beacon-Extension/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/Langenhorst-IT-Solutions/TODO-Beacon-Extension/main/.github/badges/coverage.json)](https://github.com/Langenhorst-IT-Solutions/TODO-Beacon-Extension/actions/workflows/ci.yml)
[![Version](https://img.shields.io/github/v/release/Langenhorst-IT-Solutions/TODO-Beacon-Extension?label=version&color=blue)](https://github.com/Langenhorst-IT-Solutions/TODO-Beacon-Extension/releases)
[![License](https://img.shields.io/github/license/Langenhorst-IT-Solutions/TODO-Beacon-Extension?label=license&color=green)](https://github.com/Langenhorst-IT-Solutions/TODO-Beacon-Extension/blob/main/LICENSE)

</div>

---

Most TODO trackers only scan comments in your code. Most task list tools only manage a separate file. TODO Beacon does both at once: it scans your codebase for `TODO`/`FIXME`/`BUG`-style comments **and** parses a Markdown or TaskPaper task file, then shows both as trees side by side in the Activity Bar. Click any item to jump straight to that line — no copy-pasting tasks between your code and your to-do list.

## Up and running in 10 seconds

No configuration required — just install and open the sidebar.

1. Install the extension.
2. Click the **TODO Beacon** icon in the Activity Bar (the bar on the far left/right edge of VS Code).
3. Done — your code's `TODO`/`FIXME`/`BUG` comments and your task file (auto-detected, see below) show up right away.

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

Issues and pull requests are welcome at [github.com/Langenhorst-IT-Solutions/TODO-Beacon-Extension](https://github.com/Langenhorst-IT-Solutions/TODO-Beacon-Extension). Planned features and design decisions are tracked in [ROADMAP.md](ROADMAP.md). See [CONTRIBUTING.md](CONTRIBUTING.md) for commit conventions and the branching model.

```sh
npm install
npm test              # run the test suite
npm run coverage      # run tests with a coverage report
```

## Support TODO Beacon

TODO Beacon is built and maintained by a single person in their spare time. If it's saving you the trouble of juggling two TODO tools, here's how a couple of minutes of your time helps a lot:

- ⭐ [Star the repo on GitHub](https://github.com/Langenhorst-IT-Solutions/TODO-Beacon-Extension) — makes it easier for others to discover.
- 📝 [Leave a review on the Marketplace](https://marketplace.visualstudio.com/items?itemName=Langenhorst-IT-Solutions.todo-beacon&ssr=false#review-details) — even a short one helps a lot at this stage.
- 🐛 [Open an issue](https://github.com/Langenhorst-IT-Solutions/TODO-Beacon-Extension/issues) — bug reports and feature requests both genuinely shape what gets built next.

## License

[MIT](LICENSE)
