# Portal Brain - Testing Checklist

Quick reference checklist for testing the complete end-to-end flow.

## Pre-Flight Checklist

Before starting:
- [ ] `.env.local` file exists with all required variables
- [ ] Database migrations run: `npm run db:migrate`
- [ ] Prisma client generated: `npm run db:generate`
- [ ] Dependencies installed: `npm install`
- [ ] Development server starts: `npm run dev`

## The Dream Scenario Test Flow

### ✅ Step 1: User Signs In (1 min)

1. Navigate to `http://localhost:3000`
2. Click "Sign In" button
3. Complete Clerk authentication
4. [ ] Successfully redirected to `/overview`
5. [ ] User button visible in navigation
6. [ ] Overview page loads

**Success Indicators**:
- ✅ Landing page → Sign in modal → Overview page
- ✅ No authentication errors
- ✅ User is authenticated

---

### ✅ Step 2: Connect HubSpot (2 min)

1. On Overview page, verify status shows "disconnected"
2. Click "Connect HubSpot" button
3. Authorize on HubSpot OAuth page
4. [ ] Redirected back to app successfully
5. [ ] Connection status shows "connected" (green dot)
6. [ ] "Run Profile" button is enabled

**Success Indicators**:
- ✅ OAuth redirect works
- ✅ Token exchange succeeds
- ✅ Tokens stored encrypted in database
- ✅ Connection status updates

**Database Check** (optional):
```bash
npm run db:studio
# Verify hubspot_integrations table has record
```

---

### ✅ Step 3: Run Profile (2-5 min)

1. Click "Run Profile" button
2. Button shows "Running..." state
3. [ ] Profile run starts successfully
4. [ ] Wait for completion (check `/runs` page)
5. [ ] Status shows "success" (not "failed")
6. [ ] Overview page shows counts:
   - [ ] Pipeline Count > 0
   - [ ] Property Count > 0
   - [ ] Deal Count > 0

**Success Indicators**:
- ✅ Profile run completes without errors
- ✅ All data fetched (properties, pipelines, deals)
- ✅ Field statistics computed
- ✅ Tiers and scores calculated

**Database Check** (optional):
```sql
-- Verify data was ingested
SELECT COUNT(*) FROM hs_deal_properties;  -- Should be > 0
SELECT COUNT(*) FROM hs_deal_pipelines;   -- Should be > 0
SELECT COUNT(*) FROM hs_deals_raw;        -- Should be > 0
SELECT COUNT(*) FROM field_usage_stats;   -- Should match property count
```

---

### ✅ Step 4: View Deterministic Metrics (2 min)

**Overview Page**:
1. Navigate to `/overview`
2. [ ] Connection status: "connected"
3. [ ] Pipeline Count displayed
4. [ ] Property Count displayed
5. [ ] Deal Count displayed
6. [ ] Latest run shows "success" status
7. [ ] Tier counts displayed (if available)

**Dictionary Page**:
1. Navigate to `/dictionary`
2. [ ] Page loads (may show "No data" if no profile run yet)
3. If profile run completed:
   - [ ] Summary stats show: Total Fields, Tier A/B/C counts
   - [ ] Table displays fields with:
     - [ ] Property name and label
     - [ ] Tier (A, B, or C)
     - [ ] Fill Rate (percentage)
     - [ ] Distinct Count (number)
     - [ ] Score (0-100)
   - [ ] Filters work:
     - [ ] Filter by tier (All, A, B, C)
     - [ ] Sort by (Score, Fill Rate, Name)
   - [ ] "Last computed" timestamp shown

**Success Indicators**:
- ✅ Dictionary displays field statistics
- ✅ Tiers correctly assigned (A = high usage, C = low usage)
- ✅ Scores calculated (range 0-100)
- ✅ Data is accurate and recent

**Database Check** (optional):
```sql
-- Verify field stats have tiers and scores
SELECT 
  property_name, 
  tier, 
  fill_rate, 
  score
FROM field_usage_stats 
WHERE tier IS NOT NULL
ORDER BY score DESC
LIMIT 10;
```

---

## Success Criteria Summary

**Complete Flow Works When**:
- [ ] ✅ User can sign in
- [ ] ✅ User can connect HubSpot
- [ ] ✅ Profile run completes successfully
- [ ] ✅ Overview shows accurate counts
- [ ] ✅ Dictionary shows field statistics with tiers
- [ ] ✅ Tiers are correctly assigned
- [ ] ✅ Scores are calculated
- [ ] ✅ Filters and sorting work

---

## Troubleshooting Quick Reference

| Issue | Quick Fix |
|-------|-----------|
| Sign in fails | Check Clerk keys in `.env.local` |
| OAuth fails | Verify redirect URI matches exactly |
| Profile run fails | Check `/runs` page for error message |
| No data in Dictionary | Verify profile run completed successfully |
| Database errors | Check `DATABASE_URL` and run `db:migrate` |

---

## Time Estimate

- **Setup**: 5-10 minutes (first time)
- **Testing**: 10-15 minutes (complete flow)
- **Total**: ~20 minutes

---

## Next Steps After Success

Once the flow works:
1. Test with real HubSpot data
2. Explore Dictionary filters and sorting
3. Review Overview statistics
4. Check Runs page for profile history
5. Test pause/resume (when Settings API is added)

---

**Reference Documents**:
- `TESTING_GUIDE.md` - Detailed testing instructions
- `QUICK_START_TEST.md` - Quick start guide
- `SETUP.md` - Full setup instructions
