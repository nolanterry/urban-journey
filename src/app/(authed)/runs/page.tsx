/**
 * Runs Page
 * 
 * Lists all profile runs for the tenant
 */

'use client';

import { useEffect, useState } from 'react';

interface ProfileRun {
  id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  error_message: string | null;
}

export default function RunsPage() {
  const [runs, setRuns] = useState<ProfileRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRuns();
  }, []);

  const fetchRuns = async () => {
    try {
      const response = await fetch('/api/profile/runs');
      if (!response.ok) {
        throw new Error('Failed to fetch runs');
      }
      const data = await response.json();
      setRuns(data.runs);
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
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Profile Runs</h1>

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
          {error}
        </div>
      )}

      {runs.length === 0 && !error && (
        <div
          style={{
            padding: '3rem',
            textAlign: 'center',
            color: '#666',
            border: '1px dashed #e0e0e0',
            borderRadius: '8px',
          }}
        >
          No profile runs found. Run a profile from the Overview page.
        </div>
      )}

      {runs.length > 0 && (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #e0e0e0',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e0e0e0' }}>
                Status
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e0e0e0' }}>
                Started
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e0e0e0' }}>
                Finished
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e0e0e0' }}>
                Error
              </th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id}>
                <td style={{ padding: '0.75rem', border: '1px solid #e0e0e0' }}>
                  {run.status}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid #e0e0e0' }}>
                  {new Date(run.started_at).toLocaleString()}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid #e0e0e0' }}>
                  {run.finished_at
                    ? new Date(run.finished_at).toLocaleString()
                    : '-'}
                </td>
                <td
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #e0e0e0',
                    color: run.error_message ? '#dc2626' : 'inherit',
                  }}
                >
                  {run.error_message || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
