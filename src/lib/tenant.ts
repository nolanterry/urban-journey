/**
 * Tenant resolution utilities
 * 
 * Phase 1: Simple stub - assumes 1 tenant per user
 * Phase 2: Implement proper user->tenant mapping
 */

import { db } from '@/server/db';

/**
 * Get tenant ID for a user (stub implementation)
 * For Phase 1, returns the first tenant or creates one
 */
export async function getTenantForUser(userId: string): Promise<string | null> {
  // TODO Phase 2: Implement proper user->tenant mapping table
  // For now, find first tenant or create a default one
  const existingTenant = await db.tenant.findFirst();

  if (existingTenant) {
    return existingTenant.id;
  }

  // Create a default tenant (this is a stub - in production, this should be tied to user)
  const newTenant = await db.tenant.create({
    data: {
      name: `Tenant for ${userId}`,
    },
  });

  return newTenant.id;
}
