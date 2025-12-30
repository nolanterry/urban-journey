/**
 * Field Usage Statistics Computation
 * 
 * Phase 2: Deterministic computation of field usage metrics
 * 
 * Computes:
 * - fill_rate: percentage of deals with non-null values
 * - distinct_count: number of unique values
 * - enum_entropy: Shannon entropy for enum/select fields
 * - last_seen_nonnull_at: most recent timestamp where field had a value
 */

import { db } from '../db';
import { Prisma } from '@prisma/client';

/**
 * Compute field usage statistics for all deal properties
 * 
 * @param tenantId - Tenant ID
 * @param latestFetchTime - Timestamp of the latest deal fetch (to use consistent snapshot)
 * @returns Computed timestamp for use in tier/score updates
 */
export async function computeFieldStats(
  tenantId: string,
  latestFetchTime: Date
): Promise<Date> {
  // Get all deal properties
  const properties = await db.hsDealProperty.findMany({
    where: { tenant_id: tenantId },
  });

  const computedAt = new Date();

  if (properties.length === 0) {
    return computedAt; // No properties to compute stats for
  }

  // Get latest deals snapshot (all deals from the specified fetch time)
  // Use a small buffer to ensure we get all deals from that fetch
  const bufferMs = 1000; // 1 second buffer
  const latestDeals = await db.hsDealsRaw.findMany({
    where: {
      tenant_id: tenantId,
      fetched_at: {
        gte: new Date(latestFetchTime.getTime() - bufferMs),
        lte: new Date(latestFetchTime.getTime() + bufferMs),
      },
    },
    select: {
      payload_json: true,
    },
  });

  if (latestDeals.length === 0) {
    return computedAt; // No deals to compute stats from
  }

  const totalDeals = latestDeals.length;

  // Compute stats for each property
  for (const property of properties) {
    const propertyName = property.property_name;
    const fieldType = property.field_type;

    // Extract values for this property from all deals
    const values: (string | number | boolean | null)[] = latestDeals.map(
      (deal) => {
        const props = deal.payload_json as { properties?: Record<string, unknown> };
        return (props?.properties?.[propertyName] as string | number | boolean | null) ?? null;
      }
    );

    // Calculate fill_rate
    const nonNullCount = values.filter((v) => v !== null && v !== undefined && v !== '').length;
    const fillRate = totalDeals > 0 ? new Prisma.Decimal(nonNullCount).div(totalDeals) : new Prisma.Decimal(0);

    // Calculate distinct_count (only for non-null values)
    const nonNullValues = values.filter((v) => v !== null && v !== undefined && v !== '');
    const distinctValues = new Set(nonNullValues.map((v) => String(v)));
    const distinctCount = distinctValues.size;

    // Calculate enum_entropy (Shannon entropy) for enum/select fields
    let enumEntropy: Prisma.Decimal | null = null;
    if (
      fieldType === 'select' ||
      fieldType === 'radio' ||
      fieldType === 'checkbox' ||
      (property.options_json && Array.isArray(property.options_json))
    ) {
      enumEntropy = calculateEntropy(nonNullValues);
    }

    // Find last_seen_nonnull_at (most recent deal with non-null value)
    // Since we're using latest snapshot, use latestFetchTime as proxy
    // Phase 3 enhancement: track across historical snapshots
    let lastSeenNonnullAt: Date | null = null;
    const hasNonNullValue = nonNullValues.length > 0;
    if (hasNonNullValue) {
      lastSeenNonnullAt = latestFetchTime;
    }

    // Store or update field usage stat
    await db.fieldUsageStat.create({
      data: {
        tenant_id: tenantId,
        property_name: propertyName,
        fill_rate: fillRate,
        distinct_count: distinctCount,
        enum_entropy: enumEntropy,
        last_seen_nonnull_at: lastSeenNonnullAt,
        computed_at: computedAt,
        // tier and score will be computed in scoring.ts
      },
    });
  }

  return computedAt;
}

/**
 * Calculate Shannon entropy for a set of values
 * 
 * H(X) = -Σ P(x) * log2(P(x))
 * 
 * @param values - Array of values (will be converted to strings for comparison)
 * @returns Entropy as Decimal (0 = no diversity, higher = more diversity)
 */
function calculateEntropy(values: (string | number | boolean | null)[]): Prisma.Decimal {
  if (values.length === 0) {
    return new Prisma.Decimal(0);
  }

  // Count frequency of each value
  const frequency = new Map<string, number>();
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const key = String(value);
    frequency.set(key, (frequency.get(key) || 0) + 1);
  }

  // Calculate entropy
  let entropy = new Prisma.Decimal(0);
  const total = values.length;

  for (const count of frequency.values()) {
    const probability = new Prisma.Decimal(count).div(total);
    if (probability.gt(0)) {
      // log2(p) = ln(p) / ln(2)
      const log2p = Prisma.Decimal.ln(probability).div(Prisma.Decimal.ln(2));
      entropy = entropy.plus(probability.times(log2p));
    }
  }

  // Return absolute value (entropy is negative, so we negate it)
  return entropy.neg();
}
