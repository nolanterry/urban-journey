/**
 * HubSpot OAuth Callback Endpoint
 * 
 * Handles OAuth callback, exchanges code for tokens, stores encrypted tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/server/db';
import { encryptToken } from '@/server/crypto';
import { getTenantForUser } from '@/lib/tenant';
import { auth } from '@clerk/nextjs/server';
import { logger } from '@/lib/logger';

const HUBSPOT_TOKEN_URL = 'https://api.hubapi.com/oauth/v1/token';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for OAuth error
    if (error) {
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    // Validate code
    if (!code) {
      return NextResponse.redirect(
        new URL('/?error=missing_code', request.url)
      );
    }

    // Validate state (CSRF protection)
    const storedStateWithTimestamp = cookies().get('hubspot_oauth_state')?.value;
    
    if (!storedStateWithTimestamp) {
      logger.warn('OAuth callback: No stored state found');
      return NextResponse.redirect(
        new URL('/?error=invalid_state', request.url)
      );
    }

    // Parse state and timestamp (format: "state:timestamp")
    const [storedState, storedTimestampStr] = storedStateWithTimestamp.split(':');
    
    if (!state || !storedState || state !== storedState) {
      logger.warn('OAuth callback: State mismatch (without exposing values)');
      cookies().delete('hubspot_oauth_state');
      return NextResponse.redirect(
        new URL('/?error=invalid_state', request.url)
      );
    }

    // Validate timestamp (state expires after 10 minutes)
    const stateMaxAge = 10 * 60 * 1000; // 10 minutes in milliseconds
    const storedTimestamp = parseInt(storedTimestampStr || '0', 10);
    const now = Date.now();
    
    if (!storedTimestamp || isNaN(storedTimestamp) || now - storedTimestamp > stateMaxAge) {
      logger.warn('OAuth callback: State expired');
      cookies().delete('hubspot_oauth_state');
      return NextResponse.redirect(
        new URL('/?error=state_expired', request.url)
      );
    }

    // Clear state cookie after successful validation
    cookies().delete('hubspot_oauth_state');

    // Get current user (Clerk)
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(
        new URL('/?error=not_authenticated', request.url)
      );
    }

    // Get tenant for user (stub - Phase 1)
    const tenantId = await getTenantForUser(userId);
    if (!tenantId) {
      return NextResponse.redirect(
        new URL('/?error=tenant_not_found', request.url)
      );
    }

    // Exchange code for tokens
    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
    const redirectUri = process.env.OAUTH_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.redirect(
        new URL('/?error=oauth_config_missing', request.url)
      );
    }

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code: code,
    });

    const tokenResponse = await fetch(HUBSPOT_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logger.error('Token exchange failed', new Error(errorText));
      return NextResponse.redirect(
        new URL('/?error=token_exchange_failed', request.url)
      );
    }

    const tokenData: TokenResponse = await tokenResponse.json();

    // Get portal ID from HubSpot API (we need it for the integration record)
    const portalResponse = await fetch('https://api.hubapi.com/integrations/v1/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!portalResponse.ok) {
      return NextResponse.redirect(
        new URL('/?error=portal_fetch_failed', request.url)
      );
    }

    const portalData = await portalResponse.json();
    const portalId = portalData.portalId?.toString() || 'unknown';

    // Encrypt tokens before storing
    const accessTokenEncrypted = await encryptToken(tokenData.access_token);
    const refreshTokenEncrypted = await encryptToken(tokenData.refresh_token);

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Upsert integration record
    await db.hubspotIntegration.upsert({
      where: { tenant_id: tenantId },
      create: {
        tenant_id: tenantId,
        portal_id: portalId,
        access_token_encrypted: accessTokenEncrypted,
        refresh_token_encrypted: refreshTokenEncrypted,
        expires_at: expiresAt,
        scopes: ['crm.objects.deals.read'],
        is_paused: false,
      },
      update: {
        portal_id: portalId,
        access_token_encrypted: accessTokenEncrypted,
        refresh_token_encrypted: refreshTokenEncrypted,
        expires_at: expiresAt,
        scopes: ['crm.objects.deals.read'],
        updated_at: new Date(),
      },
    });

    // Redirect to dashboard
    const appBaseUrl = process.env.APP_BASE_URL || request.url.split('/api')[0];
    return NextResponse.redirect(new URL('/overview?connected=true', appBaseUrl));
  } catch (error) {
    logger.error('OAuth callback error', error);
    return NextResponse.redirect(
      new URL('/?error=callback_error', request.url)
    );
  }
}
