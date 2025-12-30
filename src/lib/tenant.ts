/**
 * Tenant resolution utilities
 * 
 * Maps Clerk user IDs to tenants (one tenant per user)
 * Each user gets their own tenant, allowing them to connect
 * their own HubSpot account independently.
 */

import { db } from '@/server/db';

/**
 * Get tenant ID for a user (creates if doesn't exist)
 * 
 * Each user gets their own tenant, enabling multi-tenant support
 * where each user can connect their own HubSpot account.
 * 
 * @param userId - Clerk user ID
 * @returns Tenant ID for the user
 */
export async function getTenantForUser(userId: string): Promise<string | null> {
  // Check if user already has a tenant mapping
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
