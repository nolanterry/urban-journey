# Git Safeguards - Preventing Divergence

## ✅ Safeguards Installed

I've implemented multiple safeguards to ensure local and remote repositories stay in sync:

### 1. Pre-Push Hook (`.git/hooks/pre-push`)

**Automatically blocks pushes when branches have diverged.**

The hook will:
- ✅ **Allow** normal pushes (local ahead of remote)
- ✅ **Allow** pushes when branches are in sync
- ❌ **Block** pushes when local is behind remote
- ❌ **Block** pushes when branches have diverged

**This prevents accidental force pushes and divergence automatically.**

### 2. Sync Check Script (`scripts/check-sync.sh`)

Run before pushing to check status:
```bash
npm run git:sync-check
# or
./scripts/check-sync.sh
```

Shows:
- ✅ If branches are in sync
- ⚠️ If local is behind (needs pull)
- ✅ If local is ahead (safe to push)
- ❌ If branches have diverged (needs merge)

### 3. NPM Scripts

Added to `package.json`:
- `npm run git:sync-check` - Check sync status
- `npm run git:pull` - Pull latest from remote
- `npm run git:status` - Show git status

### 4. Workflow Documentation

Created `GIT_WORKFLOW.md` with:
- Standard workflow procedures
- How to fix divergence issues
- Best practices
- Quick reference commands

---

## How It Works

### Pre-Push Hook Logic

1. **Before every push**, the hook runs automatically
2. Fetches latest from remote
3. Compares local and remote commit hashes
4. If diverged or local is behind → **BLOCKS push** with helpful error message
5. If local is ahead or in sync → **ALLOWS push**

### Bypassing the Hook (Not Recommended)

If you absolutely must force push (should be extremely rare):

```bash
# Bypass the hook (not recommended)
git push origin portal-brain-v1 --force --no-verify
```

**⚠️ Warning**: Only use `--no-verify` if you're 100% certain. If you're using it frequently, your workflow is wrong.

---

## Testing the Safeguards

### Test 1: Normal Push (Should Work)

```bash
# Make a small change
echo "# test" >> README.md
git add README.md
git commit -m "Test commit"
git push origin portal-brain-v1  # Should succeed
```

### Test 2: Diverged Push (Should Be Blocked)

```bash
# Simulate divergence by making a commit, then resetting
git commit --allow-empty -m "Test"
git reset HEAD~1
# Now try to push (should be blocked by hook)
git push origin portal-brain-v1  # Should fail with error message
```

---

## Workflow Enforcement

The pre-push hook enforces this workflow:

```
1. git pull origin portal-brain-v1  ← Always start here
2. Make changes
3. git add .
4. git commit -m "Message"
5. git push origin portal-brain-v1  ← Hook checks here
```

**If step 5 fails → go back to step 1 (pull first).**

---

## Maintenance

The hook is stored in `.git/hooks/pre-push` and is:
- ✅ Part of your local repository
- ✅ Automatically runs on every push
- ✅ Does not need to be committed (git hooks are local)

**Note**: If you clone the repository fresh, you'll need to recreate the hook. Consider adding it to a `scripts/` directory and documenting it, or using a tool like `husky` to manage hooks (future improvement).

---

## Summary

**You now have automatic protection against divergence:**
- Pre-push hook blocks diverged pushes
- Sync check script for manual verification
- NPM scripts for convenience
- Documentation for reference

**This ensures local and remote stay in sync automatically. No more force push issues!**
