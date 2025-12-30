/**
 * Profile Run API Endpoint
 * 
 * Triggers a portal profiling job for the authenticated user's tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getTenantForUser } from '@/lib/tenant';
import { runPortalProfiler } from '@/server/jobs/runPortalProfiler';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
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
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Check if processing is paused (early check for better API response)
    try {
      const { ensureNotPaused } = await import('@/server/hubspot/pauseCheck');
      await ensureNotPaused(tenantId);
    } catch (pauseError) {
      return NextResponse.json(
        { error: 'Profiling is paused for this tenant' },
        { status: 403 }
      );
    }

    // Start profiling job (idempotent - returns existing run ID if already running)
    const runId = await runPortalProfiler(tenantId);

    return NextResponse.json({
      runId,
      status: 'started',
      message: 'Profile run started',
    });
  } catch (error) {
    logger.error('Profile run error', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    // Handle specific error cases
    if (errorMessage.includes('paused')) {
      return NextResponse.json(
        { error: 'Profiling is paused for this tenant' },
        { status: 403 }
      );
    }

    if (errorMessage.includes('No HubSpot integration')) {
      return NextResponse.json(
        { error: 'HubSpot integration not found. Please connect your HubSpot account first.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to start profile run', details: errorMessage },
      { status: 500 }
    );
  }
}
