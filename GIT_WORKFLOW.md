# Git Workflow - Preventing Divergence

## 🚨 CRITICAL RULE: Local and Remote Must Stay in Sync

**Local and remote repositories MUST always be in sync. Divergence is not acceptable.**

---

## Pre-Push Hook Protection

A git pre-push hook has been installed that will **prevent you from pushing if your branch has diverged** from the remote. This prevents accidental force pushes and divergence.

The hook will:
- ✅ **Allow** pushes when local is ahead (normal case)
- ✅ **Allow** pushes when branches are in sync
- ❌ **Block** pushes when local is behind remote
- ❌ **Block** pushes when branches have diverged

---

## Standard Workflow (MUST FOLLOW)

### Before Making Changes

```bash
# 1. Always pull latest from remote first
git pull origin portal-brain-v1

# 2. Verify you're up to date
git status
```

### Making Changes

```bash
# 1. Create a feature branch (recommended) or work on main branch
git checkout portal-brain-v1

# 2. Make your changes
# ... edit files ...

# 3. Stage changes
git add .

# 4. Commit with clear message
git commit -m "Descriptive commit message"

# 5. Push to remote
git push origin portal-brain-v1
```

### Daily Workflow

```bash
# Start of day/work session:
cd /Users/nolanterry/portal-brain
git pull origin portal-brain-v1
git status

# After making changes:
git add .
git commit -m "Clear description of changes"
git push origin portal-brain-v1

# End of day/work session:
git push origin portal-brain-v1  # Ensure everything is pushed
```

---

## If You See "Diverged" Error

The pre-push hook will block you if branches have diverged. Here's how to fix:

### Option 1: Pull and Merge (Standard Fix)

```bash
# 1. Pull remote changes
git pull origin portal-brain-v1 --no-rebase

# 2. Resolve any conflicts if they occur
# Edit conflicted files, then:
git add <resolved-files>
git commit -m "Merge remote changes"

# 3. Push
git push origin portal-brain-v1
```

### Option 2: Rebase (Cleaner History)

```bash
# 1. Rebase your local commits on top of remote
git pull origin portal-brain-v1 --rebase

# 2. Resolve conflicts if needed (same as above)

# 3. Push
git push origin portal-brain-v1
```

### Option 3: Force Push (ONLY IF ABSOLUTELY CERTAIN)

**⚠️ Only use this if you're 100% certain the remote has wrong/old code.**

```bash
# This will overwrite the remote branch
git push origin portal-brain-v1 --force
```

**Warning**: Force push should be extremely rare. If you're using it frequently, you're doing something wrong.

---

## Checking Sync Status

Before pushing, always check:

```bash
# See if you're ahead/behind/diverged
git status

# See commit differences
git log HEAD..origin/portal-brain-v1  # Commits on remote you don't have
git log origin/portal-brain-v1..HEAD  # Commits you have that remote doesn't
```

---

## Best Practices

1. **Always pull before starting work** - Ensures you start from latest code
2. **Commit frequently** - Small, focused commits are easier to sync
3. **Push regularly** - Don't let local get too far ahead
4. **Never force push unless absolutely necessary** - It's a sign of workflow problems
5. **Check status before push** - `git status` shows if you need to pull
6. **One person works on branch at a time** - If multiple people, use feature branches

---

## If Working with Multiple People

If multiple people work on the same branch:

1. **Use feature branches** - Create branches for features, merge via PR
2. **Pull before push always** - Others may have pushed
3. **Communicate** - Let team know before force pushing (should be rare)
4. **Use PRs** - Review before merging to main branch

---

## Quick Reference

```bash
# Start work
git pull origin portal-brain-v1

# Check status
git status

# Make changes, then:
git add .
git commit -m "Message"
git push origin portal-brain-v1

# If blocked by hook (diverged):
git pull origin portal-brain-v1 --no-rebase
# Resolve conflicts, then:
git add .
git commit -m "Merge remote"
git push origin portal-brain-v1
```

---

## Reminder

**The pre-push hook will prevent divergence automatically. Follow the standard workflow above to avoid issues.**

If you find yourself constantly needing to force push or merge, stop and review your workflow - something is wrong.
