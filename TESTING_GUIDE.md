# Portal Brain - End-to-End Testing Guide

## The Dream Scenario Flow

```
1. User signs in (Clerk)
   ↓
2. User connects HubSpot (OAuth flow)
   ↓
3. System ingests data (profile run)
   ↓
4. System displays deterministic metrics (Dictionary/Overview)
```

This guide walks through testing this complete flow step-by-step.

---

## Prerequisites Checklist

Before testing, ensure you have:

### ✅ Environment Setup

- [ ] `.env.local` file created with all required variables
- [ ] Database connection string (`DATABASE_URL`) configured
- [ ] Clerk keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`)
- [ ] HubSpot OAuth app created with redirect URI configured
- [ ] `TOKEN_ENCRYPTION_KEY` generated (32-byte hex)
- [ ] `APP_BASE_URL` set to your local/dev URL

### ✅ Database Setup

- [ ] Database migrations run: `npm run db:migrate`
- [ ] Prisma client generated: `npm run db:generate`
- [ ] Database is accessible and schema is created

### ✅ Development Server

- [ ] Dependencies installed: `npm install`
- [ ] Development server can start: `npm run dev`
- [ ] Server runs without errors on `http://localhost:3000`

---

## Step-by-Step Testing Flow

### Step 1: User Signs In

**Expected Behavior**:
- User visits `http://localhost:3000`
- Sees landing page with "Sign In" button
- Can sign in with Clerk (email/password or OAuth provider)
- After sign in, redirected to `/overview`

**Testing Steps**:

1. Navigate to `http://localhost:3000`
2. Click "Sign In" button
3. Complete Clerk authentication
4. Verify redirect to `/overview` page

**Success Criteria**:
- ✅ Landing page loads
- ✅ Sign in modal appears
- ✅ Authentication succeeds
- ✅ Redirect to `/overview` works
- ✅ User sees authenticated UI (with UserButton)

**Troubleshooting**:
- If sign in fails: Check Clerk keys in `.env.local`
- If redirect fails: Check middleware configuration
- If UserButton missing: Check ClerkProvider in layout

---

### Step 2: User Connects HubSpot

**Expected Behavior**:
- User sees "Connection Status: disconnected" on Overview page
- Clicks "Connect HubSpot" button
- Redirected to HubSpot OAuth authorization page
- User authorizes the app
- Redirected back to `/overview?connected=true`
- Connection status changes to "connected"

**Testing Steps**:

1. On Overview page, verify connection status shows "disconnected"
2. Click "Connect HubSpot" button
3. You should be redirected to HubSpot OAuth page
4. Authorize the app (grant permissions)
5. You'll be redirected back to your app at `/api/auth/hubspot/callback`
6. Callback should process tokens and redirect to `/overview?connected=true`
7. Refresh Overview page
8. Verify connection status shows "connected"

**Success Criteria**:
- ✅ "Connect HubSpot" button is visible when disconnected
- ✅ Clicking button redirects to HubSpot OAuth
- ✅ OAuth authorization works
- ✅ Callback processes tokens successfully
- ✅ Tokens are encrypted and stored in database
- ✅ Redirect to Overview works
- ✅ Connection status updates to "connected"

**Troubleshooting**:

**Issue: "Connect HubSpot" button doesn't appear**
- Check that connection status is "disconnected"
- Check browser console for errors
- Verify API route `/api/auth/hubspot/install` is accessible

**Issue: OAuth redirect fails**
- Check `OAUTH_REDIRECT_URI` in `.env.local` matches HubSpot app settings
- Must be exactly: `http://localhost:3000/api/auth/hubspot/callback`
- Check `HUBSPOT_CLIENT_ID` is correct

**Issue: Callback fails with "invalid_state"**
- State validation expired (10 minute timeout)
- Try connecting again
- Check cookies are enabled in browser

**Issue: "Token exchange failed"**
- Check `HUBSPOT_CLIENT_SECRET` is correct
- Check HubSpot app has correct redirect URI
- Check HubSpot app is active (not archived)

**Issue: "No tenant found"**
- This shouldn't happen in current implementation (tenant auto-created)
- Check database connection
- Check tenant creation logic in `src/lib/tenant.ts`

**Database Verification**:

After successful connection, verify in database:

```sql
-- Check integration was created
SELECT * FROM hubspot_integrations;

-- Should show:
-- - tenant_id (UUID)
-- - portal_id (HubSpot portal ID)
-- - access_token_encrypted (encrypted string)
-- - refresh_token_encrypted (encrypted string)
-- - expires_at (timestamp)
-- - is_paused (false)
```

---

### Step 3: System Ingests Data (Profile Run)

**Expected Behavior**:
- User clicks "Run Profile" button on Overview page
- System fetches deal properties from HubSpot
- System fetches pipeline metadata
- System fetches deals (paged)
- System computes field usage statistics
- System calculates tiers and scores
- Profile run status updates to "success"
- Overview page shows updated counts

**Testing Steps**:

1. On Overview page, verify connection status is "connected"
2. Click "Run Profile" button
3. Button should show "Running..." state
4. Wait for profile to complete (may take 1-5 minutes depending on deal count)
5. Refresh Overview page
6. Verify profile run shows as "success"
7. Verify counts are displayed:
   - Pipeline Count (should be > 0)
   - Property Count (should be > 0)
   - Deal Count (should be > 0)

**Success Criteria**:
- ✅ "Run Profile" button is enabled when connected
- ✅ Profile run starts successfully
- ✅ Profile run completes without errors
- ✅ Status shows "success" (not "failed")
- ✅ Counts are displayed (pipelines, properties, deals)
- ✅ Latest run timestamp is shown

**Monitoring Progress**:

Check the Runs page (`/runs`) to see profile run status:

1. Navigate to `/runs`
2. Should see a profile run with status "success"
3. Check `started_at` and `finished_at` timestamps
4. Verify no error message

**Database Verification**:

After successful profile run, verify data was ingested:

```sql
-- Check profile run was created
SELECT * FROM profile_runs ORDER BY started_at DESC LIMIT 1;
-- Should show status='success', finished_at is not null

-- Check deal properties were fetched
SELECT COUNT(*) FROM hs_deal_properties;
-- Should be > 0

-- Check pipelines were fetched
SELECT COUNT(*) FROM hs_deal_pipelines;
-- Should be > 0

-- Check deals were fetched
SELECT COUNT(*) FROM hs_deals_raw;
-- Should be > 0 (may take time for large portals)

-- Check field usage stats were computed
SELECT COUNT(*) FROM field_usage_stats;
-- Should be > 0, should match property count
```

**Troubleshooting**:

**Issue: Profile run fails immediately**
- Check browser console for errors
- Check API route logs
- Check database connection
- Verify HubSpot tokens are valid

**Issue: Profile run stuck in "running" state**
- Check if process is actually running (may be slow)
- For large portals, this can take 5+ minutes
- Check database for error messages in `profile_runs.error_message`
- Check server logs for API errors

**Issue: "Processing is paused" error**
- Check `hubspot_integrations.is_paused` is false
- If true, set to false: `UPDATE hubspot_integrations SET is_paused = false;`

**Issue: No deals fetched**
- Check HubSpot portal actually has deals
- Check HubSpot app has `crm.objects.deals.read` scope
- Check rate limiting (may need to wait)
- Check server logs for API errors

**Issue: Field stats not computed**
- Verify profile run completed successfully
- Check `field_usage_stats` table has records
- Check computation ran (should happen automatically after deal ingestion)
- Review `computeFieldStats` logic if stats are missing

---

### Step 4: Display Deterministic Metrics

**Expected Behavior**:
- Overview page shows summary statistics
- Dictionary page shows field usage statistics with tiers
- Fields are categorized as Tier A, B, or C
- Fill rates, distinct counts, and scores are displayed
- Fields can be filtered by tier
- Fields can be sorted by score

**Testing Steps - Overview Page**:

1. Navigate to `/overview`
2. Verify "Stats" section shows:
   - Pipeline Count (number)
   - Property Count (number)
   - Deal Count (number)
3. If profile run completed, verify:
   - Tier counts (Tier A, B, C) if available
   - Latest run shows "success" status

**Testing Steps - Dictionary Page**:

1. Navigate to `/dictionary`
2. Verify page loads (may show "No Field Statistics Available" if no profile run)
3. If profile run completed, verify:
   - Table displays fields with:
     - Property name and label
     - Tier (A, B, or C)
     - Fill Rate (percentage)
     - Distinct Count (number)
     - Score (0-100)
   - Summary stats show:
     - Total Fields
     - Tier A count
     - Tier B count
     - Tier C count
   - Filters work:
     - Filter by tier (All, A, B, C)
     - Sort by (Score, Fill Rate, Name)
   - "Last computed" timestamp is shown

**Success Criteria**:
- ✅ Overview page displays counts
- ✅ Dictionary page displays field statistics
- ✅ Tiers are correctly assigned (A/B/C)
- ✅ Fill rates are accurate percentages
- ✅ Scores are calculated (0-100 range)
- ✅ Filters and sorting work
- ✅ Data is recent (computed_at timestamp is recent)

**Database Verification**:

```sql
-- Check field usage stats have tiers and scores
SELECT 
  property_name, 
  tier, 
  fill_rate, 
  distinct_count, 
  score,
  computed_at
FROM field_usage_stats 
ORDER BY score DESC 
LIMIT 10;

-- Should show:
-- - Tier A fields with high fill_rate and score
-- - Tier C fields with low fill_rate and score
-- - Scores range from 0-100
-- - computed_at is recent
```

**Troubleshooting**:

**Issue: Dictionary shows "No Field Statistics Available"**
- Verify profile run completed successfully
- Check `field_usage_stats` table has records
- Verify `computed_at` is recent
- Check API endpoint `/api/dictionary/fields` returns data

**Issue: Tiers are all null or incorrect**
- Verify `updateTiersAndScores` ran after `computeFieldStats`
- Check tier calculation logic in `src/server/jobs/scoring.ts`
- Verify fill_rate and distinct_count are populated

**Issue: Scores are all null or 0**
- Verify score calculation ran
- Check scoring logic in `src/server/jobs/scoring.ts`
- Verify input data (fill_rate, distinct_count) is valid

**Issue: Fill rates seem incorrect**
- Verify deal count matches HubSpot
- Check that deals were fetched correctly
- Verify field extraction logic in `computeFieldStats`

---

## Complete End-to-End Test Script

Use this script to test the complete flow in order:

```bash
# 1. Start development server
npm run dev

# 2. Verify server starts on http://localhost:3000

# 3. Open browser and navigate to http://localhost:3000

# 4. Sign in with Clerk
# - Click "Sign In"
# - Complete authentication
# - Should redirect to /overview

# 5. Connect HubSpot
# - Click "Connect HubSpot"
# - Authorize on HubSpot
# - Should redirect back and show "connected"

# 6. Run Profile
# - Click "Run Profile"
# - Wait for completion (check /runs page)
# - Should show "success" status

# 7. View Dictionary
# - Navigate to /dictionary
# - Should show field statistics with tiers

# 8. Verify Overview
# - Navigate back to /overview
# - Should show counts and latest run status
```

---

## Verification Checklist

After completing the flow, verify:

### ✅ Authentication & Connection
- [ ] User can sign in with Clerk
- [ ] HubSpot OAuth flow works
- [ ] Tokens are stored encrypted in database
- [ ] Connection status shows "connected"

### ✅ Data Ingestion
- [ ] Profile run completes successfully
- [ ] Deal properties are fetched
- [ ] Pipelines are fetched
- [ ] Deals are fetched (check count matches HubSpot)
- [ ] Profile run shows in `/runs` page

### ✅ Field Statistics Computation
- [ ] Field usage stats are computed
- [ ] Fill rates are calculated
- [ ] Distinct counts are calculated
- [ ] Tiers are assigned (A/B/C)
- [ ] Scores are calculated (0-100)

### ✅ UI Display
- [ ] Overview page shows counts
- [ ] Dictionary page shows field statistics
- [ ] Tiers are displayed correctly
- [ ] Filters work (tier filter, sort options)
- [ ] Data is accurate and recent

---

## Common Issues & Solutions

### Issue: "Cannot find module" errors
**Solution**: Run `npm install` and `npm run db:generate`

### Issue: Database connection errors
**Solution**: 
- Check `DATABASE_URL` in `.env.local`
- Verify database is accessible
- Check SSL mode is correct (`?sslmode=require`)

### Issue: Clerk authentication not working
**Solution**:
- Verify Clerk keys are correct
- Check `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` starts with `pk_`
- Check `CLERK_SECRET_KEY` starts with `sk_`

### Issue: HubSpot OAuth fails
**Solution**:
- Verify redirect URI matches exactly in HubSpot app settings
- Check `HUBSPOT_CLIENT_ID` and `HUBSPOT_CLIENT_SECRET`
- Ensure HubSpot app is not archived

### Issue: Profile run fails with token errors
**Solution**:
- Check tokens are encrypted correctly
- Verify `TOKEN_ENCRYPTION_KEY` is correct (32 bytes hex)
- Try disconnecting and reconnecting HubSpot

### Issue: Field stats not appearing
**Solution**:
- Verify profile run completed successfully
- Check `field_usage_stats` table has data
- Verify `computed_at` timestamp is recent
- Check computation ran (should be automatic)

---

## Success Indicators

You'll know everything is working when:

1. ✅ User can sign in and see Overview page
2. ✅ User can connect HubSpot and status shows "connected"
3. ✅ User can run profile and it completes successfully
4. ✅ Overview page shows accurate counts (pipelines, properties, deals)
5. ✅ Dictionary page shows field statistics with tiers and scores
6. ✅ Tiers are correctly assigned (A = high usage, C = low usage)
7. ✅ Data is recent (computed within last run)
8. ✅ Filters and sorting work in Dictionary page

---

## Next Steps After Testing

Once the basic flow works:

1. **Test with real HubSpot data** - Connect to a real HubSpot portal with actual deals
2. **Test with large datasets** - Verify performance with 1000+ deals
3. **Test error scenarios** - Invalid tokens, rate limits, network failures
4. **Test pause/resume** - Test pause processing functionality
5. **Test multiple runs** - Verify subsequent profile runs work correctly

---

## Debugging Tips

### Enable Detailed Logging

Check server logs for detailed information:

```bash
# Watch server logs
npm run dev

# Look for:
# - API request/response logs
# - Error messages
# - Rate limit information
# - Token refresh attempts
```

### Database Inspection

Use Prisma Studio to inspect data:

```bash
npm run db:studio
# Opens Prisma Studio at http://localhost:5555
# Browse tables to verify data
```

### API Testing

Test API endpoints directly:

```bash
# Health check
curl http://localhost:3000/api/health

# Profile summary (requires auth)
# Use browser DevTools Network tab to inspect API calls
```

### Browser DevTools

Use browser DevTools to debug:

- **Console**: Check for JavaScript errors
- **Network**: Check API request/response
- **Application**: Check cookies (for OAuth state)
- **Storage**: Check local storage (for Clerk session)

---

This testing guide should help you verify the complete end-to-end flow works correctly!
