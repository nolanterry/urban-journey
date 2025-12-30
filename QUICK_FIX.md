# Quick Fix: HubSpot Connection Issue

## The Problem

Your `.env.local` file has placeholder values instead of real HubSpot credentials.

## Quick Fix (2 minutes)

### 1. Get Your HubSpot Credentials

1. Go to: https://app.hubspot.com/settings/account/developer
2. Click **OAuth Apps** → **Create app**
3. Set **Redirect URI**: `http://localhost:3000/api/auth/hubspot/callback`
4. Add scope: `crm.objects.deals.read`
5. Copy the **Client ID** and **Client Secret**

### 2. Update `.env.local`

Open `/Users/nolanterry/portal-brain/.env.local` and replace:

```bash
# Change this:
HUBSPOT_CLIENT_ID="your-hubspot-client-id"
HUBSPOT_CLIENT_SECRET="your-hubspot-client-secret"

# To this (use your actual values):
HUBSPOT_CLIENT_ID="your-actual-client-id-here"
HUBSPOT_CLIENT_SECRET="your-actual-client-secret-here"
```

### 3. Restart Server

```bash
# Stop server (Ctrl+C if running)
cd /Users/nolanterry/portal-brain
npm run dev
```

### 4. Test Again

Visit `http://localhost:3000` and try connecting HubSpot again.

---

**That's it!** The connection should work now.
