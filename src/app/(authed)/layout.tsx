/**
 * Protected layout for authenticated routes
 * Clerk middleware handles authentication - this layout provides navigation
 */

import Link from 'next/link';

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
        }}
      >
        <Link href="/overview" style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>
          Portal Brain
        </Link>
        <Link href="/overview">Overview</Link>
        <Link href="/dictionary">Dictionary</Link>
        <Link href="/runs">Runs</Link>
        <Link href="/settings">Settings</Link>
      </nav>
      <main style={{ flex: 1, padding: '2rem' }}>{children}</main>
    </div>
  );
}
