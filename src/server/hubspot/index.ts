/**
 * HubSpot API client module
 * 
 * Handles OAuth token refresh, rate limiting, and data fetching.
 * All operations are tenant-scoped.
 */

import { db } from '../db';
import { decryptToken, encryptToken } from '../crypto';
import { logger } from '@/lib/logger';
import { ensureNotPaused } from './pauseCheck';
import {
  isCircuitOpen,
  recordSuccess,
  recordFailure,
} from './circuitBreaker';
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
 * Exponential backoff retry helper with jitter and circuit breaker
 * 
 * Prevents thundering herd problem with jitter and respects rate limits.
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
  circuitKey?: string
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      
      // Record success in circuit breaker if key provided
      if (circuitKey) {
        recordSuccess(circuitKey);
      }
      
      return result;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check circuit breaker if key provided
      if (circuitKey && isCircuitOpen(circuitKey)) {
        throw new Error('Circuit breaker is open due to repeated failures');
      }

      // Check if it's a rate limit error (429)
      if (
        error instanceof Error &&
        'status' in error &&
        (error as { status: number }).status === 429
      ) {
        const resetAfter = getResetAfterFromError(error);
        if (attempt < maxRetries && resetAfter) {
          // Use the rate limit reset time, add small jitter
          const jitter = Math.random() * 1000;
          await sleep(resetAfter + jitter);
          continue;
        }
      }

      // For other errors, use exponential backoff with jitter
      if (attempt < maxRetries) {
        const exponentialDelay = baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 0.3 * exponentialDelay; // Up to 30% jitter
        const delay = exponentialDelay + jitter;
        await sleep(Math.min(delay, 30000)); // Cap at 30 seconds
        continue;
      }

      // Record failure in circuit breaker if key provided
      if (circuitKey) {
        recordFailure(circuitKey);
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
 * 
 * Includes timeout handling and proper error propagation
 */
async function hubspotRequest<T>(
  tenantId: string,
  endpoint: string,
  options: RequestInit = {},
  timeoutMs = 30000 // 30 second default timeout
): Promise<T> {
  const accessToken = await getAccessToken(tenantId);

  const url = `${HUBSPOT_API_BASE}${endpoint}`;
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

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
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    
    throw error;
  }
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
  // Check if processing is paused before attempting token operations
  await ensureNotPaused(tenantId);

  const integration = await db.hubspotIntegration.findUnique({
    where: { tenant_id: tenantId },
  });

  if (!integration) {
    throw new Error(`No HubSpot integration found for tenant ${tenantId}`);
  }

  // Check if token needs refresh (with 5 minute buffer for clock skew and network latency)
  const expiresAt = integration.expires_at;
  const now = new Date();
  const buffer = 5 * 60 * 1000; // 5 minutes buffer

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
 * 
 * Implements exponential backoff, handles refresh token expiration,
 * and uses circuit breaker to prevent infinite retry loops.
 */
export async function refreshAccessTokenIfNeeded(tenantId: string): Promise<void> {
  // Check if processing is paused before attempting refresh
  await ensureNotPaused(tenantId);

  const circuitKey = `refresh:${tenantId}`;

  // Check circuit breaker
  if (isCircuitOpen(circuitKey)) {
    throw new Error('Token refresh circuit is open due to repeated failures');
  }

  const integration = await db.hubspotIntegration.findUnique({
    where: { tenant_id: tenantId },
  });

  if (!integration) {
    throw new Error(`No HubSpot integration found for tenant ${tenantId}`);
  }

  const refreshToken = await decryptToken(integration.refresh_token_encrypted);

  // Retry logic with exponential backoff
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
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

        // Handle refresh token expiration (401)
        if (response.status === 401) {
          recordFailure(circuitKey);
          throw new Error(
            'Refresh token expired or invalid. Re-authorization required.'
          );
        }

        // For other errors, retry with backoff
        if (attempt < maxRetries - 1) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10s
          const jitter = Math.random() * 1000; // Add jitter
          await sleep(backoffMs + jitter);
          lastError = new Error(`Token refresh failed: ${response.status}`);
          continue;
        }

        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data: HubSpotTokenResponse = await response.json();

      // Validate expiration time (with buffer for clock skew)
      const expiresIn = data.expires_in;
      if (!expiresIn || expiresIn < 60) {
        // Token expires in less than 1 minute, something is wrong
        throw new Error('Invalid token expiration time received');
      }

      // Encrypt tokens before storing
      const accessTokenEncrypted = await encryptToken(data.access_token);
      const refreshTokenEncrypted = await encryptToken(data.refresh_token);

      // Calculate expiration with 2-minute buffer for clock skew
      const expiresAt = new Date(Date.now() + (expiresIn - 120) * 1000);

      await db.hubspotIntegration.update({
        where: { tenant_id: tenantId },
        data: {
          access_token_encrypted: accessTokenEncrypted,
          refresh_token_encrypted: refreshTokenEncrypted,
          expires_at: expiresAt,
          updated_at: new Date(),
        },
      });

      // Success - reset circuit breaker
      recordSuccess(circuitKey);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on refresh token expiration
      if (lastError.message.includes('Refresh token expired')) {
        recordFailure(circuitKey);
        throw lastError;
      }

      // Last attempt failed
      if (attempt === maxRetries - 1) {
        recordFailure(circuitKey);
        throw lastError;
      }
    }
  }

  // Should not reach here, but handle it
  recordFailure(circuitKey);
  throw lastError || new Error('Token refresh failed after retries');
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
  await ensureNotPaused(tenantId);
  await checkRateLimit(tenantId);

  const circuitKey = `fetchPipelines:${tenantId}`;

  return retryWithBackoff(
    async () => {
      const response: HubSpotPipelinesResponse = await hubspotRequest(
        tenantId,
        '/crm/v3/pipelines/deals'
      );
      return response.results.filter((p) => !p.archived); // Filter out archived pipelines
    },
    3, // maxRetries
    1000, // baseDelay
    circuitKey
  );
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
  await ensureNotPaused(tenantId);
  await checkRateLimit(tenantId);

  const circuitKey = `fetchDeals:${tenantId}`;

  return retryWithBackoff(
    async () => {
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
    },
    3, // maxRetries
    1000, // baseDelay
    circuitKey
  );
}
