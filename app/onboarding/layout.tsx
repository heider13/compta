import type { ReactNode } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

// Layout dédié à l'onboarding : pas de nav globale, juste un logo en haut et un footer minimal.
// Server Component (statique).
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--ink-50)',
      }}
    >
      <header
        style={{
          borderBottom: '1px solid var(--ink-100)',
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'saturate(180%) blur(12px)',
          WebkitBackdropFilter: 'saturate(180%) blur(12px)',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 68,
          }}
        >
          <Link href="/" className="inline-flex items-center no-underline" aria-label="Legaly AI">
            <Logo size={28} textClassName="text-[19px]" />
          </Link>
          <span className="pill violet">Configuration du cabinet</span>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '48px 24px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 820 }}>{children}</div>
      </main>

      <footer
        style={{
          borderTop: '1px solid var(--ink-100)',
          padding: '20px 24px',
          textAlign: 'center',
          fontSize: 13,
          color: 'var(--ink-500)',
        }}
      >
        <span>© 2026 Legaly AI SAS · Mandataire INPI agréé · </span>
        <a href="#" style={{ color: 'var(--ink-600)' }}>
          Besoin d&apos;aide ?
        </a>
      </footer>
    </div>
  );
}
