/**
 * Dictionary Page
 * 
 * CRM Dictionary UI displaying field usage statistics, tiers, and metrics
 */

'use client';

import { useEffect, useState } from 'react';

interface DictionaryField {
  property_name: string;
  label: string;
  type: string;
  field_type: string;
  tier: 'A' | 'B' | 'C' | null;
  fill_rate: number | null;
  distinct_count: number | null;
  enum_entropy: number | null;
  score: number | null;
  last_seen_nonnull_at: string | null;
  is_custom: boolean;
}

interface DictionaryResponse {
  fields: DictionaryField[];
  computedAt: string | null;
  totalFields: number;
  tierCounts: { A: number; B: number; C: number };
}

export default function DictionaryPage() {
  const [data, setData] = useState<DictionaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<string>('all'); // 'all', 'A', 'B', 'C'
  const [sortBy, setSortBy] = useState<string>('score'); // 'score', 'fill_rate', 'name'

  useEffect(() => {
    fetchDictionaryData();
  }, [tierFilter, sortBy]);

  const fetchDictionaryData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (tierFilter !== 'all') {
        params.append('tier', tierFilter);
      }
      params.append('sortBy', sortBy);
      params.append('limit', '200');

      const response = await fetch(`/api/dictionary/fields?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dictionary data');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string | null) => {
    switch (tier) {
      case 'A':
        return { bg: '#d1fae5', text: '#065f46', border: '#10b981' };
      case 'B':
        return { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' };
      case 'C':
        return { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280', border: '#9ca3af' };
    }
  };

  const formatPercent = (value: number | null) => {
    if (value === null || value === undefined) return 'N/A';
    return `${(value * 100).toFixed(1)}%`;
  };

  if (loading) {
    return <div>Loading dictionary data...</div>;
  }

  if (error) {
    return (
      <div>
        <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>CRM Dictionary</h1>
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '4px',
            color: '#991b1b',
          }}
        >
          Error: {error}
        </div>
      </div>
    );
  }

  if (!data || data.fields.length === 0) {
    return (
      <div>
        <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>CRM Dictionary</h1>
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
            No Field Statistics Available
          </p>
          <p>
            Run a profile from the Overview page to compute field usage statistics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>CRM Dictionary</h1>

      {/* Summary Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            padding: '1rem',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
          }}
        >
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            {data.totalFields}
          </div>
          <div style={{ color: '#666' }}>Total Fields</div>
        </div>
        <div
          style={{
            padding: '1rem',
            border: '1px solid #10b981',
            borderRadius: '8px',
            backgroundColor: '#d1fae5',
          }}
        >
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#065f46' }}>
            {data.tierCounts.A}
          </div>
          <div style={{ color: '#065f46' }}>Tier A</div>
        </div>
        <div
          style={{
            padding: '1rem',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            backgroundColor: '#fef3c7',
          }}
        >
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#92400e' }}>
            {data.tierCounts.B}
          </div>
          <div style={{ color: '#92400e' }}>Tier B</div>
        </div>
        <div
          style={{
            padding: '1rem',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            backgroundColor: '#fee2e2',
          }}
        >
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#991b1b' }}>
            {data.tierCounts.C}
          </div>
          <div style={{ color: '#991b1b' }}>Tier C</div>
        </div>
      </div>

      {/* Filters and Sort */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1rem',
          alignItems: 'center',
        }}
      >
        <label>
          Filter by Tier:
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            style={{
              marginLeft: '0.5rem',
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid #e0e0e0',
            }}
          >
            <option value="all">All</option>
            <option value="A">Tier A</option>
            <option value="B">Tier B</option>
            <option value="C">Tier C</option>
          </select>
        </label>
        <label>
          Sort by:
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              marginLeft: '0.5rem',
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid #e0e0e0',
            }}
          >
            <option value="score">Score</option>
            <option value="fill_rate">Fill Rate</option>
            <option value="name">Name</option>
          </select>
        </label>
        {data.computedAt && (
          <div style={{ marginLeft: 'auto', color: '#666', fontSize: '0.875rem' }}>
            Last computed: {new Date(data.computedAt).toLocaleString()}
          </div>
        )}
      </div>

      {/* Fields Table */}
      <div style={{ overflowX: 'auto' }}>
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
                Property
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e0e0e0' }}>
                Tier
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e0e0e0' }}>
                Type
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'right', border: '1px solid #e0e0e0' }}>
                Fill Rate
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'right', border: '1px solid #e0e0e0' }}>
                Distinct
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'right', border: '1px solid #e0e0e0' }}>
                Score
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e0e0e0' }}>
                Custom
              </th>
            </tr>
          </thead>
          <tbody>
            {data.fields.map((field) => {
              const tierColor = getTierColor(field.tier);
              return (
                <tr key={field.property_name}>
                  <td style={{ padding: '0.75rem', border: '1px solid #e0e0e0' }}>
                    <div style={{ fontWeight: '500' }}>{field.label}</div>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>
                      {field.property_name}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e0e0e0' }}>
                    {field.tier ? (
                      <span
                        style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '4px',
                          backgroundColor: tierColor.bg,
                          color: tierColor.text,
                          border: `1px solid ${tierColor.border}`,
                          fontWeight: '500',
                        }}
                      >
                        Tier {field.tier}
                      </span>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e0e0e0' }}>
                    <div>{field.type}</div>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>
                      {field.field_type}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e0e0e0', textAlign: 'right' }}>
                    {formatPercent(field.fill_rate)}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e0e0e0', textAlign: 'right' }}>
                    {field.distinct_count ?? '—'}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e0e0e0', textAlign: 'right' }}>
                    {field.score !== null ? field.score.toFixed(1) : '—'}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e0e0e0' }}>
                    {field.is_custom ? (
                      <span style={{ color: '#059669' }}>Yes</span>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>No</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
