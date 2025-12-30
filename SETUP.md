# Portal Brain Setup Guide

This guide walks you through setting up and deploying Portal Brain.

## Prerequisites

- Node.js 18+ installed
- A HubSpot account with Developer access
- A Clerk account (for authentication)
- A Neon Postgres database (or any Postgres database)
- A Vercel account (for deployment, recommended)

## Step 1: Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# HubSpot OAuth App
HUBSPOT_CLIENT_ID=your_client_id
HUBSPOT_CLIENT_SECRET=your_client_secret
OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/hubspot/callback

# App Configuration
APP_BASE_URL=http://localhost:3000

# Token Encryption (generate a secure 32-byte key)
TOKEN_ENCRYPTION_KEY=your_32_byte_hex_key_here
```

### Generating TOKEN_ENCRYPTION_KEY

Generate a secure 32-byte key:

```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Using OpenSSL
openssl rand -hex 32
```

### Getting Clerk Keys

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application or select an existing one
3. Go to **API Keys** in the sidebar
4. Copy the **Publishable Key** and **Secret Key**

### Creating HubSpot OAuth App

1. Go to [HubSpot Developer Account](https://app.hubspot.com/settings/account/developer)
2. Navigate to **Private Apps** or **OAuth Apps** (for public OAuth app)
3. Create a new OAuth app:
   - **App Name**: Portal Brain (or your preferred name)
   - **Redirect URI**: `http://localhost:3000/api/auth/hubspot/callback` (for local dev)
   - **Scopes**: 
     - `crm.objects.deals.read` (required for Phase 1)
   - Save and note the **Client ID** and **Client Secret**

## Step 2: Database Setup

1. **Create a Neon database** (or use your Postgres database):
   - Go to [Neon Console](https://console.neon.tech)
   - Create a new project
   - Copy the connection string (should look like `postgresql://user:password@host.neon.tech/dbname?sslmode=require`)

2. **Run migrations**:
   ```bash
   npm install
   npm run db:migrate
   ```

   This will create all the necessary tables.

3. **Verify schema** (optional):
   ```bash
   npm run db:studio
   ```
   This opens Prisma Studio where you can view your database.

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Generate Prisma Client

```bash
npm run db:generate
```

## Step 5: Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Step 6: First-Time Setup Flow

1. **Visit the app**: Navigate to `http://localhost:3000`
   - You'll be redirected to Clerk sign-in (if not authenticated)
   - Sign up or sign in with Clerk

2. **Connect HubSpot**:
   - After authentication, you'll see the Overview page
   - If HubSpot is not connected, click "Connect HubSpot"
   - You'll be redirected to HubSpot to authorize the app
   - After authorization, you'll be redirected back to the app

3. **Run First Profile**:
   - Once connected, click "Run Profile" button
   - This will:
     - Fetch deal properties metadata
     - Fetch pipeline/stage metadata
     - Fetch deals (paged)
     - Compute field usage statistics (Phase 2)
     - Calculate tiers and scores (Phase 2)

4. **Explore the Dictionary**:
   - Navigate to the "Dictionary" page to see field usage statistics
   - Filter by tier, sort by score or fill rate
   - View Tier A (high-value) and Tier C (low-value) fields

## Production Deployment (Vercel)

1. **Push code to GitHub**

2. **Deploy to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Configure environment variables (all the ones from `.env.local`)

3. **Update HubSpot OAuth Redirect URI**:
   - In HubSpot OAuth app settings, add your production redirect URI:
     `https://your-domain.vercel.app/api/auth/hubspot/callback`
   - Update `OAUTH_REDIRECT_URI` in Vercel environment variables

4. **Update APP_BASE_URL**:
   - Set `APP_BASE_URL` to your production URL (e.g., `https://your-domain.vercel.app`)

5. **Deploy**: Vercel will automatically deploy on every push to main branch

## Troubleshooting

### OAuth Redirect URI Mismatch

**Error**: "redirect_uri_mismatch"

**Solution**: Ensure the redirect URI in HubSpot OAuth app settings exactly matches `OAUTH_REDIRECT_URI` in your environment variables (including protocol, port, and path).

### Database Connection Errors

**Error**: "Can't reach database server"

**Solution**:
- Verify `DATABASE_URL` is correct
- Check if your database allows connections from your IP (for Neon, check IP allowlist)
- Ensure SSL is enabled (`?sslmode=require` in connection string)

### Clerk Authentication Issues

**Error**: "Invalid API key" or authentication not working

**Solution**:
- Verify `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are correct
- Ensure Clerk middleware is properly configured (check `src/middleware.ts`)
- Check Clerk dashboard for any configuration issues

### Token Encryption Errors

**Error**: "Invalid encryption key length"

**Solution**:
- Ensure `TOKEN_ENCRYPTION_KEY` is exactly 32 bytes (64 hex characters)
- Regenerate the key using the command in Step 1

### Profile Run Fails

**Error**: Profile run fails or shows errors

**Solution**:
- Check the "Runs" page to see detailed error messages
- Verify HubSpot tokens are valid (try disconnecting and reconnecting)
- Check that the HubSpot app has the correct scopes
- Review logs for specific API errors

## Next Steps After Setup

1. **Test the OAuth flow**: Ensure users can connect their HubSpot accounts
2. **Run a profile**: Verify data ingestion works correctly
3. **Check the Dictionary**: Confirm field statistics are computed
4. **Review Settings**: Explore the settings page (pause functionality)

## Security Checklist

- ✅ Tokens are encrypted at rest using `TOKEN_ENCRYPTION_KEY`
- ✅ OAuth state validation with timestamp expiration
- ✅ All secrets are stored in environment variables (never commit `.env.local`)
- ✅ HTTPS is used in production (Vercel automatically provides this)
- ✅ Database connection uses SSL (`sslmode=require`)
- ✅ Clerk handles authentication securely
- ✅ All logging redacts sensitive information
