import { Check, Sparkle, Arrow } from '@/components/icons';
import { cn } from '@/lib/utils';
import { Container, SectionHead, btnCta, btnGhost } from './ui';

const PLANS = [
  {
    name: 'Cabinet',
    desc: 'Pour les petits cabinets et formalistes indépendants.',
    price: '79 €',
    suffix: ' / mois HT',
    cta: 'Démarrer',
    accent: false,
    features: [
      'Jusqu\'à 3 collaborateurs',
      "Jusqu'à 50 dossiers / mois",
      'Toutes les formalités INPI',
      'Espace client + signature',
      'Support email sous 24 h',
    ],
  },
  {
    name: 'Cabinet Pro',
    desc: 'Pour les cabinets en croissance avec plusieurs collaborateurs.',
    price: '199 €',
    suffix: ' / mois HT',
    cta: 'Démarrer 30 jours',
    accent: true,
    highlight: 'Le plus choisi',
    features: [
      'Jusqu\'à 10 collaborateurs',
      'Volume de dossiers illimité',
      'CRM intégré + import Pappers',
      'Automatisation des relances',
      'Support prioritaire 7j/7',
      'Marque blanche (logo + couleurs)',
    ],
  },
  {
    name: 'Enterprise',
    desc: 'Pour les groupes et legaltechs avec besoins API.',
    price: 'Sur devis',
    suffix: '',
    cta: 'Nous contacter',
    accent: false,
    features: [
      'Collaborateurs illimités',
      'API publique + webhooks',
      'Sous-domaine personnalisé',
      'SLA contractuel 99,9 %',
      'Onboarding dédié + account manager',
      'SSO (SAML, OIDC)',
    ],
  },
];

export function Pricing() {
  return (
    <section id="tarifs" className="relative scroll-mt-20 overflow-hidden py-20 sm:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_600px_400px_at_50%_0%,rgba(255,136,123,0.08),transparent_60%)]"
      />
      <Container className="relative">
        <SectionHead
          eyebrow="Tarifs cabinets"
          title={
            <>
              Une plateforme par cabinet.
              <br />
              Pas de surprise.
            </>
          }
          lead={
            <>
              Abonnement mensuel sans engagement. Les frais légaux INPI éventuels
              sont refacturés au coût réel à votre client.
            </>
          }
        />
        <div className="grid items-stretch gap-5 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={cn(
                'relative flex flex-col rounded-2xl border bg-white p-7 transition-all duration-200',
                p.accent
                  ? 'border-transparent shadow-[0_24px_60px_rgba(255,136,123,0.25)] ring-2 ring-[var(--accent)] lg:scale-[1.03]'
                  : 'border-[var(--ink-150)] hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(8,3,49,0.08)]',
              )}
            >
              {p.accent && p.highlight && (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-[var(--accent)] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#080331]">
                  <Sparkle size={11} />
                  {p.highlight}
                </span>
              )}
              <h3 className="mb-1.5 text-[22px] tracking-tight">{p.name}</h3>
              <p className="min-h-10 text-sm text-[var(--ink-600)]">{p.desc}</p>
              <div className="mb-6 mt-5 flex items-baseline gap-1">
                <span className="text-[40px] font-semibold tracking-[-0.03em] text-[var(--ink-900)]">
                  {p.price}
                </span>
                <span className="text-sm text-[var(--ink-500)]">{p.suffix}</span>
              </div>
              <a
                href="/auth/signup"
                className={cn(p.accent ? btnCta : btnGhost, 'mb-6 w-full')}
              >
                {p.cta}
                <Arrow size={16} />
              </a>
              <ul className="grid gap-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-[var(--ink-700)]">
                    <Check size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
