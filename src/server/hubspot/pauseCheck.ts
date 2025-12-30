/**
 * Pause Processing Check
 * 
 * Centralized validation to ensure processing is not paused before making HubSpot API calls
 */

import { db } from '../db';

/**
 * Check if processing is paused for a tenant
 * 
 * @param tenantId - Tenant ID to check
 * @throws Error if processing is paused
 */
export async function ensureNotPaused(tenantId: string): Promise<void> {
  const integration = await db.hubspotIntegration.findUnique({
    where: { tenant_id: tenantId },
    select: { is_paused: true },
  });

  if (!integration) {
    throw new Error(`No HubSpot integration found for tenant ${tenantId}`);
  }

  if (integration.is_paused) {
    throw new Error(`Processing is paused for this tenant`);
  }
}
