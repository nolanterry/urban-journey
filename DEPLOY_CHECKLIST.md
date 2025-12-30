# Vercel Deployment Checklist

## Quick Deployment Steps

### 1. ✅ Verify Build Works Locally
```bash
cd /Users/nolanterry/portal-brain
npm run build
```
Should complete successfully (warnings about dynamic routes are normal).

### 2. ✅ Commit All Changes
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin portal-brain-v1
```

### 3. 📋 Create Vercel Project
- Go to: https://vercel.com/new
- Import repository: `urban-journey`
- Branch: `portal-brain-v1`
- Framework: Next.js (auto-detected)
- **Deploy first** to get URL

### 4. 📋 Get Vercel URL
After deployment, copy your URL:
```
https://your-app-xyz.vercel.app
```

### 5. 📋 Configure HubSpot OAuth
- Go to: https://app.hubspot.com/settings/account/developer
- Create/Edit OAuth app
- Redirect URI: `https://YOUR-VERCEL-URL.vercel.app/api/auth/hubspot/callback`
- Copy Client ID and Secret

### 6. 📋 Add Environment Variables to Vercel
In Vercel → Settings → Environment Variables, add:

```bash
DATABASE_URL=your_neon_database_url
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
HUBSPOT_CLIENT_ID=from_hubspot
HUBSPOT_CLIENT_SECRET=from_hubspot
OAUTH_REDIRECT_URI=https://YOUR-VERCEL-URL.vercel.app/api/auth/hubspot/callback
APP_BASE_URL=https://YOUR-VERCEL-URL.vercel.app
TOKEN_ENCRYPTION_KEY=your_32_byte_hex_key
OPENAI_API_KEY=sk-... (optional)
```

### 7. 📋 Redeploy
- Vercel → Deployments → Redeploy (or auto-redeploys after env vars)

### 8. 📋 Test
- Visit Vercel URL
- Sign in with Clerk
- Connect HubSpot
- Run Profile
- View Dictionary

---

## Detailed Instructions

See `DEPLOY_VERCEL.md` for complete step-by-step guide.

---

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://...` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key | `pk_test_...` |
| `CLERK_SECRET_KEY` | Clerk secret key | `sk_test_...` |
| `HUBSPOT_CLIENT_ID` | HubSpot OAuth Client ID | From HubSpot |
| `HUBSPOT_CLIENT_SECRET` | HubSpot OAuth Client Secret | From HubSpot |
| `OAUTH_REDIRECT_URI` | OAuth callback URL | `https://app.vercel.app/api/auth/hubspot/callback` |
| `APP_BASE_URL` | Your app base URL | `https://app.vercel.app` |
| `TOKEN_ENCRYPTION_KEY` | 32-byte hex key for token encryption | Generate with `openssl rand -hex 32` |
| `OPENAI_API_KEY` | OpenAI API key (optional) | `sk-...` |

---

## Important Notes

- ✅ Prisma client will auto-generate via `postinstall` script
- ✅ Build includes Prisma generate step
- ✅ Database migrations should run automatically (or run manually via Vercel CLI)
- ⚠️ Use same `TOKEN_ENCRYPTION_KEY` as local OR generate new one for production
- ⚠️ HubSpot redirect URI must match exactly (including `https://`)

---

**Ready to deploy? Start with Step 1!**
