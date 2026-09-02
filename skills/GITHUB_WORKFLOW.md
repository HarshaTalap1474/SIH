---
trigger: always_on
---

# GitHub & Team Workflow

## 1. Purpose & Repository Architecture

This repository uses a **domain-isolated, multi-tier branch workflow** to support concurrent UI, ML, and Hardware development without merge conflicts.

### Branch Hierarchy:

```text
main                               ──► 🔒 Production & Live Demo (Protected, Maintainer-only)
 └── staging                       ──► 🧪 Pre-Release Deployment & Integration Testing
      └── internal/prototype       ──► 🛠️ Main Prototype Hub (Integrates UI + ML + HD)
           ├── internal/prototype-UI   ──► 🎨 UI Team (Next.js, Three.js, HUD, CSS)
           ├── internal/prototype-ML   ──► 🧠 ML Team (TinyML, Python, Training, Inference)
           └── internal/prototype-HD   ──► ⚡ Hardware Team (ESP32, Sensors, Telemetry)
```

---

## 2. Golden Rules

1. **Never work directly on `main`**: `main` is production-only.
2. **Never push changes without authorization**: Always develop on your designated branch.
3. **Stay in your assigned folder**:
   - UI Team: `Internal Prototype/UI/`
   - ML Team: `Internal Prototype/ML Model/`
   - Hardware Team: `Internal Prototype/Hardware/`
4. **Commit before pulling**: Always run `git add . && git commit -m "WIP"` before running `git pull`.
5. **Never force-push (`git push --force`)**: This overwrites teammates' work.
6. **Only the maintainer promotes to `staging` and `main`**.

---

## 3. Team Roles

### Maintainer (Lead)
- Owns `main`, `staging`, and `internal/prototype`.
- Integrates domain sub-branches into `internal/prototype`.
- Broadcasts synchronized prototype builds back to sub-branches.
- Tests before promoting to `staging` or `main`.

### Teammates
- Work exclusively on their assigned branch:
  - UI Devs: `internal/prototype-UI`
  - ML Devs: `internal/prototype-ML`
  - Hardware Devs: `internal/prototype-HD`
- Push progress to their respective branch and notify the maintainer.

### Coding Agents (Antigravity, Claude Code, OpenCode, Codex)
- Must follow the exact same rules as human teammates.
- Must verify active branch with `git branch --show-current` before making changes.
- Never push to any branch without explicit user confirmation.

---

## 4. Starting a Task

### For UI Developers:
```bash
git switch internal/prototype-UI
git pull origin internal/prototype-UI
```

### For ML Developers:
```bash
git switch internal/prototype-ML
git pull origin internal/prototype-ML
```

### For Hardware Developers:
```bash
git switch internal/prototype-HD
git pull origin internal/prototype-HD
```

### For Integrated Prototype (Lead):
```bash
git switch internal/prototype
git pull origin internal/prototype
```

---

## 5. Daily Working & Committing Routine

### Step 1: Check status regularly
```bash
git status
git diff
```

### Step 2: Commit meaningful progress
```bash
git add .
git commit -m "feat(ui): add radar ray visualization"
```

### Step 3: Push to your assigned branch
```bash
git push origin <your-assigned-branch>
```
*(e.g., `git push origin internal/prototype-UI`)*

---

## 6. Synchronizing When Teammates Make Changes

Before pulling latest updates from remote:

1. **Save current local work first**:
   ```bash
   git add .
   git commit -m "WIP: save local progress"
   ```

2. **Pull latest branch changes**:
   ```bash
   git pull origin <your-assigned-branch>
   ```

3. **If conflicts occur**:
   - Open conflict files in VS Code.
   - Choose the correct incoming/current changes.
   - Save, commit, and push:
     ```bash
     git add .
     git commit -m "fix(merge): resolve merge conflict"
     git push origin <your-assigned-branch>
     ```

---

## 7. Maintainer Integration Playbook

### Task A: Merging a Teammate's Feature into `internal/prototype`
```powershell
git checkout internal/prototype
git pull origin internal/prototype
git merge origin/internal/prototype-UI
git push origin internal/prototype
```

### Task B: Broadcasting Synchronized Updates to All Sub-Branches
```powershell
# UI Branch
git checkout internal/prototype-UI
git merge internal/prototype
git push origin internal/prototype-UI

# ML Branch
git checkout internal/prototype-ML
git merge internal/prototype
git push origin internal/prototype-ML

# Hardware Branch
git checkout internal/prototype-HD
git merge internal/prototype
git push origin internal/prototype-HD

# Return to Prototype Hub
git checkout internal/prototype
```

### Task C: Promoting to `staging` and `main` (When Demo-Ready)
```powershell
# 1. Merge into Staging
git checkout staging
git merge internal/prototype
git push origin staging

# 2. Promote Staging to Main (Rebase for clean production log)
git checkout main
git rebase staging
git push origin main

# 3. Return to Prototype Hub
git checkout internal/prototype
```

---

## 8. Dangerous Commands (Strictly Forbidden Without Approval)
- ❌ `git reset --hard`
- ❌ `git clean -fd`
- ❌ `git restore .`
- ❌ `git push --force` or `git push -f`
- ❌ `git branch -D`
