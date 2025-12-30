# OAuth App Credentials vs. User Tokens - How Multi-Tenancy Works

## Important Distinction

There are **two different types of credentials** in OAuth:

1. **OAuth App Credentials** (CLIENT_ID, CLIENT_SECRET) - **SHARED** across all users
2. **User Access Tokens** (access_token, refresh_token) - **UNIQUE** per user

---

## How It Works

### OAuth App Credentials (Shared)

**What they are**:
- `HUBSPOT_CLIENT_ID` - Identifies YOUR app to HubSpot
- `HUBSPOT_CLIENT_SECRET` - Proves you own the app
- These are stored in `.env.local` (shared across all users)

**Why they're shared**:
- These identify **your Portal Brain app** to HubSpot
- Think of it like: "This is the Portal Brain app asking for permission"
- **All users** connect through the same OAuth app
- This is **correct and expected** - it's how OAuth works

**Analogy**: 
- Like a restaurant (your app) - everyone uses the same restaurant to order
- But each customer (user) orders their own food (connects their own HubSpot)

### User Access Tokens (Unique Per User)

**What they are**:
- `access_token` - Token to access a specific user's HubSpot account
- `refresh_token` - Token to get new access tokens
- These are stored in the **database** (one per tenant/user)

**Why they're unique**:
- Each user authorizes **their own HubSpot account**
- Each user gets **their own tokens**
- Tokens are stored with `tenant_id` (isolated per user)

**Analogy**:
- Each customer (user) gets their own order (tokens)
- Stored separately in the database

---

## The Complete Flow

### When User A Connects:

```
1. User A clicks "Connect HubSpot"
   ↓
2. Uses SHARED CLIENT_ID to redirect to HubSpot
   → HubSpot sees: "Portal Brain app wants permission"
   ↓
3. User A authorizes THEIR HubSpot account
   → HubSpot generates tokens for User A's account
   ↓
4. Callback receives tokens
   → Gets User A's tenant_id (via getTenantForUser)
   → Stores tokens with tenant_id = "tenant_A"
   ↓
5. User A's tokens stored in database:
   tenant_id: "tenant_A"
   portal_id: "12345678" (User A's HubSpot portal)
   access_token_encrypted: "encrypted_token_A"
   refresh_token_encrypted: "encrypted_refresh_A"
```

### When User B Connects (Separate):

```
1. User B clicks "Connect HubSpot"
   ↓
2. Uses SAME SHARED CLIENT_ID to redirect to HubSpot
   → HubSpot sees: "Portal Brain app wants permission" (same app)
   ↓
3. User B authorizes THEIR HubSpot account (different account!)
   → HubSpot generates tokens for User B's account
   ↓
4. Callback receives tokens
   → Gets User B's tenant_id (via getTenantForUser)
   → Stores tokens with tenant_id = "tenant_B"
   ↓
5. User B's tokens stored in database:
   tenant_id: "tenant_B"  (different tenant!)
   portal_id: "87654321"  (User B's HubSpot portal - different!)
   access_token_encrypted: "encrypted_token_B"  (different tokens!)
   refresh_token_encrypted: "encrypted_refresh_B"
```

---

## Database Storage (Multi-Tenant)

### Example Database State:

```sql
-- OAuth App Credentials (in .env.local - shared)
HUBSPOT_CLIENT_ID="abc123..."  -- Same for all users
HUBSPOT_CLIENT_SECRET="xyz789..."  -- Same for all users

-- User Tokens (in database - unique per user)
hubspot_integrations table:
┌─────────────┬──────────────┬─────────────────────────────┐
│ tenant_id   │ portal_id    │ access_token_encrypted      │
├─────────────┼──────────────┼─────────────────────────────┤
│ tenant_A    │ 12345678     │ encrypted_token_for_user_A   │
│ tenant_B    │ 87654321     │ encrypted_token_for_user_B   │
└─────────────┴──────────────┴─────────────────────────────┘
```

**Key Point**: Each row has different `tenant_id`, `portal_id`, and tokens!

---

## Why This Works

### OAuth App Credentials (Shared) ✅

- **Purpose**: Identify your app to HubSpot
- **Scope**: All users use the same app
- **Storage**: Environment variables (`.env.local`)
- **Security**: Not user-specific, just identifies your app

**This is correct** - you want all users to connect through the same OAuth app.

### User Tokens (Unique) ✅

- **Purpose**: Access each user's HubSpot account
- **Scope**: One set per user
- **Storage**: Database with `tenant_id`
- **Security**: Encrypted, tenant-scoped, isolated

**This is correct** - each user has their own tokens for their own HubSpot account.

---

## User Individuality is Preserved

### How Individuality Works:

1. **User Identification**: Clerk provides unique `userId` per user
2. **Tenant Resolution**: `getTenantForUser(userId)` returns unique tenant per user
3. **Token Storage**: Tokens stored with `tenant_id` (one per user)
4. **Data Access**: All queries filtered by `tenant_id`

### Example:

```
User A (userId: "user_123")
  → Tenant: "tenant_abc"
  → HubSpot Portal: "12345678"
  → Tokens: encrypted_token_A
  → Data: Only sees deals from portal 12345678

User B (userId: "user_456")
  → Tenant: "tenant_xyz"  (different!)
  → HubSpot Portal: "87654321"  (different!)
  → Tokens: encrypted_token_B  (different!)
  → Data: Only sees deals from portal 87654321
```

**Result**: Complete isolation - users cannot see each other's data.

---

## Security Considerations

### OAuth App Credentials (Shared)

**Security**:
- ✅ Stored in `.env.local` (not committed to git)
- ✅ Same credentials for all users (this is correct)
- ✅ Identifies your app, not individual users

**Risk**: If leaked, someone could create a fake app. But:
- They'd still need users to authorize
- Each user's tokens are still separate
- Tokens are encrypted in database

### User Tokens (Unique)

**Security**:
- ✅ Encrypted at rest (AES-256-GCM)
- ✅ Stored with `tenant_id` (isolated)
- ✅ Tenant-scoped queries (users can't access other tenants)
- ✅ Automatic refresh with expiration handling

**Risk**: If one user's tokens leak:
- Only that user's HubSpot account is affected
- Other users' tokens remain secure
- Can be revoked individually

---

## Answer to Your Question

**Q: Will hardcoding CLIENT_ID/CLIENT_SECRET in env disrupt user individuality?**

**A: No!** Here's why:

1. ✅ **CLIENT_ID/CLIENT_SECRET are meant to be shared** - they identify your app
2. ✅ **User tokens are stored separately** - one per tenant in database
3. ✅ **Each user authorizes their own HubSpot** - they get their own tokens
4. ✅ **Data is isolated by tenant_id** - users can't see each other's data

**The shared OAuth app credentials don't affect user individuality because**:
- They're just the "app identity" (like a restaurant name)
- Each user still connects their own HubSpot account
- Each user gets their own tokens stored separately
- All data queries are tenant-scoped

---

## Real-World Analogy

Think of it like a **restaurant app**:

- **OAuth App Credentials** = Restaurant's name and license
  - Everyone uses the same restaurant
  - But each customer orders their own food

- **User Tokens** = Each customer's order
  - Customer A orders pizza → Gets pizza
  - Customer B orders burger → Gets burger
  - Orders stored separately, can't see each other's orders

---

## Summary

| Credential Type | Shared or Unique? | Storage | Purpose |
|----------------|-------------------|---------|---------|
| **OAuth App** (CLIENT_ID, CLIENT_SECRET) | ✅ **Shared** (correct!) | `.env.local` | Identifies your app |
| **User Tokens** (access_token, refresh_token) | ✅ **Unique** per user | Database (tenant-scoped) | Accesses user's HubSpot |

**User individuality is preserved** because:
- Each user gets their own tenant
- Each user's tokens are stored separately
- All queries are tenant-scoped
- Users cannot access each other's data

**The shared OAuth app credentials are correct and expected** - they don't affect user individuality at all!
