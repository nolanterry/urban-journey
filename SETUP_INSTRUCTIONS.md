# Setup Instructions - Single Directory

## ✅ Consolidation Complete!

All your code is now in **ONE location**:
```
/Users/nolanterry/portal-brain
```

## Next Steps

### 1. Navigate to the Directory

```bash
cd /Users/nolanterry/portal-brain
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment (if needed)

Your `.env.local` has been copied, but verify it has all required variables:

```bash
# Check if .env.local exists
ls -la .env.local

# If missing, copy from example
cp env.example .env.local
# Then edit .env.local with your values
```

### 4. Run Database Migrations

```bash
npm run db:migrate
npm run db:generate
```

### 5. Start Development Server

```bash
npm run dev
```

### 6. Test the Flow

1. Visit `http://localhost:3000`
2. Sign in with Clerk
3. Connect HubSpot
4. Run Profile
5. View Dictionary

## Important: Always Work From This Directory

From now on, **always** run commands from:
```bash
cd /Users/nolanterry/portal-brain
```

This is your **single source of truth** - no more confusion!

## Git Setup (Optional)

If you want to initialize git in this directory:

```bash
cd /Users/nolanterry/portal-brain
git init
git remote add origin https://github.com/nolanterry/urban-journey.git
git add .
git commit -m "Consolidate to single directory"
git branch -M portal-brain-v1
git push -u origin portal-brain-v1
```

## Clean Up Old Directories (Optional)

After verifying everything works in the new location, you can optionally remove the old directories:

```bash
# Only do this AFTER verifying the new location works!
# rm -rf /Users/nolanterry/.cursor/worktrees/project_apex/mqd
# rm -rf /Users/nolanterry/project_apex
```
