'use client';

import Link from 'next/link';
import { NotificationBell } from '@/components/cabinet/NotificationBell';

interface TopBarProps {
  userLabel: string;
  userEmail: string;
  userInitials: string;
  plan?: string | null;
}

export function TopBar({ userLabel, userEmail, userInitials, plan }: TopBarProps) {
  const planLabel = (plan && plan.charAt(0).toUpperCase() + plan.slice(1)) || 'Cabinet';

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 28px',
        background: 'white',
        borderBottom: '1px solid var(--ink-100)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      {/* CTA principal : nouvelle formalité */}
      <Link
        href="/dossiers/new"
        className="btn btn-accent btn-sm"
        style={{ fontWeight: 500, padding: '8px 16px', fontSize: 13 }}
      >
        + Nouvelle formalité
      </Link>

      {/* Pill abonnement (centré sur écran large) */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <Link
          href="/billing"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 18px',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-ink))',
            color: 'white',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.02em',
            textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(91, 54, 214, 0.25)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M3 17l4-10 5 6 5-8 4 12H3z" />
          </svg>
          Abonnement {planLabel}
        </Link>
      </div>

      {/* Liens secondaires */}
      <Link href="/billing" className="btn btn-ghost btn-sm" style={{ fontSize: 12, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 14h-3l-2 7-4-14-2 7H3"/></svg>
        Grille de prix
      </Link>
      <a href="/app.html" className="btn btn-ghost btn-sm" style={{ fontSize: 12, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        Guide formalités
      </a>

      <NotificationBell />

      {/* User profile card */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '4px 10px 4px 4px',
          borderLeft: '1px solid var(--ink-100)',
          marginLeft: 6,
          paddingLeft: 16,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--accent-soft)',
            color: 'var(--accent-ink)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {userInitials}
        </div>
        <div style={{ minWidth: 0, maxWidth: 200 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {userLabel}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {userEmail}
          </div>
        </div>
      </div>
    </header>
  );
}
