---
trigger: always_on
---

# GitHub Workflow

## Purpose

This repository uses a **feature-branch workflow**.

- `main` is the stable, tested branch.
- No teammate or coding agent may push directly to `main`.
- Each task is developed on its own branch.
- The maintainer reviews, tests, and merges Pull Requests into `main`.
- Coding agents such as Claude Code, OpenCode, Antigravity, and Codex must follow the same rules.

---

## Branch Structure

```text
main
├── feature/mapview
├── feature/login
├── feature/backend-api
├── fix/camera-crash
└── ...
```

Use task-based branch names:

```text
feature/<name>
fix/<name>
refactor/<name>
chore/<name>
```

Do not normally use teammate names for branches.

---

## Roles

### Maintainer

The maintainer owns `main`.

- Reviews Pull Requests.
- Tests changes before merging.
- Resolves or coordinates conflicts.
- Keeps `main` stable and demo-ready.

### Teammates

Teammates work only on their assigned feature/fix branches and submit Pull Requests.

### Coding Agents

Coding agents are treated like teammates.

They must not modify or push to `main` directly unless explicitly authorized by the maintainer.

---

## Starting a Task

Always start from the latest `main`:

```bash
git switch main
git pull origin main
git switch -c feature/<feature-name>
```

Verify:

```bash
git branch --show-current
git status
```

---

## Working

Check changes regularly:

```bash
git status
git diff
```

Keep changes focused on the assigned task.

Commit meaningful progress:

```bash
git add .
git commit -m "Add map coordinate transformation"
```

Push:

```bash
git push -u origin feature/<feature-name>
```

---

## When `main` Has Changed

Another teammate may merge changes while you are working.

**Before pulling/merging `main`, save your current work in a commit.**

```bash
git add .
git commit -m "WIP: save feature progress"
```

Then:

```bash
git fetch origin
git merge origin/main
```

Your existing commits are preserved. Git combines your work with the latest `main`.

If there are conflicts, resolve them on your feature branch, then:

```bash
git add .
git commit
```

Test everything and push:

```bash
git push
```

### Important

Do not replace your feature branch with `main`.

The goal is:

```text
main:             A ── B
                   feature/teammate:   P1 ── P2
```

After merging `main` into the feature branch:

```text
A ── B
   P1 ── P2
```

Both sets of changes are retained unless a conflict requires a decision.

---

## Pull Requests

When ready:

```text
feature/<name> → main
```

The Pull Request should briefly state:

- What changed.
- How it was tested.
- Any known issues.

The maintainer reviews and tests the PR before merging.

**Only the maintainer merges into `main`.**

---

## Coding Agent Rules

Before changing anything:

```bash
git branch --show-current
git status --short
```

If on `main`, create or switch to the appropriate feature branch.

Agents must:

- Stay on the assigned branch.
- Avoid unrelated changes.
- Preserve existing teammate work.
- Commit before synchronizing with `main`.
- Test changes before declaring the task complete.
- Push only the feature branch.
- Never directly push to `main`.
- Never expose or commit secrets such as `.env`, API keys, passwords, or tokens.

### Dangerous commands

Do not use these without explicit maintainer authorization:

```bash
git reset --hard
git clean -fd
git restore .
git push --force
git push --force-with-lease
git branch -D
```

Never use destructive commands to "fix" a conflict without first protecting existing work.

---

## Standard Workflow

```text
1. Pull latest main
       ↓
2. Create/switch feature branch
       ↓
3. Make changes
       ↓
4. Test
       ↓
5. Commit
       ↓
6. Push feature branch
       ↓
7. Create Pull Request
       ↓
8. Maintainer reviews + tests
       ↓
9. Maintainer merges into main
       ↓
10. Start next task from latest main
```

## Golden Rules

1. **Never work directly on `main`.**
2. **One task = one feature/fix branch.**
3. **Commit before synchronizing with `main`.**
4. **Merge `main` into your branch; don't replace your branch with `main`.**
5. **Never overwrite another teammate's work.**
6. **Never force-push without authorization.**
7. **Only the maintainer merges into `main`.**
8. **Test before merging.**
