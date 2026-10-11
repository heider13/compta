// Bande d'appel à l'action (dégradé violet maison) et pied de page en colonnes.

import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { Container } from '../ui';

export function CtaBand() {
  return (
    <section className="relative overflow-hidden bg-[#0e0b1a] py-20">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 700px 420px at 15% 0%, rgba(255,190,140,0.35), transparent 60%),' +
            'radial-gradient(ellipse 800px 500px at 60% 40%, rgba(117,81,232,0.45), transparent 65%),' +
            'radial-gradient(ellipse 600px 420px at 100% 100%, rgba(234,66,253,0.25), transparent 62%)',
        }}
      />
      <Container className="relative text-center">
        <h2 className="font-[Sora] !text-[clamp(1.9rem,4vw,3rem)] !font-semibold !text-white">Prêt à automatiser vos formalités ?</h2>
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
    </section>
  );
}

const COLONNES = [
  { titre: 'Produit', liens: [['Formalités couvertes', '/#fonctionnalites'], ['Agents IA', '/#agents'], ['Sécurité', '/#securite'], ['Tarifs', '/#tarifs']] },
  { titre: 'Formalités', liens: [['Création de société', '/#fonctionnalites'], ['Modifications', '/#fonctionnalites'], ['Dissolution et liquidation', '/#fonctionnalites'], ['Annonces légales', '/#fonctionnalites']] },
  { titre: 'Solutions', liens: [['Experts-comptables', '/experts-comptables'], ['Avocats', '/avocats'], ['Directions juridiques', '/directions-juridiques']] },
  { titre: 'Commencer', liens: [['Créer un compte', '/auth/signup'], ['Se connecter', '/auth/login'], ['Demander une démo', '/auth/signup'], ['Nous contacter', 'mailto:support@legaly.ai']] },
] as const;

export function FooterV2() {
  return (
    <footer className="border-t border-[var(--ink-100)] bg-[#fbfaff] pb-10 pt-14">
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
        <div className="mt-12 border-t border-[var(--ink-100)] pt-6 text-xs text-[var(--ink-500)]">© {new Date().getFullYear()} Legaly AI</div>
      </Container>
    </footer>
  );
}
