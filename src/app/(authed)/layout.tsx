/**
 * Protected layout for authenticated routes
 * Clerk middleware handles authentication - this layout provides navigation
 */

'use client';

import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';

export default function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav
        style={{
          borderBottom: '1px solid #e0e0e0',
          padding: '1rem 2rem',
          display: 'flex',
          gap: '2rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <Link href="/overview" style={{ fontWeight: 'bold', fontSize: '1.25rem', textDecoration: 'none', color: 'inherit' }}>
            Portal Brain
          </Link>
          <Link href="/overview" style={{ textDecoration: 'none', color: 'inherit' }}>Overview</Link>
          <Link href="/dictionary" style={{ textDecoration: 'none', color: 'inherit' }}>Dictionary</Link>
          <Link href="/runs" style={{ textDecoration: 'none', color: 'inherit' }}>Runs</Link>
          <Link href="/settings" style={{ textDecoration: 'none', color: 'inherit' }}>Settings</Link>
        </div>
        <UserButton afterSignOutUrl="/" />
      </nav>
      <main style={{ flex: 1, padding: '2rem' }}>{children}</main>
    </div>
  );
}
