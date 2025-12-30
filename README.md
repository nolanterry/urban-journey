# Portal Brain

**Your single source of truth - everything is in this directory!**

## Quick Start

```bash
# 1. Navigate here (this is your main directory)
cd /Users/nolanterry/portal-brain

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

## Important: Always Work From This Directory

All commands should be run from:
```
/Users/nolanterry/portal-brain
```

This is your **single, consolidated directory** - no more confusion about multiple locations!

## Testing the Flow

1. Visit `http://localhost:3000`
2. Sign in with Clerk
3. Connect HubSpot
4. Run Profile
5. View Dictionary

See `QUICK_START_TEST.md` for detailed testing instructions.
