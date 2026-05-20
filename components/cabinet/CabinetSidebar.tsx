'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface CabinetSidebarProps {
  orgName: string;
  userLabel: string;
  userInitials: string;
}

interface NavItem {
  href: string;
  label: string;
  // Préfixe à matcher pour considérer le lien actif.
  matchPrefix: string;
  exact?: boolean;
  disabled?: boolean;
  // Petite icône textuelle/glyphe affichée à gauche du label (optionnel).
  glyph?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Tableau de bord', matchPrefix: '/', exact: true },
  { href: '/dossiers', label: 'Dossiers', matchPrefix: '/dossiers' },
  { href: '/tasks', label: 'Tâches', matchPrefix: '/tasks' },
  { href: '/clients', label: 'Clients', matchPrefix: '/clients' },
  { href: '/stats', label: 'Statistiques', matchPrefix: '/stats', disabled: true },
  { href: '/billing', label: 'Facturation', matchPrefix: '/billing', glyph: '€' },
];

function isActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.matchPrefix;
  return (
    pathname === item.matchPrefix || pathname.startsWith(`${item.matchPrefix}/`)
  );
}

export function CabinetSidebar({
  orgName,
  userLabel,
  userInitials,
}: CabinetSidebarProps) {
  const pathname = usePathname() ?? '';

  return (
    <aside className="app-sidebar">
      <div className="logo">
        <span className="logo-mark">C</span>
        <span>Compta</span>
      </div>

      <div className="sidebar-section">{orgName}</div>

      {NAV_ITEMS.map((item) => {
        const active = isActive(item, pathname);

        if (item.disabled) {
          return (
            <span
              key={item.href}
              className="sidebar-link"
              style={{
                opacity: 0.5,
                cursor: 'not-allowed',
                pointerEvents: 'none',
              }}
              aria-disabled="true"
              title="Bientôt disponible"
            >
              <span>
                {item.glyph && (
                  <span
                    aria-hidden="true"
                    style={{ marginRight: 8, opacity: 0.8 }}
                  >
                    {item.glyph}
                  </span>
                )}
                {item.label}
              </span>
              <span
                className="badge"
                style={{ background: 'var(--ink-300)', color: 'white' }}
              >
                bientôt
              </span>
            </span>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link${active ? ' active' : ''}`}
          >
            <span>
              {item.glyph && (
                <span aria-hidden="true" style={{ marginRight: 8, opacity: 0.8 }}>
                  {item.glyph}
                </span>
              )}
              {item.label}
            </span>
          </Link>
        );
      })}

      <div className="sidebar-user">
        <div className="sidebar-user-avatar">{userInitials}</div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              color: 'var(--ink-900)',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {userLabel}
          </div>
        </div>
      </div>
    </aside>
  );
}
