'use client';

// En-tête commun de la rubrique « Formalités » : dossiers du cabinet et
// formalités déposées au Guichet unique et dépôts de comptes annuels, réunis sous un même menu.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpenCheck, FolderOpen, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/cabinet/PageHeader';

const TABS = [
  { href: '/dossiers', label: 'Dossiers du cabinet', short: 'Dossiers', icon: FolderOpen },
  { href: '/inpi', label: 'Déposées à l’INPI', short: 'INPI', icon: Landmark },
  { href: '/inpi/comptes', label: 'Comptes annuels', short: 'Comptes', icon: BookOpenCheck },
];

// Onglet actif : le chemin le plus précis l'emporte (/inpi/comptes avant /inpi).
const actif = (pathname: string) =>
  [...TABS].sort((a, b) => b.href.length - a.href.length).find((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))?.href;

export function FormalitesTabs({
  description,
  actions,
}: {
  description?: React.ReactNode;
  actions?: React.ReactNode;
} = {}) {
  const pathname = usePathname();
  const courant = actif(pathname);
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Pilotage" title="Formalités" description={description} actions={actions} />
      <nav className="-mx-4 flex gap-1 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0" aria-label="Formalités">
        {TABS.map((t) => {
          const active = courant === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                '-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <t.icon className={cn('size-4', active ? 'text-primary' : 'text-muted-foreground/70')} />
              <span className="sm:hidden">{t.short}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
