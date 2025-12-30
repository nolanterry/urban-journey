/**
 * Field Scoring and Tier Classification
 * 
 * Phase 2: Deterministic tier classification based on usage patterns
 * 
 * Tiers:
 * - Tier A: High-value, well-used fields
 * - Tier B: Moderate usage
 * - Tier C: Low usage or problematic
 */

import { db } from '../db';
import { Prisma } from '@prisma/client';

// Tier classification thresholds (configurable constants)
const TIER_A_FILL_RATE_THRESHOLD = 0.8; // 80%
const TIER_A_FILL_RATE_HIGH = 0.95; // 95% (exceptionally high)
const TIER_A_DISTINCT_COUNT_MIN = 5;
const TIER_B_FILL_RATE_MIN = 0.3; // 30%
const TIER_B_FILL_RATE_MAX = 0.8; // 80%
const TIER_B_DISTINCT_COUNT_MIN = 3;
const STALE_FIELD_DAYS = 90; // Fields not seen in 90 days are considered stale

/**
 * Calculate tier classification for a field
 * 
 * Deterministic rules:
 * - Tier A: fill_rate >= 0.8 AND distinct_count >= 5, OR fill_rate >= 0.95
 * - Tier B: fill_rate >= 0.3 AND < 0.8, OR (fill_rate < 0.3 AND distinct_count >= 3)
 * - Tier C: fill_rate < 0.3 AND distinct_count < 3, OR stale field (>90 days)
 */
export function calculateTier(
  fillRate: Prisma.Decimal | null,
  distinctCount: number | null,
  lastSeenNonnullAt: Date | null
): string {
  if (!fillRate || fillRate.isZero()) {
    return 'C'; // No usage = Tier C
  }

  const fillRateNum = fillRate.toNumber();
  const distinctCountNum = distinctCount || 0;

  // Check for stale field (not seen in 90+ days)
  if (lastSeenNonnullAt) {
    const daysSinceLastSeen =
      (Date.now() - lastSeenNonnullAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastSeen > STALE_FIELD_DAYS) {
      return 'C'; // Stale field = Tier C
    }
  }

  // Tier A: High-value, well-used fields
  if (
    (fillRateNum >= TIER_A_FILL_RATE_THRESHOLD && distinctCountNum >= TIER_A_DISTINCT_COUNT_MIN) ||
    fillRateNum >= TIER_A_FILL_RATE_HIGH
  ) {
    return 'A';
  }

  // Tier B: Moderate usage
  if (
    (fillRateNum >= TIER_B_FILL_RATE_MIN && fillRateNum < TIER_B_FILL_RATE_MAX) ||
    (fillRateNum < TIER_B_FILL_RATE_MIN && distinctCountNum >= TIER_B_DISTINCT_COUNT_MIN)
  ) {
    return 'B';
  }

  // Tier C: Low usage or problematic
  return 'C';
}

/**
 * Calculate composite score (0-100) for a field
 * 
 * Scoring formula:
 * - fill_rate weight: 40%
 * - distinct_count weight: 30% (normalized to 0-1 scale, max distinct = 100)
 * - recency weight: 30% (based on last_seen_nonnull_at, more recent = higher score)
 */
export function calculateScore(
  fillRate: Prisma.Decimal | null,
  distinctCount: number | null,
  lastSeenNonnullAt: Date | null
): Prisma.Decimal {
  if (!fillRate || fillRate.isZero()) {
    return new Prisma.Decimal(0);
  }

  const fillRateNum = fillRate.toNumber();

  // Fill rate component (0-40 points)
  const fillRateScore = new Prisma.Decimal(fillRateNum * 0.4);

  // Distinct count component (0-30 points)
  // Normalize distinct count: assume max useful distinct values is 100
  const distinctCountNum = distinctCount || 0;
  const normalizedDistinct = Math.min(distinctCountNum / 100, 1);
  const distinctScore = new Prisma.Decimal(normalizedDistinct * 0.3);

  // Recency component (0-30 points)
  // More recent = higher score
  let recencyScore = new Prisma.Decimal(0);
  if (lastSeenNonnullAt) {
    const daysSinceLastSeen =
      (Date.now() - lastSeenNonnullAt.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLastSeen <= 7) {
      recencyScore = new Prisma.Decimal(0.3); // Last 7 days = full score
    } else if (daysSinceLastSeen <= 30) {
      recencyScore = new Prisma.Decimal(0.2); // Last 30 days = 2/3 score
    } else if (daysSinceLastSeen <= 90) {
      recencyScore = new Prisma.Decimal(0.1); // Last 90 days = 1/3 score
    } else {
      recencyScore = new Prisma.Decimal(0); // Older = no score
    }
  } else {
    // No last_seen timestamp, assume it's current (full recency score)
    recencyScore = new Prisma.Decimal(0.3);
  }

  // Composite score (0-100)
  const totalScore = fillRateScore.plus(distinctScore).plus(recencyScore).times(100);

  return totalScore;
}

/**
 * Update tier and score for all field usage stats in the latest computation
 * 
 * @param tenantId - Tenant ID
 * @param computedAt - Timestamp of the computation run
 */
export async function updateTiersAndScores(
  tenantId: string,
  computedAt: Date
): Promise<void> {
  // Get all field usage stats from the latest computation
  const stats = await db.fieldUsageStat.findMany({
    where: {
      tenant_id: tenantId,
      computed_at: computedAt,
    },
  });

  for (const stat of stats) {
    const tier = calculateTier(
      stat.fill_rate,
      stat.distinct_count,
      stat.last_seen_nonnull_at
    );
    const score = calculateScore(
      stat.fill_rate,
      stat.distinct_count,
      stat.last_seen_nonnull_at
    );

    await db.fieldUsageStat.update({
      where: { id: stat.id },
      data: {
        tier,
        score,
      },
    });
  }
}
