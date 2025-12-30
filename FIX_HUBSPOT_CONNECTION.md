# Fix HubSpot Connection Error

## The Problem

The error shows `your-hubspot-client-id` in the URL, which means your `.env.local` file still has placeholder values instead of real HubSpot OAuth credentials.

**Error in console**:
```
/api/apps-hublets/v2/external/applications/info/client-id/your-hubspot-client-id
```

This confirms `HUBSPOT_CLIENT_ID` is still the placeholder.

---

## Solution: Get Real HubSpot Credentials

### Step 1: Create HubSpot OAuth App

1. **Go to HubSpot Developer Settings**:
   - Visit: https://app.hubspot.com/settings/account/developer
   - Or: HubSpot → Settings (gear icon) → Integrations → Private Apps / OAuth Apps

2. **Create OAuth App**:
   - Click **"Create app"** or **"Create OAuth app"**
   - **App Name**: `Portal Brain` (or your preferred name)
   - **Redirect URI**: `http://localhost:3000/api/auth/hubspot/callback`
     - ⚠️ **CRITICAL**: Must match exactly (including `http://` not `https://`)
   - **Scopes**: 
     - ✅ `crm.objects.deals.read` (check this box)
   - Click **"Create"** or **"Save"**

3. **Get Your Credentials**:
   After creating, you'll see:
   - **Client ID** (looks like: `abc12345-def6-7890-ghij-klmnopqrstuv`)
   - **Client Secret** (looks like: `xyz98765-wvu4-3210-tsrq-ponmlkjihgfed`)
   
   **Copy both values** - you'll need them in the next step.

---

### Step 2: Update `.env.local`

**File location**: `/Users/nolanterry/portal-brain/.env.local`

**Find these lines**:
```bash
HUBSPOT_CLIENT_ID="your-hubspot-client-id"
HUBSPOT_CLIENT_SECRET="your-hubspot-client-secret"
```

**Replace with your actual values** (from Step 1):
```bash
HUBSPOT_CLIENT_ID="abc12345-def6-7890-ghij-klmnopqrstuv"
HUBSPOT_CLIENT_SECRET="xyz98765-wvu4-3210-tsrq-ponmlkjihgfed"
```

**Important**:
- Use the exact values from HubSpot (no extra spaces)
- Keep the quotes around the values
- Make sure there are no typos

---

### Step 3: Verify Redirect URI

**In HubSpot OAuth App Settings**, verify the redirect URI is exactly:
```
http://localhost:3000/api/auth/hubspot/callback
```

**Common mistakes**:
- ❌ `https://localhost:3000/...` (should be `http://`)
- ❌ Missing `/api/auth/hubspot/callback` path
- ❌ Extra trailing slash
- ❌ Different port number

---

### Step 4: Restart Dev Server

**CRITICAL**: Next.js caches environment variables. You MUST restart the server after changing `.env.local`.

```bash
# Stop current server (Ctrl+C in terminal)

# Restart
cd /Users/nolanterry/portal-brain
npm run dev
```

**Verify**: When server starts, you should see:
```
✓ Ready in XXXXms
✓ Environments: .env.local
```

---

### Step 5: Test Connection

1. Visit `http://localhost:3000`
2. Sign in
3. Click "Connect HubSpot"
4. Should redirect to HubSpot OAuth page (not showing `your-hubspot-client-id`)

---

## Verification Checklist

After updating `.env.local`:

- [ ] `HUBSPOT_CLIENT_ID` has real value (not `your-hubspot-client-id`)
- [ ] `HUBSPOT_CLIENT_SECRET` has real value (not `your-hubspot-client-secret`)
- [ ] Redirect URI in HubSpot matches exactly: `http://localhost:3000/api/auth/hubspot/callback`
- [ ] Dev server restarted after changes
- [ ] Server console shows "Environments: .env.local"

---

## Still Not Working?

### Check 1: Verify Environment Variables Are Loaded

Add temporary logging to verify (then remove):

```typescript
// In src/app/api/auth/hubspot/install/route.ts
export async function GET() {
  const clientId = process.env.HUBSPOT_CLIENT_ID;
  console.log('Client ID:', clientId?.substring(0, 10) + '...'); // First 10 chars only
  
  // ... rest of code
}
```

**Expected**: Should show first 10 characters of your real Client ID  
**If shows**: `your-hubsp...` → Environment variable not loaded (restart server)

### Check 2: Verify File Location

Ensure `.env.local` is in the correct location:
```bash
cd /Users/nolanterry/portal-brain
ls -la .env.local
# Should show the file exists
```

### Check 3: Check for Typos

```bash
cd /Users/nolanterry/portal-brain
grep HUBSPOT .env.local
# Should show:
# HUBSPOT_CLIENT_ID="your-actual-client-id"
# HUBSPOT_CLIENT_SECRET="your-actual-client-secret"
```

### Check 4: HubSpot App Status

In HubSpot, verify:
- OAuth app is **Active** (not archived)
- Redirect URI is set correctly
- Scopes include `crm.objects.deals.read`

---

## Common Issues

### Issue: "redirect_uri_mismatch"

**Solution**: 
- Redirect URI in HubSpot must match exactly: `http://localhost:3000/api/auth/hubspot/callback`
- Check `.env.local` has: `OAUTH_REDIRECT_URI="http://localhost:3000/api/auth/hubspot/callback"`

### Issue: "Invalid client_id"

**Solution**:
- Verify Client ID is correct (no extra spaces, copied completely)
- Check Client ID in HubSpot matches what's in `.env.local`

### Issue: Environment variables not loading

**Solution**:
- File must be named `.env.local` (not `.env` or `env.local`)
- File must be in project root (`/Users/nolanterry/portal-brain/.env.local`)
- **Restart dev server** after changes
- Check Next.js console shows "Environments: .env.local"

---

## Quick Test

After updating `.env.local` and restarting:

```bash
# Check what the server sees (first 10 chars only for security)
cd /Users/nolanterry/portal-brain
node -e "require('dotenv').config({path:'.env.local'}); console.log(process.env.HUBSPOT_CLIENT_ID?.substring(0,10))"
```

**Expected**: First 10 characters of your real Client ID  
**If shows**: `your-hubsp` → File not being read correctly

---

**The root cause is always**: `.env.local` has placeholder values instead of real HubSpot credentials. Once you replace them with real values and restart the server, it should work!
