# Multi-Tenant Support: Allow Each User to Connect Their Own HubSpot

## Current State: ⚠️ NOT Multi-Tenant

**Problem**: The current implementation uses a stub that creates/finds the **first tenant**, which means:
- ❌ All users share the same tenant
- ❌ All users share the same HubSpot integration
- ❌ When User A connects HubSpot, User B sees User A's HubSpot data
- ❌ Only one HubSpot account can be connected at a time

## What Needs to Change

### Current Code (Stub Implementation)

```typescript
// src/lib/tenant.ts - CURRENT (NOT multi-tenant)
export async function getTenantForUser(userId: string): Promise<string | null> {
  // ❌ Finds FIRST tenant or creates one
  // ❌ All users get the same tenant
  const existingTenant = await db.tenant.findFirst();
  if (existingTenant) {
    return existingTenant.id; // Same tenant for everyone!
  }
  // Creates tenant, but not tied to user
  const newTenant = await db.tenant.create({
    data: { name: `Tenant for ${userId}` },
  });
  return newTenant.id;
}
```

### Required Fix: User-Tenant Mapping

We need to create a proper user-tenant mapping so each user gets their own tenant.

---

## Solution: Add User-Tenant Mapping

### Step 1: Update Database Schema

Add a `UserTenant` table to map users to tenants:

```prisma
// Add to prisma/schema.prisma

model UserTenant {
  id        String   @id @default(uuid())
  user_id   String   // Clerk user ID
  tenant_id String
  created_at DateTime @default(now())

  tenant Tenant @relation(fields: [tenant_id], references: [id], onDelete: Cascade)

  @@unique([user_id, tenant_id])
  @@index([user_id])
  @@map("user_tenants")
}

// Update Tenant model to include relation
model Tenant {
  id        String   @id @default(uuid())
  name      String
  created_at DateTime @default(now())

  // ... existing relations ...
  user_tenants UserTenant[]  // Add this line

  @@map("tenants")
}
```

### Step 2: Create Migration

```bash
cd /Users/nolanterry/portal-brain
npm run db:migrate
# Name migration: add_user_tenant_mapping
```

### Step 3: Update Tenant Resolution Logic

Replace `src/lib/tenant.ts`:

```typescript
/**
 * Tenant resolution utilities
 * 
 * Maps Clerk user IDs to tenants (one tenant per user)
 */

import { db } from '@/server/db';

/**
 * Get tenant ID for a user (creates if doesn't exist)
 * 
 * Each user gets their own tenant, allowing them to connect
 * their own HubSpot account independently.
 */
export async function getTenantForUser(userId: string): Promise<string | null> {
  // Check if user already has a tenant
  const existingMapping = await db.userTenant.findFirst({
    where: { user_id: userId },
    include: { tenant: true },
  });

  if (existingMapping) {
    return existingMapping.tenant_id;
  }

  // Create new tenant for this user
  const newTenant = await db.tenant.create({
    data: {
      name: `Tenant for ${userId}`,
    },
  });

  // Create user-tenant mapping
  await db.userTenant.create({
    data: {
      user_id: userId,
      tenant_id: newTenant.id,
    },
  });

  return newTenant.id;
}
```

### Step 4: Test Multi-Tenant Flow

1. **User A** signs in → Gets Tenant A
2. **User A** connects HubSpot → Integration stored for Tenant A
3. **User B** signs in → Gets Tenant B (different tenant)
4. **User B** connects HubSpot → Integration stored for Tenant B
5. Each user sees only their own HubSpot data

---

## How It Works After Fix

### User A Flow:
```
1. User A signs in (Clerk user_id: "user_abc123")
   ↓
2. getTenantForUser("user_abc123")
   → Creates Tenant A (or finds existing)
   → Creates UserTenant mapping
   → Returns tenant_id: "tenant_xyz"
   ↓
3. User A connects HubSpot
   → OAuth callback stores integration for tenant_id: "tenant_xyz"
   ↓
4. User A runs profile
   → Fetches data for tenant_id: "tenant_xyz"
   → Shows User A's HubSpot data
```

### User B Flow (Separate):
```
1. User B signs in (Clerk user_id: "user_def456")
   ↓
2. getTenantForUser("user_def456")
   → Creates Tenant B (different tenant!)
   → Creates UserTenant mapping
   → Returns tenant_id: "tenant_uvw"
   ↓
3. User B connects HubSpot
   → OAuth callback stores integration for tenant_id: "tenant_uvw"
   ↓
4. User B runs profile
   → Fetches data for tenant_id: "tenant_uvw"
   → Shows User B's HubSpot data (completely separate)
```

---

## Implementation Steps

### 1. Update Schema

```bash
cd /Users/nolanterry/portal-brain
# Edit prisma/schema.prisma
# Add UserTenant model (see above)
```

### 2. Run Migration

```bash
npm run db:migrate
# Name: add_user_tenant_mapping
```

### 3. Update Code

Replace `src/lib/tenant.ts` with the new implementation (see above).

### 4. Test

1. Sign in as User A
2. Connect HubSpot Account A
3. Sign out
4. Sign in as User B (different Clerk account)
5. Connect HubSpot Account B
6. Verify each user sees only their own data

---

## Verification

After implementing, verify:

```sql
-- Check user-tenant mappings
SELECT * FROM user_tenants;

-- Should show:
-- user_id: "user_abc123" → tenant_id: "tenant_xyz"
-- user_id: "user_def456" → tenant_id: "tenant_uvw"

-- Check integrations are separate
SELECT tenant_id, portal_id FROM hubspot_integrations;

-- Should show different portal_ids for different tenants
```

---

## Current vs. After Fix

| Aspect | Current (Stub) | After Fix |
|--------|----------------|-----------|
| User A connects HubSpot | ✅ Works | ✅ Works |
| User B connects HubSpot | ❌ Overwrites User A's | ✅ Creates separate integration |
| User A sees data | ✅ Their data | ✅ Their data |
| User B sees data | ❌ Sees User A's data | ✅ Their own data |
| Multiple HubSpot accounts | ❌ Only one at a time | ✅ One per user |

---

## Important Notes

1. **Data Isolation**: Each user's data is completely isolated
2. **Tenant Scoping**: All queries are tenant-scoped (already implemented)
3. **Security**: Users can only access their own tenant's data
4. **Scalability**: Supports unlimited users, each with their own HubSpot

---

## Migration Path

If you already have data in the current system:

1. **Before migration**: All users share one tenant
2. **After migration**: 
   - Existing data stays in the shared tenant
   - New users get their own tenants
   - You may want to migrate existing users' data to separate tenants

---

This fix enables true multi-tenancy where each user can connect their own HubSpot account independently!
