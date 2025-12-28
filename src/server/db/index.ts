/**
 * Database module - Prisma client singleton and tenant-scoped query helpers
 * 
 * All queries must be tenant-scoped for security and data isolation.
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Singleton Prisma client instance
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

/**
 * Validate that a tenant_id is provided and not empty
 */
function validateTenantId(tenantId: string | undefined | null): string {
  if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
    throw new Error('tenant_id is required and must be a non-empty string');
  }
  return tenantId.trim();
}

/**
 * Tenant-scoped query helpers
 * These ensure every query includes tenant_id filtering
 */

export const tenantQueries = {
  /**
   * Get tenant by ID
   */
  async getTenant(tenantId: string) {
    const id = validateTenantId(tenantId);
    return db.tenant.findUnique({
      where: { id },
    });
  },

  /**
   * Get HubSpot integration for tenant
   */
  async getHubspotIntegration(tenantId: string) {
    const id = validateTenantId(tenantId);
    return db.hubspotIntegration.findUnique({
      where: { tenant_id: id },
    });
  },

  /**
   * Get latest profile run for tenant
   */
  async getLatestProfileRun(tenantId: string) {
    const id = validateTenantId(tenantId);
    return db.profileRun.findFirst({
      where: { tenant_id: id },
      orderBy: { started_at: 'desc' },
    });
  },

  /**
   * Get profile runs for tenant
   */
  async getProfileRuns(tenantId: string, limit = 50) {
    const id = validateTenantId(tenantId);
    return db.profileRun.findMany({
      where: { tenant_id: id },
      orderBy: { started_at: 'desc' },
      take: limit,
    });
  },

  /**
   * Get deal properties for tenant
   */
  async getDealProperties(tenantId: string) {
    const id = validateTenantId(tenantId);
    return db.hsDealProperty.findMany({
      where: { tenant_id: id },
    });
  },

  /**
   * Get deal pipelines for tenant
   */
  async getDealPipelines(tenantId: string) {
    const id = validateTenantId(tenantId);
    return db.hsDealPipeline.findMany({
      where: { tenant_id: id },
    });
  },

  /**
   * Count deals for tenant (latest snapshot)
   */
  async countDeals(tenantId: string) {
    const id = validateTenantId(tenantId);
    const result = await db.hsDealsRaw.groupBy({
      by: ['deal_id'],
      where: {
        tenant_id: id,
        fetched_at: {
          gte: await getLatestFetchTime(id),
        },
      },
    });
    return result.length;
  },
};

/**
 * Helper to get latest fetch time (used internally)
 */
async function getLatestFetchTime(tenantId: string): Promise<Date> {
  const latest = await db.hsDealsRaw.findFirst({
    where: { tenant_id },
    orderBy: { fetched_at: 'desc' },
    select: { fetched_at: true },
  });
  // Return a date that's 1 second before the latest fetch to include all deals from that fetch
  // This handles the case where multiple deals have the same fetched_at timestamp
  if (latest?.fetched_at) {
    return new Date(latest.fetched_at.getTime() - 1000);
  }
  return new Date(0);
}
