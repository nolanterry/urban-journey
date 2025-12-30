# Quick Start Test - Verify End-to-End Flow

## Goal

Test the complete flow: **Sign In → Connect HubSpot → Run Profile → View Metrics**

---

## Prerequisites (5 minutes)

### 1. Environment Setup

Create `.env.local`:

```bash
# Copy example
cp env.example .env.local

# Fill in required values:
# - DATABASE_URL (from Neon or your Postgres)
# - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (from Clerk dashboard)
# - CLERK_SECRET_KEY (from Clerk dashboard)
# - HUBSPOT_CLIENT_ID (from HubSpot OAuth app)
# - HUBSPOT_CLIENT_SECRET (from HubSpot OAuth app)
# - OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/hubspot/callback
# - APP_BASE_URL=http://localhost:3000
# - TOKEN_ENCRYPTION_KEY (generate with: openssl rand -hex 32)
```

### 2. Database Setup

```bash
# Install dependencies
npm install

# Run migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate
```

### 3. HubSpot OAuth App Setup

1. Go to [HubSpot Developer Account](https://app.hubspot.com/settings/account/developer)
2. Create OAuth app:
   - **Redirect URI**: `http://localhost:3000/api/auth/hubspot/callback`
   - **Scopes**: `crm.objects.deals.read`
3. Copy **Client ID** and **Client Secret** to `.env.local`

---

## Test Flow (10 minutes)

### Step 1: Start Server

```bash
npm run dev
```

Server should start on `http://localhost:3000`

---

### Step 2: Sign In (1 minute)

1. Open `http://localhost:3000`
2. Click **"Sign In"** button
3. Complete Clerk authentication (email/password or OAuth)
4. ✅ Should redirect to `/overview`

**Check**: You see Overview page with "Connection Status: disconnected"

---

### Step 3: Connect HubSpot (2 minutes)

1. Click **"Connect HubSpot"** button
2. You'll be redirected to HubSpot authorization page
3. Click **"Allow"** to authorize the app
4. ✅ Should redirect back to `/overview?connected=true`
5. Refresh page
6. ✅ Connection status should show "connected"

**Check**: 
- Connection status = "connected" (green dot)
- "Run Profile" button is now enabled

**Verify in Database** (optional):
```bash
npm run db:studio
# Check hubspot_integrations table has a record
```

---

### Step 4: Run Profile (2-5 minutes)

1. Click **"Run Profile"** button
2. Button should show "Running..."
3. Wait for completion (check `/runs` page for progress)
4. ✅ Profile should complete with "success" status
5. Refresh Overview page
6. ✅ Should show counts:
   - Pipeline Count (number > 0)
   - Property Count (number > 0)
   - Deal Count (number > 0)

**Check**:
- Navigate to `/runs` page
- Latest run shows status "success"
- Started and finished timestamps are shown
- No error message

---

### Step 5: View Deterministic Metrics (2 minutes)

1. Navigate to `/dictionary` page
2. ✅ Should see:
   - Summary stats (Total Fields, Tier A/B/C counts)
   - Table with fields:
     - Property name and label
     - Tier (A, B, or C)
     - Fill Rate (percentage)
     - Distinct Count (number)
     - Score (0-100)
   - Filters (tier filter, sort options)
   - "Last computed" timestamp

**Check**:
- Tier A fields have high fill rates (≥80%) and scores
- Tier C fields have low fill rates (<30%) and scores
- Scores range from 0-100
- Filters work (try filtering by tier)
- Sorting works (try sorting by score)

---

## Success Checklist

- [ ] ✅ User can sign in with Clerk
- [ ] ✅ HubSpot OAuth connection works
- [ ] ✅ Connection status shows "connected"
- [ ] ✅ Profile run completes successfully
- [ ] ✅ Overview shows counts (pipelines, properties, deals)
- [ ] ✅ Dictionary shows field statistics with tiers
- [ ] ✅ Tiers are correctly assigned (A/B/C)
- [ ] ✅ Scores are calculated (0-100)
- [ ] ✅ Filters and sorting work

---

## Troubleshooting

### Sign In Fails
- Check Clerk keys in `.env.local`
- Verify keys start with `pk_` and `sk_`
- Check Clerk dashboard for correct keys

### HubSpot Connection Fails
- Verify redirect URI in HubSpot app: `http://localhost:3000/api/auth/hubspot/callback`
- Check `HUBSPOT_CLIENT_ID` and `HUBSPOT_CLIENT_SECRET` in `.env.local`
- Ensure HubSpot app is not archived

### Profile Run Fails
- Check `/runs` page for error message
- Verify HubSpot portal has deals
- Check server logs for API errors
- Verify tokens are valid (try reconnecting)

### Dictionary Shows No Data
- Verify profile run completed successfully
- Check `field_usage_stats` table has records (use `db:studio`)
- Verify computation ran (should be automatic after deal ingestion)

### Database Errors
- Verify `DATABASE_URL` is correct
- Check database is accessible
- Run `npm run db:migrate` again

---

## What Success Looks Like

**Overview Page**:
```
Connection Status: ● connected
Pipeline Count: 3
Property Count: 152
Deal Count: 247
[Run Profile] button (enabled)
```

**Dictionary Page**:
```
Total Fields: 152
Tier A: 45 | Tier B: 67 | Tier C: 40

[Table with fields showing:]
- dealname: Tier A, Fill Rate: 98.5%, Score: 92.3
- custom_field_123: Tier C, Fill Rate: 12.3%, Score: 15.2
...
```

**Runs Page**:
```
Latest Run:
Status: success
Started: 2024-01-15 10:30:00
Finished: 2024-01-15 10:32:15
```

---

## Next Steps

Once this flow works:

1. **Test with real data** - Connect to a real HubSpot portal
2. **Explore the Dictionary** - Filter by tier, sort by score
3. **Review Overview stats** - Check tier counts and field summaries
4. **Check Settings** - View portal information (when Settings API is added)

---

**Total Time**: ~15-20 minutes for complete setup + test

This verifies the core functionality is working end-to-end!
