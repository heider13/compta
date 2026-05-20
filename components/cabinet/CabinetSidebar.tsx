'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface CabinetSidebarProps {
  orgName: string;
  userLabel: string;
  userInitials: string;
}

const NAV_ITEMS = [
  { href: '/clients', label: 'Clients', match: /^\/clients/ },
  { href: '/dossiers', label: 'Dossiers', match: /^\/dossiers/ },
  { href: '/tasks', label: 'Tâches', match: /^\/tasks/ },
  { href: '/stats', label: 'Stats', match: /^\/stats/ },
];

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
        const active = item.match.test(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link${active ? ' active' : ''}`}
          >
            <span>{item.label}</span>
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
