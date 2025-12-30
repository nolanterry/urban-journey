# Deployment Strategy: Localhost vs Vercel

## The Question: Should You Set Up Vercel First?

**Answer**: **Yes, recommended!** Here's why and how.

---

## Why Deploy to Vercel First?

### ✅ Advantages

1. **Consistent URL**: 
   - One production URL that doesn't change
   - Configure HubSpot OAuth once
   - No switching between environments

2. **Easier HubSpot Configuration**:
   - Set redirect URI in HubSpot: `https://your-app.vercel.app/api/auth/hubspot/callback`
   - Works for all testing (no localhost port conflicts)
   - Can add localhost URI later if needed (HubSpot supports multiple)

3. **Production-Like Testing**:
   - Test in real environment
   - No localhost-specific issues
   - Easier to share with team

4. **Faster Iteration**:
   - Vercel auto-deploys on git push
   - Fast deployments (< 1 minute)
   - Preview deployments for PRs

### ⚠️ Considerations

- Need GitHub repo set up
- Environment variables must be set in Vercel
- Slightly slower feedback loop (deploy → test vs instant local)

---

## Recommended Approach: Vercel First

### Step-by-Step

#### 1. Push Code to GitHub

```bash
cd /Users/nolanterry/portal-brain

# Check git status
git status

# Add all files (except .env.local)
git add .

# Commit
git commit -m "Portal Brain initial setup"

# Push to GitHub (if remote exists)
git push -u origin portal-brain-v1
# Or create new branch if needed
```

#### 2. Create Vercel Project

1. Go to: https://vercel.com/new
2. **Import Git Repository**: Select `urban-journey`
3. **Configure Project**:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
4. **Environment Variables**: Add all from `.env.local` (see below)
5. **Deploy**

#### 3. Set Environment Variables in Vercel

**In Vercel Dashboard → Project Settings → Environment Variables**, add:

```bash
# Database
DATABASE_URL=your_database_url_from_neon

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# HubSpot OAuth (UPDATE AFTER DEPLOYMENT)
HUBSPOT_CLIENT_ID=your_client_id
HUBSPOT_CLIENT_SECRET=your_client_secret
OAUTH_REDIRECT_URI=https://your-app.vercel.app/api/auth/hubspot/callback
APP_BASE_URL=https://your-app.vercel.app

# Token Encryption
TOKEN_ENCRYPTION_KEY=your_32_byte_hex_key

# OpenAI (optional)
OPENAI_API_KEY=sk-...
```

**Important**: 
- `OAUTH_REDIRECT_URI` and `APP_BASE_URL` will use your Vercel URL
- You'll get the URL after first deployment (e.g., `https://urban-journey-xyz.vercel.app`)

#### 4. Get Your Vercel URL

After deployment, Vercel gives you a URL like:
```
https://urban-journey-xyz.vercel.app
```

#### 5. Update HubSpot OAuth App

1. Go to: https://app.hubspot.com/settings/account/developer
2. **Create OAuth App** (or edit existing):
   - **App Name**: Portal Brain
   - **Redirect URI**: `https://your-app.vercel.app/api/auth/hubspot/callback`
     - Replace `your-app.vercel.app` with your actual Vercel URL
   - **Scopes**: `crm.objects.deals.read`
3. **Save** and copy **Client ID** and **Client Secret**

#### 6. Update Vercel Environment Variables

Go back to Vercel → Environment Variables:
- Update `HUBSPOT_CLIENT_ID` with real value
- Update `HUBSPOT_CLIENT_SECRET` with real value
- Update `OAUTH_REDIRECT_URI` with your Vercel URL
- Update `APP_BASE_URL` with your Vercel URL

#### 7. Redeploy

Vercel will automatically redeploy when you update environment variables, or:
- Go to Deployments → Click "Redeploy"

#### 8. Test

Visit your Vercel URL and test:
1. Sign in with Clerk
2. Connect HubSpot
3. Run Profile
4. View Dictionary

---

## Alternative: Localhost First (Then Vercel)

If you prefer to test locally first:

### Step 1: Configure HubSpot for Localhost

1. Create OAuth app in HubSpot
2. Set Redirect URI: `http://localhost:3000/api/auth/hubspot/callback`
3. Copy Client ID and Secret
4. Update `.env.local`

### Step 2: Test Locally

```bash
cd /Users/nolanterry/portal-brain
npm run dev
```

Test the flow at `http://localhost:3000`

### Step 3: Deploy to Vercel

When ready:
1. Deploy to Vercel (steps above)
2. **Add second Redirect URI in HubSpot**:
   - `http://localhost:3000/api/auth/hubspot/callback` (dev)
   - `https://your-app.vercel.app/api/auth/hubspot/callback` (prod)
3. Update Vercel environment variables

**Note**: HubSpot allows multiple redirect URIs, so this works fine!

---

## Best Practice: Support Both

You can configure HubSpot to support both localhost and production:

### HubSpot OAuth App Configuration

**Redirect URIs** (add both):
1. `http://localhost:3000/api/auth/hubspot/callback` (local development)
2. `https://your-app.vercel.app/api/auth/hubspot/callback` (production)

### Environment Variables

**Local (.env.local)**:
```bash
OAUTH_REDIRECT_URI="http://localhost:3000/api/auth/hubspot/callback"
APP_BASE_URL="http://localhost:3000"
```

**Vercel (Environment Variables)**:
```bash
OAUTH_REDIRECT_URI="https://your-app.vercel.app/api/auth/hubspot/callback"
APP_BASE_URL="https://your-app.vercel.app"
```

This way:
- ✅ Local development works with localhost
- ✅ Production works with Vercel URL
- ✅ Both use same HubSpot OAuth app
- ✅ No need to switch configurations

---

## My Recommendation

**Set up Vercel first** because:

1. ✅ **One-time HubSpot configuration** - set it once with production URL
2. ✅ **Consistent testing** - always use same URL
3. ✅ **Production-ready** - test in real environment from start
4. ✅ **Easier sharing** - share Vercel URL with team
5. ✅ **No localhost issues** - avoid port conflicts, network problems

**Then add localhost support later** if you want to develop locally (HubSpot supports multiple redirect URIs).

---

## Quick Start: Vercel Deployment

```bash
# 1. Ensure code is committed
cd /Users/nolanterry/portal-brain
git add .
git commit -m "Ready for Vercel deployment"

# 2. Push to GitHub
git push origin portal-brain-v1

# 3. Go to Vercel and import repository
# 4. Add environment variables (use placeholders first)
# 5. Deploy to get URL
# 6. Configure HubSpot with Vercel URL
# 7. Update Vercel env vars with real HubSpot credentials
# 8. Redeploy
# 9. Test!
```

---

**Bottom line**: Yes, set up Vercel first for a consistent, production-ready URL. It simplifies HubSpot OAuth configuration and makes testing easier!
