/**
 * Profile Summary API Endpoint
 * 
 * Returns summary of portal connection status, latest run, and counts
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getTenantForUser } from '@/lib/tenant';
import { db, tenantQueries } from '@/server/db';

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
      tierAFields: [], // Phase 2 placeholder
      tierCFields: [], // Phase 2 placeholder
    });
  } catch (error) {
    console.error('Profile summary error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile summary' },
      { status: 500 }
    );
  }
}
