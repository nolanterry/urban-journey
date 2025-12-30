/**
 * Public Landing Page
 * 
 * Simple landing page with sign-in button
 */

'use client';

import { SignInButton } from '@clerk/nextjs';
import Link from 'next/link';

export default function PublicPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem', fontWeight: 'bold' }}>
        Portal Brain
      </h1>
      <p style={{ fontSize: '1.25rem', color: '#666', marginBottom: '3rem', textAlign: 'center' }}>
        HubSpot Portal Intelligence
        <br />
        <span style={{ fontSize: '1rem' }}>
          A senior RevOps operator looking at your HubSpot portal and telling you the truth.
        </span>
      </p>

      <div
        style={{
          padding: '2rem',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          backgroundColor: '#f9fafb',
          textAlign: 'center',
        }}
      >
        <p style={{ marginBottom: '1.5rem', color: '#374151' }}>
          Get started by signing in
        </p>
        <SignInButton mode="modal">
          <button
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
            }}
          >
            Sign In
          </button>
        </SignInButton>
      </div>

      <div style={{ marginTop: '3rem', fontSize: '0.875rem', color: '#9ca3af' }}>
        Already signed in? <Link href="/overview" style={{ color: '#2563eb' }}>Go to Dashboard</Link>
      </div>
    </div>
  );
}
