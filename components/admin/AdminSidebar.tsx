'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminSidebarProps {
  userLabel: string;
  userInitials: string;
  signOutAction: () => Promise<void>;
}

interface NavItem {
  href: string;
  label: string;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Tableau de bord', exact: true },
  { href: '/admin/queue', label: 'À valider' },
  { href: '/admin/dossiers', label: 'Tous les dossiers' },
  { href: '/admin/cabinets', label: 'Cabinets' },
  { href: '/admin/users', label: 'Utilisateurs' },
  { href: '/admin/audit', label: 'Audit logs' },
];

function isActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

const SIDEBAR_BG = '#1A1A1F';
const SIDEBAR_TEXT = 'rgba(255,255,255,0.75)';
const SIDEBAR_TEXT_MUTED = 'rgba(255,255,255,0.45)';
const SIDEBAR_ACTIVE_BG = 'rgba(255,255,255,0.08)';
const SIDEBAR_ACTIVE_TEXT = '#FFFFFF';
const SIDEBAR_BORDER = 'rgba(255,255,255,0.08)';

export function AdminSidebar({
  userLabel,
  userInitials,
  signOutAction,
}: AdminSidebarProps) {
  const pathname = usePathname() ?? '';

  return (
    <aside
      className="app-sidebar"
      style={{
        background: SIDEBAR_BG,
        borderRight: `1px solid ${SIDEBAR_BORDER}`,
        color: SIDEBAR_TEXT,
      }}
    >
      <div className="logo" style={{ color: '#FFFFFF', padding: '6px 10px 22px' }}>
        <span className="logo-mark">C</span>
        <span>Compta</span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            padding: '3px 7px',
            borderRadius: 999,
            background: 'var(--accent)',
            color: '#FFFFFF',
          }}
        >
          ADMIN
        </span>
      </div>

      <div className="sidebar-section" style={{ color: SIDEBAR_TEXT_MUTED }}>
        Super admin
      </div>

      {NAV_ITEMS.map((item) => {
        const active = isActive(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="sidebar-link"
            style={{
              color: active ? SIDEBAR_ACTIVE_TEXT : SIDEBAR_TEXT,
              background: active ? SIDEBAR_ACTIVE_BG : 'transparent',
              fontWeight: active ? 500 : 400,
            }}
          >
            <span>{item.label}</span>
          </Link>
        );
      })}

      <div style={{ marginTop: 'auto' }}>
        <Link
          href="/cabinet/clients"
          className="sidebar-link"
          style={{
            color: SIDEBAR_TEXT_MUTED,
            border: `1px solid ${SIDEBAR_BORDER}`,
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <span>Vue cabinet</span>
          <span aria-hidden>→</span>
        </Link>

        <div
          className="sidebar-user"
          style={{
            borderTop: `1px solid ${SIDEBAR_BORDER}`,
            color: SIDEBAR_TEXT,
          }}
        >
          <div
            className="sidebar-user-avatar"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#FFFFFF' }}
          >
            {userInitials}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                color: '#FFFFFF',
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {userLabel}
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  margin: 0,
                  cursor: 'pointer',
                  fontSize: 11,
                  color: SIDEBAR_TEXT_MUTED,
                  textAlign: 'left',
                }}
              >
                Se déconnecter
              </button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}
