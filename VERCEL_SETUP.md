# Vercel Deployment Setup

## Should You Deploy to Vercel First?

**Short Answer**: You have two options:

1. **Option A (Recommended)**: Set up Vercel now for a consistent production URL
   - Configure HubSpot OAuth with production URL once
   - Use same URL for all future testing
   - Easier long-term maintenance

2. **Option B**: Use localhost for initial testing, deploy to Vercel later
   - Faster to get started
   - Need to configure HubSpot twice (localhost + production)

---

## Recommended: Deploy to Vercel First

### Benefits:

✅ **Consistent URL**: One URL that doesn't change  
✅ **Configure HubSpot once**: Set OAuth redirect URI and forget it  
✅ **Easier testing**: Test in production-like environment  
✅ **No localhost issues**: Avoid port conflicts, network issues  
✅ **Share with others**: Easy to share with team members  

---

## Quick Vercel Setup (10 minutes)

### Step 1: Push Code to GitHub

```bash
cd /Users/nolanterry/portal-brain

# Initialize git if not already done
git init
git remote add origin https://github.com/nolanterry/urban-journey.git
git branch -M portal-brain-v1

# Add and commit
git add .
git commit -m "Initial Portal Brain setup"

# Push to GitHub
git push -u origin portal-brain-v1
```

### Step 2: Deploy to Vercel

1. **Go to Vercel**: https://vercel.com/dashboard
2. **Click "New Project"**
3. **Import your GitHub repository**: `urban-journey`
4. **Select branch**: `portal-brain-v1`
5. **Configure**:
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `./` (or leave default)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

### Step 3: Set Environment Variables in Vercel

In Vercel project settings, add all environment variables from `.env.local`:

```bash
# Database
DATABASE_URL=your_database_url

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# HubSpot OAuth
HUBSPOT_CLIENT_ID=your_client_id
HUBSPOT_CLIENT_SECRET=your_client_secret
OAUTH_REDIRECT_URI=https://your-app.vercel.app/api/auth/hubspot/callback
APP_BASE_URL=https://your-app.vercel.app

# Token Encryption
TOKEN_ENCRYPTION_KEY=your_32_byte_hex_key

# OpenAI (optional, for future)
OPENAI_API_KEY=sk-...
```

**Important**: 
- `OAUTH_REDIRECT_URI` should use your Vercel URL (will be something like `https://your-app.vercel.app/api/auth/hubspot/callback`)
- `APP_BASE_URL` should be your Vercel URL
- Use the same `TOKEN_ENCRYPTION_KEY` as local (or generate a new one for production)

### Step 4: Deploy

Click **"Deploy"** - Vercel will:
- Install dependencies
- Build your app
- Deploy to production
- Give you a URL like: `https://your-app.vercel.app`

### Step 5: Configure HubSpot OAuth App

1. **Go to HubSpot**: https://app.hubspot.com/settings/account/developer
2. **Edit your OAuth app** (or create new one)
3. **Set Redirect URI**: `https://your-app.vercel.app/api/auth/hubspot/callback`
   - Replace `your-app.vercel.app` with your actual Vercel URL
4. **Copy Client ID and Client Secret**
5. **Update Vercel environment variables** with these values

### Step 6: Test

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Sign in with Clerk
3. Click "Connect HubSpot"
4. Should redirect to HubSpot OAuth and work!

---

## Alternative: Use Localhost First

If you want to test locally first:

### Step 1: Configure HubSpot for Localhost

1. **Create OAuth app in HubSpot**
2. **Set Redirect URI**: `http://localhost:3000/api/auth/hubspot/callback`
3. **Copy Client ID and Secret**
4. **Update `.env.local`** with these values

### Step 2: Test Locally

```bash
cd /Users/nolanterry/portal-brain
npm run dev
```

Visit `http://localhost:3000` and test the flow.

### Step 3: Deploy to Vercel Later

When ready:
1. Deploy to Vercel (steps above)
2. **Add a second Redirect URI in HubSpot** (most OAuth providers allow multiple)
   - `http://localhost:3000/api/auth/hubspot/callback` (for local dev)
   - `https://your-app.vercel.app/api/auth/hubspot/callback` (for production)
3. Update Vercel environment variables with production URL

---

## Recommendation

**I recommend Option A (Vercel first)** because:

1. ✅ **One-time setup**: Configure HubSpot OAuth once
2. ✅ **Consistent URL**: No switching between localhost and production
3. ✅ **Real environment**: Test in production-like conditions
4. ✅ **Easier sharing**: Share URL with team/stakeholders
5. ✅ **No port conflicts**: Avoid localhost issues

**The only downside**: You need to deploy to test (but Vercel is very fast).

---

## Quick Setup Checklist

- [ ] Push code to GitHub
- [ ] Create Vercel project
- [ ] Add environment variables to Vercel
- [ ] Deploy to get production URL
- [ ] Configure HubSpot OAuth with production redirect URI
- [ ] Update Vercel env vars with HubSpot credentials
- [ ] Test OAuth flow on Vercel URL

---

## Environment Variable Strategy

### Development (Localhost)
```bash
OAUTH_REDIRECT_URI="http://localhost:3000/api/auth/hubspot/callback"
APP_BASE_URL="http://localhost:3000"
```

### Production (Vercel)
```bash
OAUTH_REDIRECT_URI="https://your-app.vercel.app/api/auth/hubspot/callback"
APP_BASE_URL="https://your-app.vercel.app"
```

**Note**: HubSpot OAuth apps can have multiple redirect URIs, so you can support both!

---

## Next Steps After Vercel Setup

1. **Test OAuth flow** on Vercel URL
2. **Test profile run** - verify data ingestion works
3. **Test Dictionary** - verify field statistics display
4. **Set up custom domain** (optional) - if you want your own domain

---

**Bottom line**: Yes, setting up Vercel first gives you a consistent URL and makes HubSpot OAuth configuration simpler. Recommended approach!
