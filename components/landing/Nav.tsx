'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { Arrow } from '@/components/icons';
import { Logo } from '@/components/brand/Logo';
import { MODULE_LIST } from '@/lib/landing/modules';
import { PERSONA_LIST } from '@/lib/landing/personas';
import { Container } from './ui';
import { ThemeToggle, useThemeSombre } from './ThemeToggle';
import { PixelMetier } from './PixelMetier';
import { cn } from '@/lib/utils';

// Nav superposée avec méga-menu : transparente (texte clair) sur le hero violet
// sombre en haut de page, solide (texte foncé) dès qu'on scrolle ou qu'un menu
// est ouvert. Les panneaux déroulants sont toujours clairs et lisibles.
type MenuKey = 'modules' | 'solutions' | null;

// surface : fond du haut de page sous la nav transparente (dark = hero sombre, light = hero clair).
// announcement : bandeau d'annonce affiché au-dessus de la nav.
export function Nav({ surface = 'dark', announcement }: { surface?: 'dark' | 'light'; announcement?: React.ReactNode } = {}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState<MenuKey>(null);
  const solid = scrolled || open !== null;
  const sombre = useThemeSombre();
  const onDark = surface === 'dark' && !solid;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const triggerCls = cn(
    'inline-flex items-center gap-1 text-sm font-medium transition-colors duration-150',
    !onDark ? 'text-[var(--ink-600)] hover:text-[var(--violet-900)]' : '!text-white/80 hover:!text-white',
  );

  return (
    <nav
      className={cn(
        // En haut de page : barre intégrée au hero. Au défilement : pilule blanche détachée.
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled ? 'px-3 pt-3 sm:px-4' : open !== null ? 'bg-white/95 shadow-[0_4px_20px_rgba(43,23,105,0.06)] backdrop-blur-md' : 'bg-transparent',
      )}
      onMouseLeave={() => setOpen(null)}
    >
      {/* Bannière : une ligne colorée tout en haut des pages */}
      {!scrolled && (
        <div className="bg-gradient-to-r from-[#361fab] via-[#ea42fd] to-[#ff887b] py-1.5 text-center text-[12.5px] font-medium tracking-wide !text-white">
          Des agents IA au service des formalités juridiques
        </div>
      )}
      {/* Barre des publics (comme Pennylane) : un onglet par métier, l'actif souligné */}
      {!scrolled && (
        <div className="border-b border-[var(--ink-100)] bg-white/90 backdrop-blur-md">
          <Container className="flex h-10 items-center justify-between gap-4">
            <div className="-mb-px flex h-full items-stretch gap-5 overflow-x-auto [scrollbar-width:none] sm:gap-7 [&::-webkit-scrollbar]:hidden">
              {PERSONA_LIST.map((p) => {
                const actif = pathname === `/${p.slug}`;
                return (
                  <Link
                    key={p.slug}
                    href={`/${p.slug}`}
                    className={cn(
                      'flex shrink-0 items-center border-b-2 text-[13px] no-underline transition-colors sm:text-sm',
                      actif ? 'border-[var(--violet-900)] font-semibold !text-[var(--violet-900)]' : 'border-transparent !text-[var(--ink-500)] hover:!text-[var(--violet-900)]',
                    )}
                  >
                    {p.nom}
                  </Link>
                );
              })}
            </div>
            {announcement && <p className="hidden truncate text-[12px] font-medium !text-[var(--ink-500)] lg:block">{announcement}</p>}
          </Container>
        </div>
      )}
      <Container
        className={cn(
          'relative flex items-center justify-between gap-4 transition-all duration-300',
          scrolled
            ? 'h-[64px] max-w-6xl rounded-full border border-[var(--ink-100)] bg-white/95 !px-4 shadow-[0_12px_40px_rgba(43,23,105,0.14)] backdrop-blur-md sm:!px-6'
            : 'h-[72px]',
        )}
      >
        <Link href="/" className="flex items-center no-underline" aria-label="Legaly AI">
          <Logo
            size={40}
            onDark={onDark || sombre}
            className="gap-2.5"
            textClassName={cn('text-[26px] transition-colors', (onDark || sombre) && '!text-white')}
          />
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
          </div>

          <a href="/#agents" className={triggerCls} onMouseEnter={() => setOpen(null)}>
            Agents IA
          </a>
        </div>

        {open && <MegaMenu menu={open} fermer={() => setOpen(null)} />}

        <div className="flex items-center gap-2.5">
          <ThemeToggle
            className={!onDark ? 'border-[var(--ink-200)] text-[var(--ink-700)] hover:bg-[var(--ink-50)]' : 'border-white/25 !text-white hover:bg-white/10'}
          />
          <a
            href="/auth/login"
            className={cn(
              'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-colors',
              !onDark
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
              !onDark ? 'bg-[var(--accent)] text-white' : 'bg-white !text-[#0e0b1a]',
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

// ── Méga-menu (esprit Lovable) : grand panneau clair, titres et descriptions sans
// icônes en colonnes, et une colonne teintée à droite pour les cas d'usage.
type Lien = { href: string; titre: string; desc: string; pixel?: string };

const CIRCUIT = ['agent-formalites', 'redaction-documents', 'annonces-legales', 'signature-electronique', 'suivi-paiements', 'regularisations'];

function liensModules(cles: string[]): Lien[] {
  return cles.flatMap((k) => {
    const m = MODULE_LIST.find((x) => x.key === k);
    return m ? [{ href: m.href, titre: m.title, desc: m.desc }] : [];
  });
}

const MENUS: Record<Exclude<MenuKey, null>, { gauche: string; liens: Lien[]; droite: string; cas: Lien[] }> = {
  modules: {
    gauche: 'Le circuit de la formalité',
    liens: liensModules(CIRCUIT),
    droite: 'Aussi dans Legaly',
    cas: liensModules(MODULE_LIST.map((m) => m.key).filter((k) => !CIRCUIT.includes(k))),
  },
  solutions: {
    gauche: 'À qui s’adresse Legaly ?',
    liens: PERSONA_LIST.map((p) => ({ href: `/${p.slug}`, titre: p.nom, desc: p.selectorPitch, pixel: p.slug })),
    droite: 'Cas d’usage',
    cas: [
      { href: '/independants-tpe', titre: 'Créer une société', desc: 'Statuts, annonce et dossier préparés pour vous.' },
      { href: '/modules/formalites-en-lot', titre: 'Formalités en lot', desc: 'Tout un portefeuille en une seule demande.' },
      { href: '/modules/comptes-annuels', titre: 'Dépôt des comptes annuels', desc: 'Approbation, affectation et dépôt au greffe.' },
      { href: '/modules/annonces-legales', titre: 'Annonce légale seule', desc: 'Rédigée par l’IA, même à partir de vos statuts.' },
    ],
  },
};

function LienMenu({ l, fermer }: { l: Lien; fermer: () => void }) {
  return (
    <Link href={l.href} onClick={fermer} className="group block rounded-xl px-3 py-2.5 no-underline transition-colors hover:bg-[#080331]/[0.04]">
      <span className="flex items-center gap-2 text-[16px] font-medium leading-snug text-[var(--violet-900)]">
        {l.pixel && <PixelMetier metier={l.pixel} className="size-5" />}
        {l.titre}
      </span>
      <span className="mt-0.5 block text-[13px] leading-snug text-[var(--ink-500)]">{l.desc}</span>
    </Link>
  );
}

function MegaMenu({ menu, fermer }: { menu: Exclude<MenuKey, null>; fermer: () => void }) {
  const d = MENUS[menu];
  return (
    // Le pt-2 (et non un mt) garde la souris « dans » la nav entre la barre et le panneau
    <div className="absolute left-1/2 top-full z-50 hidden w-[min(94vw,960px)] -translate-x-1/2 pt-2 md:block">
      <div className="grid overflow-hidden rounded-[22px] border border-[#080331]/[0.08] bg-[#fcfbff] shadow-[0_24px_60px_rgba(35,20,80,0.16)] animate-[menu-entree_.18s_ease-out] lg:grid-cols-[1.75fr_1fr]">
        <div className="p-7">
          <p className="px-3 text-[13px] text-[var(--ink-500)]">{d.gauche}</p>
          <div className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {d.liens.map((l) => <LienMenu key={l.href + l.titre} l={l} fermer={fermer} />)}
          </div>
        </div>
        <div className="bg-[var(--violet-50)] p-7">
          <p className="px-3 text-[13px] text-[var(--ink-500)]">{d.droite}</p>
          <div className="mt-3 grid gap-y-1">
            {d.cas.map((l) => <LienMenu key={l.href + l.titre} l={l} fermer={fermer} />)}
          </div>
        </div>
      </div>
      <style>{`@keyframes menu-entree { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}
