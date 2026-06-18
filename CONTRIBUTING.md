# Contributing to TODO Beacon

Thanks for considering a contribution. This document covers how commits, releases, and branches work in this repo.

## Commit messages — Conventional Commits

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/): `type(scope): description`. The type drives both the version bump and the changelog section it ends up in:

| Type | Shows up as | Version bump |
| --- | --- | --- |
| `feat` | ✨ New Features | minor |
| `fix` | 🐛 Bug Fixes | patch |
| `perf` | ⚡ Performance Improvements | patch |
| `revert` | ⏪ Reverts | patch |
| `docs`, `style`, `chore`, `refactor`, `test`, `build`, `ci` | hidden (internal, not user-facing) | none |

### Marking something deprecated or removed

Deprecating something is **not** a breaking change by itself — the thing still works, you're just announcing it will go away. Add a `DEPRECATED:` footer to a normal commit:

```
feat(config): replace todo-beacon.oldSetting with todo-beacon.newSetting

DEPRECATED: todo-beacon.oldSetting is deprecated, use todo-beacon.newSetting instead
```

Actually removing something **is** a breaking change — use `!` after the type (forces a major version bump) and add a `REMOVED:` footer so it gets its own changelog section:

```
feat!: drop support for VS Code < 1.90

REMOVED: dropped compatibility shims for VS Code versions older than 1.90
```

## Changelog

`CHANGELOG.md` is generated automatically by [semantic-release](https://semantic-release.gitbook.io/) from commit messages on every release — don't edit it by hand except to curate wording on an already-released entry. The structure is inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/): features map to "Added", fixes to "Fixed", and `DEPRECATED`/`REMOVED`/`BREAKING CHANGE` footers get their own sections.

## Branching model

This repo follows [Git Flow](https://danielkummer.github.io/git-flow-cheatsheet/index.html) with one deliberate exception: releases are a maintainer-only action.

- **`main`** — stable, released code. Only the maintainer (repo owner) pushes to or merges into `main`, with or without a PR.
- **`dev`** — integration branch for the next release. Anyone who isn't a maintainer must open a pull request against `dev`; direct pushes by non-maintainers are blocked by branch protection.
- **Feature/fix branches** — branch off `dev`, open a PR back into `dev`. PRs need the `Lint & Test` status check to pass and a maintainer's approval before merging.
- **Release Candidates** — published from `dev` via the `Release RC` GitHub Actions workflow. This workflow is `workflow_dispatch`-only and is triggered exclusively by the maintainer.
- **Stable releases** — published automatically by CI whenever the maintainer pushes/merges to `main`. Right after the release commit lands on `main`, CI merges it straight back into `dev` (no PR needed for this step — it only ever replays a commit that was already reviewed and released on `main`), so `dev` never drifts behind the latest release.

## Local setup

```sh
npm install
npm test              # run the test suite
npm run coverage      # run tests with a coverage report
```
