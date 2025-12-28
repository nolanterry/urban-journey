/**
 * Profile Runs API Endpoint
 * 
 * Returns list of profile runs for the authenticated user's tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getTenantForUser } from '@/lib/tenant';
import { tenantQueries } from '@/server/db';

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
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Get limit from query params
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Fetch profile runs
    const runs = await tenantQueries.getProfileRuns(tenantId, limit);

    return NextResponse.json({
      runs: runs.map((run) => ({
        id: run.id,
        status: run.status,
        started_at: run.started_at.toISOString(),
        finished_at: run.finished_at?.toISOString() || null,
        error_message: run.error_message || null,
      })),
    });
  } catch (error) {
    console.error('Profile runs fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile runs' },
      { status: 500 }
    );
  }
}
