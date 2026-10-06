'use client';

// En-tête commun de la rubrique « Formalités » : dossiers du cabinet et
// formalités déposées au Guichet unique, réunis sous un même menu.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderOpen, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/dossiers', label: 'Dossiers du cabinet', icon: FolderOpen },
  { href: '/inpi', label: 'Déposées à l’INPI', icon: Landmark },
];

export function FormalitesTabs() {
  const pathname = usePathname();
  return (
    <div className="space-y-3">
      <h1>Formalités</h1>
      <nav className="flex gap-1 border-b" aria-label="Formalités">
        {TABS.map((t) => {
          const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                '-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium no-underline transition-colors',
                active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <t.icon className="size-4" /> {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
