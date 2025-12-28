/**
 * HubSpot API client module
 * 
 * Handles OAuth token refresh, rate limiting, and data fetching.
 * All operations are tenant-scoped.
 */

import { db } from '../db';
import { decryptToken, encryptToken } from '../crypto';
import type {
  HubSpotTokenResponse,
  HubSpotPropertiesResponse,
  HubSpotPipelinesResponse,
  HubSpotDealsResponse,
  HubSpotDeal,
  HubSpotProperty,
  HubSpotPipeline,
} from './types';

const HUBSPOT_API_BASE = 'https://api.hubapi.com';
const HUBSPOT_TOKEN_URL = 'https://api.hubapi.com/oauth/v1/token';

// Rate limiting state (simple in-memory, could be moved to Redis in production)
const rateLimitState = new Map<string, { resetAt: number; remaining: number }>();

/**
 * Sleep utility for rate limit backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exponential backoff retry helper
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if it's a rate limit error (429)
      if (
        error instanceof Error &&
        'status' in error &&
        (error as { status: number }).status === 429
      ) {
        const resetAfter = getResetAfterFromError(error);
        if (attempt < maxRetries) {
          await sleep(resetAfter || baseDelay * Math.pow(2, attempt));
          continue;
        }
      }

      // For other errors, use exponential backoff
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Extract reset time from rate limit error
 */
function getResetAfterFromError(error: unknown): number | null {
  if (error && typeof error === 'object' && 'headers' in error) {
    const headers = (error as { headers: Headers }).headers;
    const retryAfter = headers.get('retry-after');
    if (retryAfter) {
      return parseInt(retryAfter, 10) * 1000; // Convert to milliseconds
    }
  }
  return null;
}

/**
 * Make authenticated request to HubSpot API
 */
async function hubspotRequest<T>(
  tenantId: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = await getAccessToken(tenantId);

  const url = `${HUBSPOT_API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // Update rate limit state
  updateRateLimitState(tenantId, response);

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HubSpot API error: ${response.status} ${response.statusText}`;
    
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorMessage;
    } catch {
      // Use default message
    }

    const error = new Error(errorMessage) as Error & { status: number; headers: Headers };
    error.status = response.status;
    error.headers = response.headers;
    throw error;
  }

  return response.json();
}

/**
 * Update rate limit state from response headers
 */
function updateRateLimitState(tenantId: string, response: Response) {
  const dailyLimit = response.headers.get('x-hubspot-ratelimit-daily');
  const dailyRemaining = response.headers.get('x-hubspot-ratelimit-daily-remaining');
  const rateLimitWindow = response.headers.get('x-hubspot-ratelimit-window');
  const rateLimitRemaining = response.headers.get('x-hubspot-ratelimit-remaining');

  if (rateLimitWindow && rateLimitRemaining) {
    const windowMs = parseInt(rateLimitWindow, 10) * 1000;
    const resetAt = Date.now() + windowMs;
    rateLimitState.set(tenantId, {
      resetAt,
      remaining: parseInt(rateLimitRemaining, 10),
    });
  }
}

/**
 * Check if we should wait due to rate limits
 */
async function checkRateLimit(tenantId: string): Promise<void> {
  const state = rateLimitState.get(tenantId);
  if (state && state.resetAt > Date.now() && state.remaining <= 0) {
    const waitTime = state.resetAt - Date.now();
    await sleep(waitTime);
  }
}

/**
 * Get access token for tenant, refreshing if needed
 */
async function getAccessToken(tenantId: string): Promise<string> {
  const integration = await db.hubspotIntegration.findUnique({
    where: { tenant_id: tenantId },
  });

  if (!integration) {
    throw new Error(`No HubSpot integration found for tenant ${tenantId}`);
  }

  // Check if token needs refresh (with 5 minute buffer)
  const expiresAt = integration.expires_at;
  const now = new Date();
  const buffer = 5 * 60 * 1000; // 5 minutes

  if (!expiresAt || new Date(expiresAt.getTime() - buffer) <= now) {
    await refreshAccessTokenIfNeeded(tenantId);
    // Re-fetch after refresh
    const updated = await db.hubspotIntegration.findUnique({
      where: { tenant_id: tenantId },
    });
    if (!updated) {
      throw new Error('Failed to refresh token');
    }
    return await decryptToken(updated.access_token_encrypted);
  }

  return await decryptToken(integration.access_token_encrypted);
}

/**
 * Refresh access token if needed
 */
export async function refreshAccessTokenIfNeeded(tenantId: string): Promise<void> {
  const integration = await db.hubspotIntegration.findUnique({
    where: { tenant_id: tenantId },
  });

  if (!integration) {
    throw new Error(`No HubSpot integration found for tenant ${tenantId}`);
  }

  const refreshToken = await decryptToken(integration.refresh_token_encrypted);

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.HUBSPOT_CLIENT_ID!,
    client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
    refresh_token: refreshToken,
  });

  const response = await fetch(HUBSPOT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
  }

  const data: HubSpotTokenResponse = await response.json();

  // Encrypt tokens before storing
  const accessTokenEncrypted = await encryptToken(data.access_token);
  const refreshTokenEncrypted = await encryptToken(data.refresh_token);

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  await db.hubspotIntegration.update({
    where: { tenant_id: tenantId },
    data: {
      access_token_encrypted: accessTokenEncrypted,
      refresh_token_encrypted: refreshTokenEncrypted,
      expires_at: expiresAt,
      updated_at: new Date(),
    },
  });
}

/**
 * Get HubSpot client helper (for consistency with plan, but we use direct functions)
 */
export function hubspotClientForTenant(tenantId: string) {
  return {
    tenantId,
    refreshToken: () => refreshAccessTokenIfNeeded(tenantId),
  };
}

/**
 * Fetch deal properties metadata
 */
export async function fetchDealProperties(tenantId: string): Promise<HubSpotProperty[]> {
  await checkRateLimit(tenantId);

  return retryWithBackoff(async () => {
    const response: HubSpotPropertiesResponse = await hubspotRequest(
      tenantId,
      '/crm/v3/properties/deals'
    );
    return response.results;
  });
}

/**
 * Fetch deal pipelines and stages
 */
export async function fetchDealPipelines(tenantId: string): Promise<HubSpotPipeline[]> {
  await checkRateLimit(tenantId);

  return retryWithBackoff(async () => {
    const response: HubSpotPipelinesResponse = await hubspotRequest(
      tenantId,
      '/crm/v3/pipelines/deals'
    );
    return response.results.filter((p) => !p.archived); // Filter out archived pipelines
  });
}

/**
 * Fetch deals with pagination
 * 
 * @param tenantId - Tenant ID
 * @param limit - Number of deals per page (max 100)
 * @param after - Pagination cursor (from previous page)
 * @returns Object with deals array and next cursor (if more pages available)
 */
export async function fetchDealsPaged(
  tenantId: string,
  limit = 100,
  after?: string
): Promise<{ deals: HubSpotDeal[]; nextAfter?: string }> {
  await checkRateLimit(tenantId);

  return retryWithBackoff(async () => {
    const params = new URLSearchParams({
      limit: Math.min(limit, 100).toString(),
      properties: 'all', // Fetch all properties
    });

    if (after) {
      params.append('after', after);
    }

    const response: HubSpotDealsResponse = await hubspotRequest(
      tenantId,
      `/crm/v3/objects/deals?${params.toString()}`
    );

    return {
      deals: response.results,
      nextAfter: response.paging?.next?.after,
    };
  });
}
