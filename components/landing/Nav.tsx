'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Arrow } from '@/components/icons';
import { Container } from './ui';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/experts-comptables', label: 'Experts-comptables' },
  { href: '/avocats', label: 'Avocats' },
  { href: '/directions-juridiques', label: 'Dir. juridiques' },
  { href: '/#demo', label: 'Démo' },
  { href: '/#tarifs', label: 'Tarifs' },
];

// Nav superposée : transparente (texte clair) sur le hero sombre en haut de
// page, devient solide (texte foncé) dès qu'on scrolle — pour rester lisible
// sur les sections claires.
export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-colors duration-300',
        scrolled
          ? 'border-b border-[var(--ink-100)] bg-white/85 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 no-underline" aria-label="Compta">
          <span
            className={cn(
              'grid size-7 place-items-center rounded-lg text-sm font-bold transition-colors',
              scrolled ? 'bg-[var(--accent)] text-[#080331]' : 'bg-white text-[#0e0b1a]',
            )}
          >
            C
          </span>
          <span
            className={cn(
              'text-[19px] font-semibold tracking-tight transition-colors',
              scrolled ? 'text-[var(--violet-900)]' : 'text-white',
            )}
          >
            compta
          </span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={cn(
                'text-sm font-medium transition-colors duration-150',
                scrolled
                  ? 'text-[var(--ink-600)] hover:text-[var(--violet-900)]'
                  : 'text-white/80 hover:text-white',
              )}
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/auth/login"
            className={cn(
              'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-colors',
              scrolled
                ? 'border border-[var(--ink-200)] text-[var(--ink-900)] hover:bg-[var(--ink-50)]'
                : 'border border-white/25 text-white hover:bg-white/10',
            )}
          >
            Se connecter
          </a>
          <a
            href="/auth/signup"
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-transform hover:-translate-y-0.5',
              scrolled ? 'bg-[var(--accent)] text-[#080331]' : 'bg-white text-[#0e0b1a]',
            )}
          >
            <span className="hidden sm:inline">Demander une démo</span>
            <span className="sm:hidden">Démo</span>
            <Arrow size={15} />
          </a>
        </div>
      </Container>
    </nav>
  );
}
