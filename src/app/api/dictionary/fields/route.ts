/**
 * Dictionary Fields API Endpoint
 * 
 * Returns field usage statistics for the CRM Dictionary UI
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getTenantForUser } from '@/lib/tenant';
import { db } from '@/server/db';
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
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Get query parameters for filtering/sorting
    const searchParams = request.nextUrl.searchParams;
    const tier = searchParams.get('tier'); // Filter by tier (A, B, C)
    const sortBy = searchParams.get('sortBy') || 'score'; // Sort by: score, fill_rate, name
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // Get latest computed field usage stats
    const latestComputation = await db.fieldUsageStat.findFirst({
      where: { tenant_id: tenantId },
      orderBy: { computed_at: 'desc' },
      select: { computed_at: true },
    });

    if (!latestComputation) {
      return NextResponse.json({
        fields: [],
        computedAt: null,
        totalFields: 0,
        tierCounts: { A: 0, B: 0, C: 0 },
      });
    }

    // Build where clause
    const where: {
      tenant_id: string;
      computed_at: Date;
      tier?: string;
    } = {
      tenant_id: tenantId,
      computed_at: latestComputation.computed_at,
    };

    if (tier && ['A', 'B', 'C'].includes(tier)) {
      where.tier = tier;
    }

    // Get field usage stats
    let orderBy: Array<{ [key: string]: 'asc' | 'desc' }> = [];
    if (sortBy === 'score') {
      orderBy = [{ score: 'desc' }, { property_name: 'asc' }];
    } else if (sortBy === 'fill_rate') {
      orderBy = [{ fill_rate: 'desc' }, { property_name: 'asc' }];
    } else {
      orderBy = [{ property_name: 'asc' }];
    }

    const stats = await db.fieldUsageStat.findMany({
      where,
      orderBy,
      take: limit,
    });

    // Get property metadata to join with stats
    const propertyNames = stats.map((stat) => stat.property_name);
    const properties = await db.hsDealProperty.findMany({
      where: {
        tenant_id: tenantId,
        property_name: { in: propertyNames },
      },
    });

    // Create a map for quick lookup
    const propertyMap = new Map(properties.map((p) => [p.property_name, p]));

    // Combine stats with property metadata
    const fields = stats.map((stat) => {
      const property = propertyMap.get(stat.property_name);
      return {
        property_name: stat.property_name,
        label: property?.label || stat.property_name,
        type: property?.type || 'unknown',
        field_type: property?.field_type || 'unknown',
        tier: stat.tier || null,
        fill_rate: stat.fill_rate ? stat.fill_rate.toNumber() : null,
        distinct_count: stat.distinct_count || null,
        enum_entropy: stat.enum_entropy ? stat.enum_entropy.toNumber() : null,
        score: stat.score ? stat.score.toNumber() : null,
        last_seen_nonnull_at: stat.last_seen_nonnull_at?.toISOString() || null,
        is_custom: property?.is_custom || false,
      };
    });

    // Get tier counts (all fields from latest computation)
    const allStats = await db.fieldUsageStat.findMany({
      where: {
        tenant_id: tenantId,
        computed_at: latestComputation.computed_at,
      },
      select: { tier: true },
    });

    const tierCounts = {
      A: allStats.filter((s) => s.tier === 'A').length,
      B: allStats.filter((s) => s.tier === 'B').length,
      C: allStats.filter((s) => s.tier === 'C').length,
    };

    return NextResponse.json({
      fields,
      computedAt: latestComputation.computed_at.toISOString(),
      totalFields: allStats.length,
      tierCounts,
    });
  } catch (error) {
    logger.error('Dictionary fields fetch error', error);
    return NextResponse.json(
      { error: 'Failed to fetch dictionary fields' },
      { status: 500 }
    );
  }
}
