/**
 * Portal Profiler Job Runner
 * 
 * Phase 1: Read-only data ingestion and metadata collection
 * - Fetches deal properties metadata
 * - Fetches pipeline/stage metadata
 * - Fetches deals (paged, stores raw JSON)
 * - Creates profile_runs record for audit trail
 * 
 * Phase 2: Deterministic scoring logic will be added here (commented placeholders)
 */

import { db } from '../db';
import {
  fetchDealProperties,
  fetchDealPipelines,
  fetchDealsPaged,
} from '../hubspot';

/**
 * Run portal profiler for a tenant
 * 
 * Idempotent: If a run is currently 'running' for this tenant, returns early.
 * 
 * @param tenantId - Tenant ID to profile
 * @returns Profile run ID
 */
export async function runPortalProfiler(tenantId: string): Promise<string> {
  // 1. Check if integration is paused
  const integration = await db.hubspotIntegration.findUnique({
    where: { tenant_id: tenantId },
  });

  if (!integration) {
    throw new Error(`No HubSpot integration found for tenant ${tenantId}`);
  }

  if (integration.is_paused) {
    throw new Error(`Profiling is paused for tenant ${tenantId}`);
  }

  // 2. Check for existing running job (idempotency)
  const existingRun = await db.profileRun.findFirst({
    where: {
      tenant_id: tenantId,
      status: 'running',
    },
    orderBy: { started_at: 'desc' },
  });

  if (existingRun) {
    // Return existing run ID (idempotent - don't start duplicate)
    return existingRun.id;
  }

  // 3. Create profile_runs record with 'running' status
  const profileRun = await db.profileRun.create({
    data: {
      tenant_id: tenantId,
      status: 'running',
      started_at: new Date(),
    },
  });

  const runId = profileRun.id;

  try {
    // 4. Fetch and persist deal properties metadata
    await fetchAndPersistDealProperties(tenantId);

    // 5. Fetch and persist pipeline metadata
    await fetchAndPersistDealPipelines(tenantId);

    // 6. Fetch and persist deals (paged)
    await fetchAndPersistDeals(tenantId);

    // TODO Phase 2: Compute field usage stats (fill_rate, distinct_count, etc.)
    // TODO Phase 2: Calculate tier (A/B/C) based on usage patterns
    // TODO Phase 2: Store results in field_usage_stats table

    // 7. Update profile_runs to 'success'
    await db.profileRun.update({
      where: { id: runId },
      data: {
        status: 'success',
        finished_at: new Date(),
      },
    });

    return runId;
  } catch (error) {
    // Update profile_runs to 'failed' with error message
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    await db.profileRun.update({
      where: { id: runId },
      data: {
        status: 'failed',
        finished_at: new Date(),
        error_message: errorMessage.substring(0, 1000), // Limit length
      },
    });

    throw error;
  }
}

/**
 * Fetch and persist deal properties metadata
 */
async function fetchAndPersistDealProperties(tenantId: string): Promise<void> {
  const properties = await fetchDealProperties(tenantId);

  // Upsert each property (delete old, insert new snapshot)
  // For Phase 1, we do a simple replace strategy
  await db.hsDealProperty.deleteMany({
    where: { tenant_id: tenantId },
  });

  if (properties.length > 0) {
    await db.hsDealProperty.createMany({
      data: properties.map((prop) => ({
        tenant_id: tenantId,
        property_name: prop.name,
        label: prop.label,
        type: prop.type,
        field_type: prop.fieldType,
        options_json: prop.options ? JSON.parse(JSON.stringify(prop.options)) : null,
        is_custom: prop.createdAt ? true : false, // Simple heuristic: custom props have createdAt
        updated_at: new Date(),
      })),
      skipDuplicates: true,
    });
  }
}

/**
 * Fetch and persist deal pipelines metadata
 */
async function fetchAndPersistDealPipelines(tenantId: string): Promise<void> {
  const pipelines = await fetchDealPipelines(tenantId);

  // Upsert each pipeline (Prisma composite key uses field names directly)
  for (const pipeline of pipelines) {
    await db.hsDealPipeline.upsert({
      where: {
        tenant_id_pipeline_id: {
          tenant_id: tenantId,
          pipeline_id: pipeline.id,
        },
      },
      create: {
        tenant_id: tenantId,
        pipeline_id: pipeline.id,
        name: pipeline.label,
        stages_json: JSON.parse(JSON.stringify(pipeline.stages)),
        updated_at: new Date(),
      },
      update: {
        name: pipeline.label,
        stages_json: JSON.parse(JSON.stringify(pipeline.stages)),
        updated_at: new Date(),
      },
    });
  }
}

/**
 * Fetch and persist deals (paged, raw JSON)
 */
async function fetchAndPersistDeals(tenantId: string): Promise<void> {
  let after: string | undefined;
  let pageCount = 0;
  const maxPages = 1000; // Safety limit to prevent runaway jobs

  do {
    const { deals, nextAfter } = await fetchDealsPaged(tenantId, 100, after);

    if (deals.length > 0) {
      // Store raw JSON snapshots
      await db.hsDealsRaw.createMany({
        data: deals.map((deal) => ({
          tenant_id: tenantId,
          deal_id: deal.id,
          payload_json: JSON.parse(JSON.stringify(deal)),
          fetched_at: new Date(),
        })),
        skipDuplicates: true,
      });
    }

    after = nextAfter;
    pageCount++;

    if (pageCount >= maxPages) {
      console.warn(
        `Reached max pages (${maxPages}) for tenant ${tenantId}, stopping pagination`
      );
      break;
    }
  } while (after);
}
