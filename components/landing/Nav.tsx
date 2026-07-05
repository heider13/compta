'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { Arrow } from '@/components/icons';
import { MODULE_LIST } from '@/lib/landing/modules';
import { PERSONA_LIST } from '@/lib/landing/personas';
import { Container } from './ui';
import { cn } from '@/lib/utils';

// Nav superposée avec méga-menu : transparente (texte clair) sur le hero violet
// sombre en haut de page, solide (texte foncé) dès qu'on scrolle ou qu'un menu
// est ouvert. Les panneaux déroulants sont toujours clairs et lisibles.
type MenuKey = 'modules' | 'solutions' | null;

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState<MenuKey>(null);
  const solid = scrolled || open !== null;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const triggerCls = cn(
    'inline-flex items-center gap-1 text-sm font-medium transition-colors duration-150',
    solid ? 'text-[var(--ink-600)] hover:text-[var(--violet-900)]' : '!text-white/80 hover:!text-white',
  );

  return (
    <nav
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        solid
          ? 'border-b border-[var(--ink-100)] bg-white/90 shadow-[0_4px_20px_rgba(43,23,105,0.06)] backdrop-blur-md'
          : 'border-b border-transparent bg-transparent',
      )}
      onMouseLeave={() => setOpen(null)}
    >
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 no-underline" aria-label="Compta">
          <span
            className={cn(
              'grid size-7 place-items-center rounded-lg text-sm font-bold transition-colors',
              solid ? 'bg-[var(--accent)] text-white' : 'bg-white text-[#0e0b1a]',
            )}
          >
            C
          </span>
          <span
            className={cn(
              'text-[19px] font-semibold tracking-tight transition-colors',
              solid ? 'text-[var(--violet-900)]' : '!text-white',
            )}
          >
            compta
          </span>
        </Link>

        {/* Menu central */}
        <div className="hidden items-center gap-7 md:flex">
          {/* Modules (méga-menu) */}
          <div className="relative" onMouseEnter={() => setOpen('modules')}>
            <button
              type="button"
              className={cn(triggerCls, solid && open === 'modules' && 'text-[var(--violet-900)]')}
              onClick={() => setOpen((v) => (v === 'modules' ? null : 'modules'))}
              aria-expanded={open === 'modules'}
            >
              Modules
              <ChevronDown className={cn('size-3.5 transition-transform', open === 'modules' && 'rotate-180')} />
            </button>
            {open === 'modules' && (
              <div className="absolute left-1/2 top-full z-50 mt-3 w-[min(92vw,660px)] -translate-x-1/2 rounded-2xl border border-[var(--ink-150)] bg-white p-4 shadow-[0_24px_60px_rgba(35,20,80,0.18)]">
                <div className="grid gap-1 sm:grid-cols-2">
                  {MODULE_LIST.map((m) => (
                    <Link
                      key={m.key}
                      href={m.href}
                      className="flex gap-3 rounded-xl p-3 no-underline transition-colors hover:bg-[var(--ink-50)]"
                      onClick={() => setOpen(null)}
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-ink)]">
                        <m.icon className="size-[18px]" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-[var(--violet-900)]">{m.title}</span>
                        <span className="mt-0.5 block text-xs leading-snug text-[var(--ink-500)]">{m.desc}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Solutions (par métier) */}
          <div className="relative" onMouseEnter={() => setOpen('solutions')}>
            <button
              type="button"
              className={cn(triggerCls, solid && open === 'solutions' && 'text-[var(--violet-900)]')}
              onClick={() => setOpen((v) => (v === 'solutions' ? null : 'solutions'))}
              aria-expanded={open === 'solutions'}
            >
              Solutions
              <ChevronDown className={cn('size-3.5 transition-transform', open === 'solutions' && 'rotate-180')} />
            </button>
            {open === 'solutions' && (
              <div className="absolute left-1/2 top-full z-50 mt-3 w-[min(92vw,360px)] -translate-x-1/2 rounded-2xl border border-[var(--ink-150)] bg-white p-3 shadow-[0_24px_60px_rgba(35,20,80,0.18)]">
                <div className="grid gap-1">
                  {PERSONA_LIST.map((p) => (
                    <Link
                      key={p.slug}
                      href={`/${p.slug}`}
                      className="rounded-xl p-3 no-underline transition-colors hover:bg-[var(--ink-50)]"
                      onClick={() => setOpen(null)}
                    >
                      <span className="block text-sm font-semibold text-[var(--violet-900)]">{p.nom}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-[var(--ink-500)]">{p.selectorPitch}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <a href="/#tarifs" className={triggerCls} onMouseEnter={() => setOpen(null)}>
            Tarifs
          </a>
          <a href="/#ressources" className={triggerCls} onMouseEnter={() => setOpen(null)}>
            Ressources
          </a>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/auth/login"
            className={cn(
              'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-colors',
              solid
                ? 'border border-[var(--ink-200)] text-[var(--ink-900)] hover:bg-[var(--ink-50)]'
                : 'border border-white/25 !text-white hover:bg-white/10',
            )}
          >
            Se connecter
          </a>
          <a
            href="/auth/signup"
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-transform hover:-translate-y-0.5',
              solid ? 'bg-[var(--accent)] text-white' : 'bg-white !text-[#0e0b1a]',
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
