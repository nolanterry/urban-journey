# Start Here - Quick Setup

## ⚠️ IMPORTANT: Use the Correct Directory

You must run all commands from the **mqd worktree directory**:

```bash
cd /Users/nolanterry/.cursor/worktrees/project_apex/mqd
```

## Quick Setup Steps

From the correct directory (`/Users/nolanterry/.cursor/worktrees/project_apex/mqd`):

```bash
# 1. Navigate to correct directory
cd /Users/nolanterry/.cursor/worktrees/project_apex/mqd

# 2. Install dependencies
npm install

# 3. Set up environment (if not already done)
cp env.example .env.local
# Edit .env.local with your values

# 4. Run database migrations
npm run db:migrate

# 5. Generate Prisma client
npm run db:generate

# 6. Start development server
npm run dev
```

## Verify You're in the Right Place

The directory should contain:
- ✅ `prisma/schema.prisma` file
- ✅ `src/` directory
- ✅ `package.json` file
- ✅ `.env.local` file (after setup)

If these files are missing, you're in the wrong directory!
