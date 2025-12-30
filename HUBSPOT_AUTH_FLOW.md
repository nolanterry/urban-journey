# HubSpot Authentication Flow (Multi-Tenant)

## Complete Flow: How HubSpot Auth Works

### Step-by-Step Process

```
1. User clicks "Connect HubSpot"
   ↓
2. GET /api/auth/hubspot/install
   → Generates OAuth state (CSRF protection)
   → Stores state in httpOnly cookie
   → Redirects to HubSpot OAuth page
   ↓
3. User authorizes on HubSpot
   ↓
4. HubSpot redirects back with code
   ↓
5. GET /api/auth/hubspot/callback
   → Validates OAuth state (CSRF check)
   → Gets current user (Clerk userId)
   → Gets tenant for user (multi-tenant)
   → Exchanges code for tokens
   → Encrypts tokens
   → Stores in database (tenant-scoped)
   → Redirects to /overview
   ↓
6. User sees "connected" status
```

---

## Detailed Flow

### Step 1: User Initiates Connection

**Location**: `src/app/(authed)/overview/page.tsx`

```typescript
// User clicks "Connect HubSpot" button
<a href="/api/auth/hubspot/install">
  Connect HubSpot
</a>
```

**What happens**: User is redirected to `/api/auth/hubspot/install`

---

### Step 2: OAuth Install Endpoint

**Location**: `src/app/api/auth/hubspot/install/route.ts`

```typescript
export async function GET() {
  // 1. Get HubSpot OAuth config
  const clientId = process.env.HUBSPOT_CLIENT_ID;
  const redirectUri = process.env.OAUTH_REDIRECT_URI;
  
  // 2. Generate OAuth state (CSRF protection)
  const state = randomBytes(32).toString('hex');
  const stateTimestamp = Date.now().toString();
  
  // 3. Store state in httpOnly cookie (10 min expiry)
  cookies().set('hubspot_oauth_state', `${state}:${stateTimestamp}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60, // 10 minutes
  });
  
  // 4. Build HubSpot OAuth URL
  const authUrl = `https://app.hubspot.com/oauth/authorize?${params}`;
  
  // 5. Redirect to HubSpot
  return NextResponse.redirect(authUrl);
}
```

**What happens**:
- Generates secure state token
- Stores state in cookie (with timestamp for expiration)
- Redirects user to HubSpot OAuth authorization page

**Note**: At this point, we don't know which user/tenant yet - that's determined in the callback.

---

### Step 3: User Authorizes on HubSpot

User sees HubSpot's authorization page:
- Shows app name
- Shows requested scopes (`crm.objects.deals.read`)
- User clicks "Allow"

HubSpot then redirects back to your callback URL with:
- `code` - Authorization code
- `state` - The state we sent (for CSRF validation)

---

### Step 4: OAuth Callback Endpoint

**Location**: `src/app/api/auth/hubspot/callback/route.ts`

This is where the multi-tenant magic happens:

```typescript
export async function GET(request: NextRequest) {
  // 1. Get OAuth parameters from HubSpot redirect
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  
  // 2. Validate OAuth state (CSRF protection)
  const storedState = cookies().get('hubspot_oauth_state')?.value;
  // Validates state matches and hasn't expired (10 min)
  
  // 3. Get current user (Clerk)
  const { userId } = await auth();
  // userId = "user_abc123" (from Clerk)
  
  // 4. Get tenant for user (MULTI-TENANT)
  const tenantId = await getTenantForUser(userId);
  // tenantId = "tenant_xyz" (unique per user)
  
  // 5. Exchange code for tokens
  const tokenResponse = await fetch(HUBSPOT_TOKEN_URL, {
    method: 'POST',
    body: params, // grant_type, client_id, client_secret, code, redirect_uri
  });
  
  const tokenData = await tokenResponse.json();
  // tokenData = { access_token, refresh_token, expires_in }
  
  // 6. Get portal ID from HubSpot
  const portalResponse = await fetch('https://api.hubapi.com/integrations/v1/me', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const portalData = await portalResponse.json();
  const portalId = portalData.portalId; // e.g., "12345678"
  
  // 7. Encrypt tokens
  const accessTokenEncrypted = await encryptToken(tokenData.access_token);
  const refreshTokenEncrypted = await encryptToken(tokenData.refresh_token);
  
  // 8. Store in database (TENANT-SCOPED)
  await db.hubspotIntegration.upsert({
    where: { tenant_id: tenantId }, // ← Tenant-specific!
    create: {
      tenant_id: tenantId,        // ← User A's tenant
      portal_id: portalId,         // ← User A's HubSpot portal
      access_token_encrypted: accessTokenEncrypted,
      refresh_token_encrypted: refreshTokenEncrypted,
      expires_at: expiresAt,
      scopes: ['crm.objects.deals.read'],
      is_paused: false,
    },
    update: {
      // Updates if already exists (reconnection)
      portal_id: portalId,
      access_token_encrypted: accessTokenEncrypted,
      refresh_token_encrypted: refreshTokenEncrypted,
      expires_at: expiresAt,
      updated_at: new Date(),
    },
  });
  
  // 9. Redirect to overview
  return NextResponse.redirect('/overview?connected=true');
}
```

**Key Points**:
- ✅ Uses `getTenantForUser(userId)` to get user's tenant
- ✅ Stores integration with `tenant_id` (tenant-scoped)
- ✅ Each user's HubSpot connection is stored separately
- ✅ Tokens are encrypted before storage

---

### Step 5: Token Storage (Database)

**Table**: `hubspot_integrations`

```sql
-- Example data after User A connects:
tenant_id: "tenant_abc"  -- User A's tenant
portal_id: "12345678"    -- User A's HubSpot portal
access_token_encrypted: "encrypted_string..."
refresh_token_encrypted: "encrypted_string..."
expires_at: "2024-01-15 12:00:00"
is_paused: false

-- Example data after User B connects:
tenant_id: "tenant_xyz"  -- User B's tenant (different!)
portal_id: "87654321"    -- User B's HubSpot portal (different!)
access_token_encrypted: "encrypted_string..."
refresh_token_encrypted: "encrypted_string..."
expires_at: "2024-01-15 12:00:00"
is_paused: false
```

**Important**: Each tenant has its own row. User A and User B have completely separate integrations.

---

### Step 6: Using the Connection

When User A runs a profile or fetches data:

```typescript
// 1. Get user's tenant
const tenantId = await getTenantForUser(userId); // "tenant_abc"

// 2. Get integration for that tenant
const integration = await db.hubspotIntegration.findUnique({
  where: { tenant_id: tenantId }, // Only finds User A's integration
});

// 3. Decrypt token
const accessToken = await decryptToken(integration.access_token_encrypted);

// 4. Use token for HubSpot API calls
const response = await fetch('https://api.hubapi.com/...', {
  headers: { Authorization: `Bearer ${accessToken}` },
});
```

**Result**: User A only accesses their own HubSpot data.

---

## Multi-Tenant Isolation

### How It Works:

1. **User Identification**: Clerk provides `userId` (unique per user)
2. **Tenant Resolution**: `getTenantForUser(userId)` returns tenant for that user
3. **Token Storage**: Tokens stored with `tenant_id` (one per tenant)
4. **Data Access**: All queries filtered by `tenant_id`

### Example:

```
User A (userId: "user_123")
  → Tenant: "tenant_abc"
  → HubSpot Integration: portal_id "12345678"
  → Data: Only sees deals from portal 12345678

User B (userId: "user_456")
  → Tenant: "tenant_xyz"  (different!)
  → HubSpot Integration: portal_id "87654321"  (different!)
  → Data: Only sees deals from portal 87654321
```

---

## Security Features

### 1. OAuth State Validation
- State token generated with `randomBytes(32)`
- Stored in httpOnly cookie (can't be accessed by JavaScript)
- Validated on callback (prevents CSRF attacks)
- Expires after 10 minutes

### 2. Token Encryption
- Tokens encrypted with AES-256-GCM before storage
- Uses `TOKEN_ENCRYPTION_KEY` from environment
- Decrypted only when needed for API calls

### 3. Tenant Isolation
- Each user gets their own tenant
- All queries filtered by `tenant_id`
- Users cannot access other users' data

### 4. Token Refresh
- Automatic refresh when tokens expire
- Handles refresh token expiration gracefully
- Circuit breaker prevents infinite retry loops

---

## Connection Status

The Overview page checks connection status:

```typescript
// src/app/api/profile/summary/route.ts
const tenantId = await getTenantForUser(userId);
const integration = await db.hubspotIntegration.findUnique({
  where: { tenant_id: tenantId },
});

let connectionStatus = 'disconnected';
if (integration) {
  connectionStatus = integration.is_paused ? 'paused' : 'connected';
}
```

**Result**: Each user sees their own connection status.

---

## Reconnection Flow

If a user wants to reconnect (or connect a different HubSpot account):

1. User clicks "Connect HubSpot" again
2. OAuth flow runs (same as above)
3. Callback uses `upsert` (update if exists, create if not)
4. New tokens replace old tokens for that tenant
5. User's data is refreshed on next profile run

---

## Summary

**How HubSpot Auth is Connected**:

1. ✅ **User-specific**: Each user gets their own tenant via `getTenantForUser(userId)`
2. ✅ **Token storage**: Tokens stored with `tenant_id` (one per user)
3. ✅ **Data isolation**: All queries filtered by `tenant_id`
4. ✅ **Security**: OAuth state validation, token encryption, tenant isolation
5. ✅ **Multi-tenant**: Multiple users can connect different HubSpot accounts simultaneously

**The connection is tenant-scoped**, meaning each user's HubSpot connection is completely separate and isolated.
