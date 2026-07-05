'use client';

import { useState } from 'react';
import {
  Building2,
  PencilLine,
  PowerOff,
  Receipt,
  Users,
  Check,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { Container, SectionHead } from './ui';

// Vitrine à onglets façon Brevo : une liste d'onglets (types de formalités) et
// un écran-maquette qui change avec une animation à chaque sélection.
interface Tab {
  key: string;
  label: string;
  icon: LucideIcon;
  headline: string;
  sub: string;
  steps: string[];
}

const TABS: Tab[] = [
  {
    key: 'creation',
    label: 'Création d’entreprise',
    icon: Building2,
    headline: 'Créez une société de A à Z',
    sub: 'SASU, SAS, SARL, EURL, SCI, holding, auto-entrepreneur — décrivez le projet, l’IA prépare tout.',
    steps: ['Lecture des pièces d’identité (OCR)', 'Statuts générés automatiquement', 'Signature eIDAS des associés', 'Dépôt au Guichet Unique INPI'],
  },
  {
    key: 'modification',
    label: 'Modifications statutaires',
    icon: PencilLine,
    headline: 'Modifiez sans ressaisir',
    sub: 'Transfert de siège, changement d’objet, de dirigeant, de dénomination — déposez le PV, l’IA le lit.',
    steps: ['Analyse du PV d’assemblée', 'Détection automatique de la décision', 'Formulaire pré-rempli', 'Signature & dépôt INPI'],
  },
  {
    key: 'cessation',
    label: 'Cessation / radiation',
    icon: PowerOff,
    headline: 'Cessez une activité en quelques clics',
    sub: 'Radiation, dissolution, liquidation — le parcours guidé s’occupe des pièces et des délais.',
    steps: ['Identification de l’entreprise', 'Motif et date d’effet', 'Justificatifs requis', 'Transmission officielle'],
  },
  {
    key: 'comptes',
    label: 'Dépôt des comptes',
    icon: Receipt,
    headline: 'Déposez vos comptes annuels',
    sub: 'Le PV d’approbation pré-remplit les dates et la société. Confidentialité TPE/PME en un clic.',
    steps: ['Analyse du PV d’approbation', 'Dates & société pré-remplies', 'Options de confidentialité', 'Dépôt au greffe / INPI'],
  },
  {
    key: 'be',
    label: 'Bénéficiaires effectifs',
    icon: Users,
    headline: 'Déclarez vos bénéficiaires effectifs',
    sub: 'Identifiez les personnes qui détiennent ou contrôlent réellement la société, sans jargon.',
    steps: ['Détention & contrôle', 'Calcul automatique des seuils', 'Pièces justificatives', 'Déclaration transmise'],
  },
];

export function TabShowcase() {
  const [active, setActive] = useState(0);
  const tab = TABS[active];

  return (
    <section id="formalites" className="border-b border-[var(--ink-100)] bg-[var(--violet-50)] py-20 sm:py-24">
      <Container>
        <SectionHead
          eyebrow="Toutes vos formalités"
          title={
            <>
              Une seule plateforme,
              <br />
              toutes vos démarches.
            </>
          }
          lead="Chaque type de formalité a son parcours guidé — piloté par les mêmes agents IA, du début à la fin."
        />

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* Liste d'onglets */}
          <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {TABS.map((t, i) => {
              const isActive = i === active;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActive(i)}
                  className={
                    'flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all duration-200 lg:shrink ' +
                    (isActive
                      ? 'border-[var(--accent)] bg-white shadow-[0_10px_30px_rgba(43,23,105,0.10)]'
                      : 'border-transparent bg-white/50 hover:bg-white')
                  }
                >
                  <span
                    className={
                      'grid size-9 shrink-0 place-items-center rounded-lg ' +
                      (isActive
                        ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                        : 'bg-[var(--ink-100)] text-[var(--ink-500)]')
                    }
                  >
                    <t.icon className="size-[18px]" />
                  </span>
                  <span
                    className={
                      'text-sm font-semibold ' +
                      (isActive ? 'text-[var(--violet-900)]' : 'text-[var(--ink-600)]')
                    }
                  >
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Écran-maquette (rejoue l'animation à chaque onglet grâce à key) */}
          <div
            key={active}
            className="bp-tabin rounded-3xl border border-[var(--ink-150)] bg-white p-7 shadow-[0_24px_60px_rgba(43,23,105,0.10)] sm:p-9"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-ink)]">
                  <tab.icon className="size-3.5" />
                  {tab.label}
                </span>
                <h3 className="mt-4 font-[Sora] text-2xl font-bold text-[var(--violet-900)]">
                  {tab.headline}
                </h3>
                <p className="mt-2 max-w-md text-[15px] leading-relaxed text-[var(--ink-600)]">
                  {tab.sub}
                </p>
              </div>
              <span className="rounded-full bg-[var(--violet-100)] px-3 py-1 text-xs font-semibold text-[var(--violet-700)]">
                Automatisé
              </span>
            </div>

            <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {tab.steps.map((s, i) => (
                <div
                  key={s}
                  className="flex items-center gap-3 rounded-xl border border-[var(--ink-100)] bg-[var(--ink-50)] px-4 py-3"
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--violet-100)] text-[var(--violet-700)]">
                    <Check className="size-3.5" />
                  </span>
                  <span className="text-sm font-medium text-[var(--ink-800)]">{s}</span>
                  <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-400)]">
                    Agent {i + 1}
                  </span>
                </div>
              ))}
            </div>

            <a
              href="/auth/signup"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(255,136,123,0.35)] transition-transform hover:-translate-y-0.5"
            >
              Lancer cette formalité
              <ArrowRight className="size-4" />
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
