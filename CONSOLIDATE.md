# Consolidate to Single Directory

## Current Situation

You have code in two locations:
1. `/Users/nolanterry/project_apex/` - Older/incomplete version
2. `/Users/nolanterry/.cursor/worktrees/project_apex/mqd/` - Complete version (worktree)

## Solution: Consolidate to One Directory

We'll copy everything from the worktree (complete version) to a simple location.

### Option 1: Use `/Users/nolanterry/portal-brain` (Recommended)

```bash
# 1. Create new directory
cd /Users/nolanterry
mkdir -p portal-brain

# 2. Copy everything from worktree (excluding .git, node_modules, .next)
cd /Users/nolanterry/.cursor/worktrees/project_apex/mqd
rsync -av --exclude='.git' --exclude='node_modules' --exclude='.next' --exclude='.env*' . /Users/nolanterry/portal-brain/

# 3. Copy .env.local separately (if you want to keep it)
cp .env.local /Users/nolanterry/portal-brain/.env.local

# 4. Initialize fresh git repo (or copy git history)
cd /Users/nolanterry/portal-brain
git init
git remote add origin https://github.com/nolanterry/urban-journey.git
git add .
git commit -m "Consolidate to single directory"
git branch -M portal-brain-v1
git push -u origin portal-brain-v1

# 5. Install dependencies
npm install

# 6. You're done! Work from /Users/nolanterry/portal-brain
```

### Option 2: Replace `/Users/nolanterry/project_apex` (If you prefer this location)

```bash
# 1. Backup old directory (optional)
cd /Users/nolanterry
mv project_apex project_apex.backup

# 2. Copy everything from worktree
cd /Users/nolanterry/.cursor/worktrees/project_apex/mqd
rsync -av --exclude='.git' --exclude='node_modules' --exclude='.next' --exclude='.env*' . /Users/nolanterry/project_apex/

# 3. Copy .env.local
cp .env.local /Users/nolanterry/project_apex/.env.local

# 4. Initialize git
cd /Users/nolanterry/project_apex
git init
git remote add origin https://github.com/nolanterry/urban-journey.git
git add .
git commit -m "Consolidate to single directory"
git branch -M portal-brain-v1
git push -u origin portal-brain-v1

# 5. Install dependencies
npm install

# 6. You're done! Work from /Users/nolanterry/project_apex
```

## After Consolidation

Once consolidated, you'll have ONE directory to work from:

```bash
# Always work from this directory
cd /Users/nolanterry/portal-brain  # or project_apex if you chose Option 2

# Run commands normally
npm run dev
npm run db:migrate
# etc.
```

## Clean Up (Optional)

After consolidating and verifying everything works:

```bash
# Remove the old worktree (optional, only after verifying new location works)
rm -rf /Users/nolanterry/.cursor/worktrees/project_apex/mqd

# Remove old project_apex if you used Option 1 (optional)
rm -rf /Users/nolanterry/project_apex
```
