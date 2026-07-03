import Link from 'next/link';
import { Shield } from '@/components/icons';
import { Container } from './ui';

const COLUMNS: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
  {
    title: 'Produit',
    links: [
      { label: 'Fonctionnalités', href: '#fonctionnalites' },
      { label: 'Formalités couvertes', href: '#formalites' },
      { label: 'Tarifs', href: '#tarifs' },
      { label: 'Démo', href: '/app.html' },
    ],
  },
  {
    title: 'Ressources',
    links: [
      { label: 'Documentation API', href: '#' },
      { label: "Guide d'onboarding", href: '#' },
      { label: "Centre d'aide", href: '#' },
      { label: 'Blog', href: '#' },
    ],
  },
  {
    title: 'Société',
    links: [
      { label: 'À propos', href: '#' },
      { label: 'Sécurité', href: '#' },
      { label: 'Contact', href: '#' },
      { label: 'Recrutement', href: '#' },
    ],
  },
  {
    title: 'Légal',
    links: [
      { label: 'CGU', href: '#' },
      { label: 'Politique de confidentialité', href: '#' },
      { label: 'Mentions légales', href: '#' },
      { label: 'DPA', href: '#' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-[#080331] pb-8 pt-16 text-white">
      <Container>
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5 text-white no-underline">
              <span className="grid size-9 place-items-center rounded-lg bg-[var(--accent)] text-lg font-bold text-[#080331]">
                C
              </span>
              <span className="text-2xl font-semibold tracking-tight">compta</span>
            </Link>
            <p className="mt-4 max-w-[280px] text-sm leading-relaxed text-white/60">
              La plateforme tout-en-un de formalités juridiques pour cabinets professionnels.
              Connectée au Guichet Unique INPI.
            </p>
            <div className="mt-6 flex gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 text-xs font-medium text-white/80">
                <Shield size={12} /> ISO 27001
              </span>
              <span className="inline-flex items-center rounded-full bg-white/[0.06] px-3 py-1 text-xs font-medium text-white/80">
                RGPD
              </span>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/40">
                {col.title}
              </h4>
              <ul className="grid gap-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-white/70 transition-colors hover:text-white"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-6 text-xs text-white/45">
          <span>© 2026 Compta SAS · 12 rue de la Paix, 75002 Paris</span>
          <span>RCS Paris 921 384 502 · Mandataire INPI agréé</span>
        </div>
      </Container>
    </footer>
  );
}
