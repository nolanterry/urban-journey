/**
 * Profile Summary API Endpoint
 * 
 * Returns summary of portal connection status, latest run, and counts
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getTenantForUser } from '@/lib/tenant';
import { db, tenantQueries } from '@/server/db';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant for user
    const tenantId = await getTenantForUser(userId);
    if (!tenantId) {
      return NextResponse.json(
        {
          connectionStatus: 'disconnected',
          latestRun: null,
          pipelineCount: 0,
          propertyCount: 0,
          dealSampleCount: 0,
          tierAFields: [],
          tierCFields: [],
        },
        { status: 200 }
      );
    }

    // Get integration status
    const integration = await tenantQueries.getHubspotIntegration(tenantId);

    let connectionStatus: 'connected' | 'disconnected' | 'paused' = 'disconnected';
    if (integration) {
      connectionStatus = integration.is_paused ? 'paused' : 'connected';
    }

    // Get latest run
    const latestRun = await tenantQueries.getLatestProfileRun(tenantId);

    // Get counts
    const properties = await tenantQueries.getDealProperties(tenantId);
    const pipelines = await tenantQueries.getDealPipelines(tenantId);
    const dealCount = await tenantQueries.countDeals(tenantId);

    // Get latest field usage stats for tier data (Phase 2)
    const latestStatsComputation = await db.fieldUsageStat.findFirst({
      where: { tenant_id: tenantId },
      orderBy: { computed_at: 'desc' },
      select: { computed_at: true },
    });

    let tierAFields: Array<{ property_name: string; label: string }> = [];
    let tierCFields: Array<{ property_name: string; label: string }> = [];
    let tierCounts = { A: 0, B: 0, C: 0 };

    if (latestStatsComputation) {
      // Get Tier A fields
      const tierAStats = await db.fieldUsageStat.findMany({
        where: {
          tenant_id: tenantId,
          computed_at: latestStatsComputation.computed_at,
          tier: 'A',
        },
        select: { property_name: true },
        take: 10, // Limit to top 10 for summary
      });

      // Get Tier C fields
      const tierCStats = await db.fieldUsageStat.findMany({
        where: {
          tenant_id: tenantId,
          computed_at: latestStatsComputation.computed_at,
          tier: 'C',
        },
        select: { property_name: true },
        take: 10, // Limit to top 10 for summary
      });

      // Get property labels
      const propertyNames = [
        ...tierAStats.map((s) => s.property_name),
        ...tierCStats.map((s) => s.property_name),
      ];
      const relevantProperties = await db.hsDealProperty.findMany({
        where: {
          tenant_id: tenantId,
          property_name: { in: propertyNames },
        },
      });

      const propertyMap = new Map(
        relevantProperties.map((p) => [p.property_name, p.label])
      );

      tierAFields = tierAStats.map((stat) => ({
        property_name: stat.property_name,
        label: propertyMap.get(stat.property_name) || stat.property_name,
      }));

      tierCFields = tierCStats.map((stat) => ({
        property_name: stat.property_name,
        label: propertyMap.get(stat.property_name) || stat.property_name,
      }));

      // Get tier counts
      const allStats = await db.fieldUsageStat.findMany({
        where: {
          tenant_id: tenantId,
          computed_at: latestStatsComputation.computed_at,
        },
        select: { tier: true },
      });

      tierCounts = {
        A: allStats.filter((s) => s.tier === 'A').length,
        B: allStats.filter((s) => s.tier === 'B').length,
        C: allStats.filter((s) => s.tier === 'C').length,
      };
    }

    return NextResponse.json({
      connectionStatus,
      latestRun: latestRun
        ? {
            status: latestRun.status,
            startedAt: latestRun.started_at.toISOString(),
            finishedAt: latestRun.finished_at?.toISOString() || null,
            errorMessage: latestRun.error_message || null,
          }
        : null,
      pipelineCount: pipelines.length,
      propertyCount: properties.length,
      dealSampleCount: dealCount,
      tierAFields,
      tierCFields,
      tierCounts,
    });
  } catch (error) {
    logger.error('Profile summary error', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile summary' },
      { status: 500 }
    );
  }
}
