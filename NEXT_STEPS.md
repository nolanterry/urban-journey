# Next Steps - Getting Portal Brain Running

This document outlines the immediate next steps to get Portal Brain up and running.

## ✅ Current Status

The application is fully implemented with:
- ✅ OAuth flow for HubSpot connection (UI already has "Connect HubSpot" button)
- ✅ Authentication with Clerk
- ✅ Database schema and migrations
- ✅ Field usage statistics computation
- ✅ Dictionary UI
- ✅ All Phase 2 features complete

## 🚀 Quick Start Checklist

### 1. Set Up Environment Variables (5 minutes)

Create `.env.local` file in the project root:

```bash
cp env.example .env.local
```

Then fill in these values:

#### Required for Local Development:

1. **DATABASE_URL**
   - Get from Neon Console or your Postgres provider
   - Format: `postgresql://user:password@host:5432/dbname?sslmode=require`

2. **CLERK_SECRET_KEY** and **NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY**
   - Go to https://dashboard.clerk.com
   - Create/select an application
   - Copy keys from "API Keys" section

3. **HUBSPOT_CLIENT_ID** and **HUBSPOT_CLIENT_SECRET**
   - Go to https://app.hubspot.com/settings/account/developer
   - Create a new OAuth app
   - Set redirect URI: `http://localhost:3000/api/auth/hubspot/callback`
   - Copy Client ID and Client Secret

4. **OAUTH_REDIRECT_URI**
   - Set to: `http://localhost:3000/api/auth/hubspot/callback`

5. **APP_BASE_URL**
   - Set to: `http://localhost:3000`

6. **TOKEN_ENCRYPTION_KEY**
   - Generate: `openssl rand -hex 32`
   - This must be exactly 64 hex characters (32 bytes)

### 2. Install Dependencies (1 minute)

```bash
npm install
```

### 3. Set Up Database (2 minutes)

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations to create tables
npm run db:migrate
```

### 4. Start Development Server (30 seconds)

```bash
npm run dev
```

### 5. Test the Flow (5 minutes)

1. **Visit** `http://localhost:3000`
   - You should see the landing page with "Sign In" button

2. **Sign In** with Clerk
   - Click "Sign In" button
   - Clerk will prompt you to sign up/sign in
   - After authentication, you'll be redirected to `/overview`

3. **Connect HubSpot**
   - On the Overview page, you'll see "Connection Status: disconnected"
   - Click the blue "Connect HubSpot" button
   - You'll be redirected to HubSpot to authorize the app
   - After authorization, you'll be redirected back
   - Status should now show "connected"

4. **Run Profile**
   - Click the "Run Profile" button
   - This will:
     - Fetch deal properties, pipelines, and deals
     - Compute field usage statistics
     - Calculate tiers and scores
   - Wait for it to complete (check the "Latest Run" section)

5. **View Dictionary**
   - Navigate to "Dictionary" in the top nav
   - You should see field usage statistics, tiers, and metrics

## 🔍 Testing Checklist

After setup, verify these work:

- [ ] Can sign in with Clerk
- [ ] Can see Overview page after sign-in
- [ ] "Connect HubSpot" button appears when disconnected
- [ ] OAuth redirect to HubSpot works
- [ ] Can authorize HubSpot app
- [ ] Redirects back to app successfully
- [ ] Connection status shows "connected"
- [ ] "Run Profile" button is enabled
- [ ] Profile run completes successfully
- [ ] Stats appear in Overview page
- [ ] Dictionary page loads with field data
- [ ] Can filter/sort fields in Dictionary

## 🐛 Common Issues & Solutions

### Issue: "redirect_uri_mismatch" Error

**Problem**: HubSpot OAuth redirect URI doesn't match

**Solution**: 
- Ensure redirect URI in HubSpot OAuth app settings exactly matches `OAUTH_REDIRECT_URI` in `.env.local`
- Must include protocol (`http://`), port (`:3000`), and full path (`/api/auth/hubspot/callback`)

### Issue: Database Connection Fails

**Problem**: Can't connect to database

**Solution**:
- Verify `DATABASE_URL` is correct
- Check if database allows connections from your IP (for Neon, check IP allowlist)
- Ensure SSL is enabled in connection string (`?sslmode=require`)

### Issue: Clerk Authentication Not Working

**Problem**: Can't sign in or authentication errors

**Solution**:
- Verify both `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are set
- Check Clerk dashboard for any configuration issues
- Ensure Clerk middleware is working (check `src/middleware.ts`)

### Issue: Profile Run Fails

**Problem**: Profile run shows error or fails

**Solution**:
- Check the "Runs" page for detailed error messages
- Verify HubSpot tokens are valid (try disconnecting and reconnecting)
- Check HubSpot app has correct scopes (`crm.objects.deals.read`)
- Review browser console and server logs for specific errors

### Issue: Token Encryption Error

**Problem**: "Invalid key length" or encryption errors

**Solution**:
- Ensure `TOKEN_ENCRYPTION_KEY` is exactly 64 hex characters (32 bytes)
- Regenerate with: `openssl rand -hex 32`

## 📝 UI Flow Overview

```
Landing Page (/) 
  ↓ Sign In
Overview Page (/overview)
  ↓ Click "Connect HubSpot"
HubSpot OAuth Authorization
  ↓ Authorize
Callback Handler (/api/auth/hubspot/callback)
  ↓ Store tokens, redirect
Overview Page (connected)
  ↓ Click "Run Profile"
Profile Run (API: /api/profile/run)
  ↓ Job completes
Overview Page (with stats)
  ↓ Navigate to Dictionary
Dictionary Page (/dictionary)
  - View field usage statistics
  - Filter by tier
  - Sort by score/fill rate
```

## 🎯 What to Do Next

1. **Complete Setup**: Follow the checklist above
2. **Test End-to-End**: Run through the full user flow
3. **Review Data**: Check that field statistics look correct
4. **Deploy to Production**: See SETUP.md for Vercel deployment steps

## 📚 Additional Resources

- **Detailed Setup**: See [SETUP.md](./SETUP.md)
- **Architecture**: See [README.md](./README.md)
- **Codebase**: Review the code structure in `src/`

## 💡 Tips

- Use `npm run db:studio` to inspect your database visually
- Check server logs in terminal for detailed error messages
- Use browser DevTools Network tab to debug API calls
- HubSpot OAuth tokens expire, but refresh happens automatically
- You can pause processing in Settings if needed
