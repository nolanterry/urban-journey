# HubSpot OAuth Setup - Fix Connection Issues

## Problem

The error shows `your-hubspot-client-id` in the URL, which means your `.env.local` still has placeholder values.

## Solution: Get Your Real HubSpot Credentials

### Step 1: Create HubSpot OAuth App

1. Go to [HubSpot Developer Account](https://app.hubspot.com/settings/account/developer)
2. Navigate to **OAuth Apps** (or **Private Apps** if using private app)
3. Click **Create app** or **Create OAuth app**
4. Fill in:
   - **App Name**: Portal Brain (or your preferred name)
   - **Redirect URI**: `http://localhost:3000/api/auth/hubspot/callback` (must match exactly)
   - **Scopes**: 
     - ✅ `crm.objects.deals.read` (required)
   - Click **Create**

### Step 2: Get Your Credentials

After creating the app, you'll see:
- **Client ID** (looks like: `abc12345-def6-7890-ghij-klmnopqrstuv`)
- **Client Secret** (looks like: `xyz98765-wvu4-3210-tsrq-ponmlkjihgfed`)

**Important**: Copy these values exactly as shown.

### Step 3: Update `.env.local`

Edit `/Users/nolanterry/portal-brain/.env.local` and replace the placeholder values:

```bash
# Replace these lines:
HUBSPOT_CLIENT_ID="your-hubspot-client-id"
HUBSPOT_CLIENT_SECRET="your-hubspot-client-secret"

# With your actual values (no quotes needed, but quotes are fine):
HUBSPOT_CLIENT_ID="abc12345-def6-7890-ghij-klmnopqrstuv"
HUBSPOT_CLIENT_SECRET="xyz98765-wvu4-3210-tsrq-ponmlkjihgfed"
```

### Step 4: Verify Redirect URI

**Critical**: The redirect URI in HubSpot must match **exactly**:

```
http://localhost:3000/api/auth/hubspot/callback
```

Check in HubSpot OAuth app settings that this is set correctly.

### Step 5: Restart Dev Server

After updating `.env.local`, restart your dev server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
cd /Users/nolanterry/portal-brain
npm run dev
```

**Important**: Next.js caches environment variables, so you MUST restart the server after changing `.env.local`.

## Verify It's Working

1. Restart dev server
2. Visit `http://localhost:3000`
3. Sign in
4. Click "Connect HubSpot"
5. Should redirect to HubSpot OAuth page (not showing `your-hubspot-client-id`)

## Common Issues

### Issue: Still seeing `your-hubspot-client-id` in URL

**Solution**:
- Verify `.env.local` has real values (not placeholders)
- Restart dev server (environment variables are cached)
- Check for typos in variable names

### Issue: "redirect_uri_mismatch" error

**Solution**:
- Verify redirect URI in HubSpot app settings is exactly: `http://localhost:3000/api/auth/hubspot/callback`
- Check `.env.local` has: `OAUTH_REDIRECT_URI="http://localhost:3000/api/auth/hubspot/callback"`
- Must match character-for-character (including `http://` not `https://` for localhost)

### Issue: "Invalid client_id" error

**Solution**:
- Verify Client ID is correct (no extra spaces, copied completely)
- Check Client ID in HubSpot app settings matches what's in `.env.local`

### Issue: Environment variables not loading

**Solution**:
- Ensure file is named `.env.local` (not `.env` or `env.local`)
- File must be in project root (`/Users/nolanterry/portal-brain/.env.local`)
- Restart dev server after changes
- Check Next.js console shows "Environments: .env.local" when starting

## Quick Check Command

Verify your environment variables are set:

```bash
cd /Users/nolanterry/portal-brain
grep HUBSPOT_CLIENT_ID .env.local
# Should show your actual client ID, not "your-hubspot-client-id"
```
