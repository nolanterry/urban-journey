/**
 * HubSpot OAuth Install Endpoint
 * 
 * Initiates OAuth flow by redirecting to HubSpot authorization URL
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

const HUBSPOT_AUTH_URL = 'https://app.hubspot.com/oauth/authorize';

export async function GET() {
  const clientId = process.env.HUBSPOT_CLIENT_ID;
  const redirectUri = process.env.OAUTH_REDIRECT_URI;
  const appBaseUrl = process.env.APP_BASE_URL;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Missing HubSpot OAuth configuration' },
      { status: 500 }
    );
  }

  // Generate OAuth state parameter for CSRF protection
  const state = randomBytes(32).toString('hex');
  const stateTimestamp = Date.now().toString();

  // Store state with timestamp in httpOnly cookie (valid for 10 minutes)
  // Format: "state:timestamp" to enable timestamp validation
  const stateWithTimestamp = `${state}:${stateTimestamp}`;

  cookies().set('hubspot_oauth_state', stateWithTimestamp, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60, // 10 minutes
  });

  // Build HubSpot OAuth URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'crm.objects.deals.read', // Phase 1: Read-only scope
    state: state, // Send just the state (timestamp stored in cookie)
  });

  const authUrl = `${HUBSPOT_AUTH_URL}?${params.toString()}`;

  // Redirect to HubSpot OAuth page
  return NextResponse.redirect(authUrl);
}
