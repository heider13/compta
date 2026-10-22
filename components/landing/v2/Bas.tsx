// Bande d'appel à l'action (dégradé violet maison) et pied de page en colonnes.

import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { Container } from '../ui';

export function CtaBand({ titre = ['Prêt à automatiser', 'vos formalités'] }: { titre?: [string, string] } = {}) {
  return (
    <section className="bg-gradient-to-b from-white to-[#fbfaff] px-3 pb-10 pt-4 sm:px-6">
      <div className="theme-fixe relative mx-auto max-w-[1400px] overflow-hidden rounded-[32px] bg-[#0e0b1a] py-20 shadow-[0_30px_80px_rgba(54,31,171,0.25)] sm:rounded-[44px] sm:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 700px 460px at 10% 0%, rgba(255,190,140,0.55), transparent 60%),' +
            'radial-gradient(ellipse 820px 520px at 55% 45%, rgba(117,81,232,0.65), transparent 65%),' +
            'radial-gradient(ellipse 700px 480px at 100% 100%, rgba(234,66,253,0.5), transparent 62%)',
        }}
      />
      <Container className="relative text-center">
        <h2 className="font-[Sora] !text-[clamp(1.9rem,4vw,3rem)] !font-semibold !text-white">{titre[0]} <span className="bg-gradient-to-r from-[#ffbe8c] via-[#ff887b] to-[#ea42fd] bg-clip-text text-transparent">{titre[1].replace(/\s*\?$/, '')}</span> ?</h2>
        <p className="!mx-auto !mt-4 max-w-2xl !text-white/75">
          Décrivez votre première formalité : l’agent prépare le dossier, les actes et le brouillon INPI. Vous validez, c’est tout.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href="/auth/signup" className="rounded-full bg-[var(--accent)] px-6 py-3 text-[15px] font-semibold !text-white no-underline shadow-[0_12px_30px_rgba(255,136,123,0.4)] transition-transform hover:-translate-y-0.5">
            Créer un compte
          </a>
          <a href="/auth/signup" className="rounded-full border border-white/40 px-6 py-3 text-[15px] font-semibold !text-white no-underline transition-colors hover:bg-white/10">
            Demander une démo
          </a>
        </div>
        <p className="!mt-4 text-xs !text-white/55">Aucun dépôt sans votre validation.</p>
      </Container>
      </div>
    </section>
  );
}

const COLONNES = [
  { titre: 'Produit', liens: [['Formalités couvertes', '/#fonctionnalites'], ['Agents IA', '/#agents'], ['Sécurité', '/#securite']] },
  { titre: 'Modules', liens: [['Agent Formalités', '/modules/agent-formalites'], ['Rédaction des documents', '/modules/redaction-documents'], ['Annonces légales', '/modules/annonces-legales'], ['Signature électronique', '/modules/signature-electronique'], ['Comptes annuels', '/modules/comptes-annuels']] },
  { titre: 'Solutions', liens: [['Experts-comptables', '/experts-comptables'], ['Avocats', '/avocats'], ['Directions juridiques', '/directions-juridiques']] },
  { titre: 'Commencer', liens: [['Créer un compte', '/auth/signup'], ['Se connecter', '/auth/login'], ['Demander une démo', '/auth/signup'], ['Nous contacter', 'mailto:support@legaly.ai']] },
] as const;

export function FooterV2() {
  return (
    <footer className="relative bg-[#fbfaff] pb-10 pt-6">
      <Container>
        <div className="flex flex-wrap items-center justify-between gap-6">
          <Link href="/" className="no-underline" aria-label="Legaly AI">
            <Logo size={36} textClassName="text-[24px]" />
          </Link>
          <p className="max-w-sm text-sm !text-[var(--ink-500)]">La plateforme d’agents IA pour les formalités juridiques des cabinets.</p>
        </div>
        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {COLONNES.map((c) => (
            <div key={c.titre}>
              <p className="text-xs font-semibold uppercase tracking-wider !text-[var(--violet-900)]">{c.titre}</p>
              <ul className="mt-4 space-y-2.5">
                {c.liens.map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="text-sm !text-[var(--ink-600)] no-underline transition-colors hover:!text-[var(--violet-700)]">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap items-baseline justify-between gap-3 border-t border-[var(--ink-100)] pt-6 text-xs text-[var(--ink-500)]">
          <span>© {new Date().getFullYear()} Legaly AI</span>
          {/* Crédits des logos affichés en haut de page (licences Wikimedia Commons) */}
          <span className="text-[11px]">
            Logos : INPI (inpi.fr) · Légifrance (CC BY 4.0), Insee (CC0) et Yousign (CC BY-SA 4.0) via Wikimedia Commons. Marques de leurs titulaires.
          </span>
        </div>
      </Container>
    </footer>
  );
}
