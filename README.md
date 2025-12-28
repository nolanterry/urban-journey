# Portal Brain

**Portal Brain v1** - A read-only, deterministic, auditable HubSpot portal understanding layer.

## Overview

Portal Brain is a Phase 1 "Observer" system that reads HubSpot data, stores it deterministically, and provides audit trails. It does not modify HubSpot data, trigger automation, or use AI for inference (only for explanation/summarization in later phases).

## Tech Stack

- **Frontend**: Next.js 14+ (App Router) + TypeScript
- **Backend**: Next.js API Routes (TypeScript)
- **Database**: Neon Postgres
- **ORM**: Prisma
- **Authentication**: Clerk
- **HubSpot**: Public OAuth app (multi-tenant)
- **Deployment**: Vercel

## Prerequisites

- Node.js 18+ and npm
- A Neon Postgres database
- A Clerk account
- A HubSpot account with OAuth app credentials

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Neon Database Setup

1. Create a Neon account at https://neon.tech
2. Create a new project and database
3. Copy the connection string (it will look like: `postgresql://user:password@host.neon.tech/dbname?sslmode=require`)
4. Add it to your `.env` file as `DATABASE_URL`

### 3. Run Database Migrations

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate
```

### 4. Clerk Setup

1. Create a Clerk account at https://clerk.com
2. Create a new application
3. Copy the following from your Clerk dashboard:
   - **Publishable Key** (starts with `pk_test_` or `pk_live_`)
   - **Secret Key** (starts with `sk_test_` or `sk_live_`)
4. Add them to your `.env` file:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```
5. In Clerk dashboard, configure your application:
   - Add authorized redirect URLs (for local: `http://localhost:3000`)
   - Configure any additional authentication settings as needed

### 5. HubSpot OAuth App Setup

1. Go to https://app.hubspot.com and sign in
2. Navigate to **Settings** → **Integrations** → **Private Apps** (or **Public Apps**)
3. Create a new OAuth app
4. Configure the app:
   - **Redirect URI**: `http://localhost:3000/api/auth/hubspot/callback` (for local)
     - For production, use your production URL: `https://yourdomain.com/api/auth/hubspot/callback`
   - **Scopes**: Select `crm.objects.deals.read` (read-only access)
5. Copy the **Client ID** and **Client Secret**
6. Add them to your `.env` file:
   ```
   HUBSPOT_CLIENT_ID=your-client-id
   HUBSPOT_CLIENT_SECRET=your-client-secret
   OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/hubspot/callback
   APP_BASE_URL=http://localhost:3000
   ```

### 6. Token Encryption Key

Generate a secure encryption key for token storage:

```bash
# Generate a 32-byte hex key
openssl rand -hex 32
```

Add it to your `.env` file:
```
TOKEN_ENCRYPTION_KEY=your-generated-hex-key-here
```

**Important**: Keep this key secure. If you lose it, you'll need to re-authenticate all integrations.

### 7. Environment Variables

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Fill in all required variables:

```
# Database
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# Clerk Authentication
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."

# HubSpot OAuth
HUBSPOT_CLIENT_ID="your-hubspot-client-id"
HUBSPOT_CLIENT_SECRET="your-hubspot-client-secret"
OAUTH_REDIRECT_URI="http://localhost:3000/api/auth/hubspot/callback"
APP_BASE_URL="http://localhost:3000"

# Token Encryption (32+ bytes, hex encoded)
TOKEN_ENCRYPTION_KEY="your-32-byte-hex-encoded-key-here"

# OpenAI (for future Phase 2/3 use - explanation/summarization only)
OPENAI_API_KEY="sk-..."  # Optional for Phase 1
```

### 8. Run Locally

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Testing the OAuth Flow

1. Start the development server: `npm run dev`
2. Navigate to `http://localhost:3000`
3. Sign in with Clerk (create an account if needed)
4. You'll be redirected to the Overview page
5. Click "Connect HubSpot" (or navigate to `/api/auth/hubspot/install`)
6. You'll be redirected to HubSpot to authorize the app
7. After authorization, you'll be redirected back to the Overview page
8. The connection status should show "connected"
9. Click "Run Profile" to trigger a portal profiling job
10. Check the "Runs" page to see the profiling progress

## Deploying to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to https://vercel.com
2. Import your GitHub repository
3. Configure environment variables in Vercel dashboard (all the same ones from `.env`)
4. For production, update:
   - `OAUTH_REDIRECT_URI` to your Vercel domain: `https://your-app.vercel.app/api/auth/hubspot/callback`
   - `APP_BASE_URL` to your Vercel domain: `https://your-app.vercel.app`
   - Update HubSpot OAuth app redirect URI to match
5. Deploy

### 3. Post-Deployment

1. Run database migrations on production:
   ```bash
   # Connect to production and run migrations
   DATABASE_URL=<production-database-url> npm run db:migrate
   ```
   Or use Vercel's environment variables and run migrations locally pointing to production DB (not recommended for production, but works for initial setup).

2. Verify OAuth redirect URI is updated in HubSpot
3. Test the OAuth flow on production

## Common Errors and Troubleshooting

### "TOKEN_ENCRYPTION_KEY environment variable is required"

**Solution**: Make sure you've added `TOKEN_ENCRYPTION_KEY` to your `.env` file with a 32+ byte hex-encoded key.

### "No HubSpot integration found for tenant"

**Solution**: Make sure you've completed the OAuth flow. Navigate to `/api/auth/hubspot/install` to connect your HubSpot account.

### "Token refresh failed"

**Solution**: 
- Check that your HubSpot OAuth app is still active
- Verify `HUBSPOT_CLIENT_ID` and `HUBSPOT_CLIENT_SECRET` are correct
- You may need to re-authenticate by disconnecting and reconnecting HubSpot

### "Profiling is paused for this tenant"

**Solution**: The integration has `is_paused` set to `true`. Update it in the database or wait for Phase 2 settings UI to toggle this.

### Database connection errors

**Solution**:
- Verify `DATABASE_URL` is correct and accessible
- Check that your Neon database is running and not paused
- Ensure your IP is whitelisted if using Neon IP restrictions

### Clerk authentication errors

**Solution**:
- Verify `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` are correct
- Check that your Clerk application is active
- Verify redirect URLs are configured in Clerk dashboard

### Prisma Client not generated

**Solution**: Run `npm run db:generate` to generate the Prisma Client after schema changes.

## Project Structure

```
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/
│   │   ├── (authed)/          # Protected routes
│   │   │   ├── overview/      # Dashboard overview
│   │   │   ├── dictionary/    # CRM Dictionary (Phase 2)
│   │   │   ├── runs/          # Profile runs list
│   │   │   └── settings/      # Settings page
│   │   ├── (public)/          # Public routes
│   │   ├── api/               # API routes
│   │   │   ├── auth/hubspot/  # OAuth endpoints
│   │   │   └── profile/       # Profile endpoints
│   │   └── layout.tsx         # Root layout with ClerkProvider
│   ├── components/            # React components
│   ├── lib/                   # Shared utilities
│   │   └── tenant.ts          # Tenant resolution
│   ├── server/
│   │   ├── db/                # Database module
│   │   ├── hubspot/           # HubSpot client
│   │   ├── crypto/            # Token encryption
│   │   └── jobs/              # Background jobs
│   ├── types/                 # TypeScript types
│   └── middleware.ts          # Clerk middleware
└── README.md
```

## Phase 1 Features

- ✅ HubSpot OAuth integration
- ✅ Tenant creation and portal binding
- ✅ Token refresh and encryption at rest
- ✅ Deals data ingestion (paged)
- ✅ Raw deals JSON snapshots
- ✅ Deal properties and pipelines metadata
- ✅ Portal Profiler job skeleton
- ✅ Minimal dashboard pages
- ✅ Profile run history
- ✅ Read-only operations (no HubSpot writes)

## Next Steps (Phase 2)

- Deterministic field usage statistics computation
- Tier classification (A/B/C)
- Stage conversion metrics
- Time-in-stage analysis
- Stalled deal detection
- CRM Dictionary UI with computed insights

## Security Notes

- All OAuth tokens are encrypted at rest using AES-256-GCM
- All database queries are tenant-scoped
- No cross-tenant data access
- OAuth state parameter validation prevents CSRF
- Secrets are never logged
- Processing can be paused per-tenant

## License

[Your License Here]
