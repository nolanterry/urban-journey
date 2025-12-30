/**
 * Overview Page
 * 
 * Displays connection status, latest run status, and allows triggering profile runs
 */

'use client';

import { useEffect, useState } from 'react';

interface ProfileSummary {
  connectionStatus: 'connected' | 'disconnected' | 'paused';
  latestRun: {
    status: string;
    startedAt: string;
    finishedAt: string | null;
    errorMessage: string | null;
  } | null;
  pipelineCount: number;
  propertyCount: number;
  dealSampleCount: number;
  tierAFields: unknown[];
  tierCFields: unknown[];
}

export default function OverviewPage() {
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/profile/summary');
      if (!response.ok) {
        throw new Error('Failed to fetch summary');
      }
      const data = await response.json();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleRunProfile = async () => {
    setRunning(true);
    setError(null);

    try {
      const response = await fetch('/api/profile/run', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start profile run');
      }

      // Refresh summary after starting run
      await fetchSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!summary) {
    return <div>Error: {error || 'Failed to load summary'}</div>;
  }

  const statusColors = {
    connected: '#10b981',
    disconnected: '#ef4444',
    paused: '#f59e0b',
  };

  return (
    <div>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Portal Overview</h1>

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

      <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '2rem' }}>
        <div
          style={{
            padding: '1.5rem',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            Connection Status
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: statusColors[summary.connectionStatus],
              }}
            />
            <span style={{ textTransform: 'capitalize' }}>
              {summary.connectionStatus}
            </span>
            {summary.connectionStatus === 'disconnected' && (
              <a
                href="/api/auth/hubspot/install"
                style={{
                  marginLeft: '1rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  display: 'inline-block',
                }}
              >
                Connect HubSpot
              </a>
            )}
            {summary.connectionStatus === 'paused' && (
              <span style={{ marginLeft: '1rem', color: '#666', fontSize: '0.875rem' }}>
                Processing is paused. Check Settings to resume.
              </span>
            )}
          </div>
        </div>

        {summary.latestRun && (
          <div
            style={{
              padding: '1.5rem',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
            }}
          >
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
              Latest Run
            </h2>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div>
                <strong>Status:</strong> {summary.latestRun.status}
              </div>
              <div>
                <strong>Started:</strong>{' '}
                {new Date(summary.latestRun.startedAt).toLocaleString()}
              </div>
              {summary.latestRun.finishedAt && (
                <div>
                  <strong>Finished:</strong>{' '}
                  {new Date(summary.latestRun.finishedAt).toLocaleString()}
                </div>
              )}
              {summary.latestRun.errorMessage && (
                <div style={{ color: '#dc2626' }}>
                  <strong>Error:</strong> {summary.latestRun.errorMessage}
                </div>
              )}
            </div>
          </div>
        )}

        <div
          style={{
            padding: '1.5rem',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Stats</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                {summary.pipelineCount}
              </div>
              <div style={{ color: '#666' }}>Pipelines</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                {summary.propertyCount}
              </div>
              <div style={{ color: '#666' }}>Properties</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                {summary.dealSampleCount}
              </div>
              <div style={{ color: '#666' }}>Deals</div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <button
          onClick={handleRunProfile}
          disabled={running || summary.connectionStatus !== 'connected'}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor:
              running || summary.connectionStatus !== 'connected'
                ? '#9ca3af'
                : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor:
              running || summary.connectionStatus !== 'connected'
                ? 'not-allowed'
                : 'pointer',
            fontSize: '1rem',
            fontWeight: '500',
          }}
        >
          {running ? 'Running...' : 'Run Profile'}
        </button>
      </div>
    </div>
  );
}
