/**
 * Settings Page
 * 
 * Displays HubSpot integration settings, portal info, and pause toggle
 */

'use client';

import { useEffect, useState } from 'react';

interface IntegrationInfo {
  portalId: string;
  isPaused: boolean;
}

export default function SettingsPage() {
  const [integration, setIntegration] = useState<IntegrationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // For Phase 1, we'll fetch this from the summary endpoint
    // Phase 2: Create dedicated settings API endpoint
    fetchIntegrationInfo();
  }, []);

  const fetchIntegrationInfo = async () => {
    try {
      const response = await fetch('/api/profile/summary');
      if (!response.ok) {
        throw new Error('Failed to fetch integration info');
      }
      const data = await response.json();

      // Since summary doesn't return portal ID, we'll show what we can
      // TODO: Create GET /api/settings endpoint
      setIntegration({
        portalId: 'N/A', // Will be available when we create settings API
        isPaused: data.connectionStatus === 'paused',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Settings</h1>

      {error && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '4px',
            marginBottom: '1rem',
            color: '#991b1b',
          }}
        >
          Error: {error}
        </div>
      )}

      {integration && (
        <div
          style={{
            padding: '1.5rem',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            maxWidth: '600px',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            HubSpot Integration
          </h2>

          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                Portal ID
              </div>
              <div style={{ color: '#666' }}>
                {integration.portalId}
                {integration.portalId === 'N/A' && (
                  <span style={{ fontSize: '0.875rem', marginLeft: '0.5rem' }}>
                    (Settings API endpoint coming in Phase 2)
                  </span>
                )}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                Processing Status
              </div>
              <div>
                <span
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '4px',
                    backgroundColor: integration.isPaused ? '#fef3c7' : '#d1fae5',
                    color: integration.isPaused ? '#92400e' : '#065f46',
                    fontWeight: '500',
                  }}
                >
                  {integration.isPaused ? 'Paused' : 'Active'}
                </span>
              </div>
              <div
                style={{
                  marginTop: '0.5rem',
                  fontSize: '0.875rem',
                  color: '#666',
                }}
              >
                Pause toggle UI will be available when settings API endpoint is
                implemented.
              </div>
            </div>
          </div>
        </div>
      )}

      {!integration && !error && (
        <div
          style={{
            padding: '3rem',
            textAlign: 'center',
            color: '#666',
            border: '1px dashed #e0e0e0',
            borderRadius: '8px',
          }}
        >
          <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            No HubSpot Integration
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Connect your HubSpot account to get started.
          </p>
          <a
            href="/api/auth/hubspot/install"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#2563eb',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
            }}
          >
            Connect HubSpot
          </a>
        </div>
      )}
    </div>
  );
}
