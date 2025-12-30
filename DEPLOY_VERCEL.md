# Deploy to Vercel - Step-by-Step Guide

## Prerequisites Checklist

Before deploying, ensure you have:
- ✅ Code committed to git
- ✅ GitHub repository set up (remote: `urban-journey`, branch: `portal-brain-v1`)
- ✅ Neon database created and `DATABASE_URL` available
- ✅ Clerk account set up with API keys
- ✅ HubSpot developer account (for OAuth app creation)

---

## Step 1: Commit and Push Current Changes

```bash
cd /Users/nolanterry/portal-brain

# Check status
git status

# Add all changes (git safeguards, workflow docs, etc.)
git add .
git commit -m "Add git safeguards and prepare for Vercel deployment"

# Push to GitHub
git push origin portal-brain-v1
```

---

## Step 2: Create Vercel Project

1. **Go to Vercel**: https://vercel.com/new
   - Sign in with GitHub (if not already)

2. **Import Git Repository**:
   - Click "Import Project"
   - Select your GitHub repository: `urban-journey`
   - Or paste: `https://github.com/nolanterry/urban-journey`

3. **Configure Project**:
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: `./` (default - leave as is)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

4. **Environment Variables** (we'll add these in Step 4 - skip for now)

5. **Deploy**: Click "Deploy" to get your URL first

---

## Step 3: Get Your Vercel URL

After deployment completes, Vercel will give you a URL like:
```
https://urban-journey-xyz.vercel.app
```
or
```
https://urban-journey-abc123.vercel.app
```

**Copy this URL** - you'll need it for the next steps!

---

## Step 4: Configure HubSpot OAuth App

1. **Go to HubSpot Developer Settings**:
   - https://app.hubspot.com/settings/account/developer
   - Or: HubSpot → Settings (gear icon) → Integrations → Private Apps → OAuth Apps

2. **Create or Edit OAuth App**:
   - Click "Create app" (or edit existing)
   - **App Name**: Portal Brain (or your preferred name)
   - **Redirect URI**: `https://YOUR-VERCEL-URL.vercel.app/api/auth/hubspot/callback`
     - Replace `YOUR-VERCEL-URL` with your actual Vercel URL from Step 3
     - Example: `https://urban-journey-xyz.vercel.app/api/auth/hubspot/callback`
   - **Scopes**: 
     - `crm.objects.deals.read`
     - `crm.objects.deals.write` (if needed)
     - `crm.schemas.deals.read` (for custom properties)

3. **Save and Copy Credentials**:
   - Click "Save"
   - Copy the **Client ID**
   - Copy the **Client Secret** (show it - you'll need it!)

---

## Step 5: Set Environment Variables in Vercel

1. **Go to Vercel Dashboard**:
   - Select your project
   - Go to **Settings** → **Environment Variables**

2. **Add Each Variable** (click "Add" for each):

   ```bash
   # Database (from Neon)
   DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...

   # HubSpot OAuth (from Step 4)
   HUBSPOT_CLIENT_ID=your_client_id_from_hubspot
   HUBSPOT_CLIENT_SECRET=your_client_secret_from_hubspot
   OAUTH_REDIRECT_URI=https://YOUR-VERCEL-URL.vercel.app/api/auth/hubspot/callback
   APP_BASE_URL=https://YOUR-VERCEL-URL.vercel.app

   # Token Encryption (use same key as local, or generate new one)
   TOKEN_ENCRYPTION_KEY=your_32_byte_hex_key
   # Generate with: openssl rand -hex 32

   # OpenAI (optional - for future Phase 2/3)
   OPENAI_API_KEY=sk-...
   ```

3. **Important Notes**:
   - Replace `YOUR-VERCEL-URL` with your actual Vercel URL
   - Use the same `TOKEN_ENCRYPTION_KEY` as local, OR generate a new one for production
   - Set environment for: **Production**, **Preview**, and **Development** (or just Production)
   - Click "Save" after adding each variable

---

## Step 6: Redeploy

After adding environment variables:

1. **Go to Deployments tab**
2. Click the **three dots (⋯)** on the latest deployment
3. Click **"Redeploy"**
   - This applies the new environment variables
   - Or: Vercel may auto-redeploy when you save env vars

---

## Step 7: Test the Deployment

1. **Visit your Vercel URL**: `https://YOUR-VERCEL-URL.vercel.app`

2. **Test the Flow**:
   - ✅ Sign in with Clerk
   - ✅ Navigate to Overview page
   - ✅ Click "Connect HubSpot"
   - ✅ Should redirect to HubSpot OAuth
   - ✅ Authorize the app
   - ✅ Should redirect back to your app
   - ✅ Click "Run Profile" to ingest data
   - ✅ View Dictionary to see field statistics

3. **Check for Errors**:
   - Open browser console (F12)
   - Check Vercel deployment logs (Deployments → View Function Logs)
   - Check Vercel logs: Settings → Logs

---

## Step 8: Verify Database Connection

After successful deployment, verify:
- Database migrations ran (Prisma should handle this)
- Tables exist in Neon database
- Data can be written/read

---

## Troubleshooting

### Build Fails
- Check Vercel build logs
- Ensure all dependencies are in `package.json`
- Check for TypeScript errors: `npm run build` locally first

### Environment Variables Not Working
- Ensure variables are saved (not just typed)
- Redeploy after adding variables
- Check variable names match exactly (case-sensitive)
- Verify no extra spaces or quotes

### HubSpot OAuth Fails
- Verify redirect URI matches exactly (including `https://`)
- Check HubSpot OAuth app is saved
- Verify Client ID and Secret are correct
- Check browser console for errors

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check Neon database is accessible (not paused)
- Ensure Prisma migrations have run
- Check Vercel logs for connection errors

---

## Next Steps After Deployment

1. **Test Full Flow**:
   - Connect HubSpot
   - Run Profile
   - View Dictionary
   - Check data in Neon database

2. **Set Up Custom Domain** (optional):
   - Vercel → Settings → Domains
   - Add your custom domain

3. **Monitor**:
   - Check Vercel logs regularly
   - Monitor database usage in Neon
   - Set up error tracking (Sentry, etc.)

4. **Support Local Development** (optional):
   - Add localhost redirect URI to HubSpot OAuth app
   - Keep local `.env.local` for development

---

## Quick Reference: Environment Variables

Copy this list and fill in your values:

```bash
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
HUBSPOT_CLIENT_ID=
HUBSPOT_CLIENT_SECRET=
OAUTH_REDIRECT_URI=https://.vercel.app/api/auth/hubspot/callback
APP_BASE_URL=https://.vercel.app
TOKEN_ENCRYPTION_KEY=
OPENAI_API_KEY=
```

---

## Success Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel project created
- [ ] First deployment successful (got URL)
- [ ] HubSpot OAuth app configured with Vercel URL
- [ ] Environment variables added to Vercel
- [ ] Redeployed with env vars
- [ ] Can sign in with Clerk
- [ ] Can connect HubSpot
- [ ] Can run Profile
- [ ] Can view Dictionary
- [ ] Data appears in database

---

**You're ready to deploy! Start with Step 1.**
