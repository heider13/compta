'use client';

// Démo interactive du flow produit — 5 étapes cliquables avec visuels
// animés en pur CSS (pas de screenshots ni vidéo à maintenir).
// Auto-avance toutes les 6 s ; un clic sur une étape prend la main.
// prefers-reduced-motion : pas d'auto-avance, visuels statiques.

import { useEffect, useRef, useState } from 'react';
import { Container, SectionHead } from './ui';
import { cn } from '@/lib/utils';

const STEP_DURATION_MS = 6000;

// ─── Visuels d'étape (remontés avec délais échelonnés) ───────────

function Line({ w, delay, filled = true }: { w: string; delay: number; filled?: boolean }) {
  return (
    <div
      className={cn('demo-appear mb-2 h-2.5 rounded-[5px]', filled ? 'bg-[var(--violet-200)]' : 'bg-[var(--ink-100)]')}
      style={{ width: w, animationDelay: `${delay}ms` }}
    />
  );
}

function Pill({ children, tone, delay }: { children: React.ReactNode; tone: 'green' | 'indigo'; delay: number }) {
  return (
    <span
      className={cn(
        'demo-appear inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
        tone === 'green' ? 'bg-[rgba(19,115,51,0.1)] text-[#137333]' : 'bg-[var(--violet-50)] text-[var(--accent-ink)]',
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </span>
  );
}

function Panel({ title, badge, children }: { title: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-[var(--ink-150)] bg-white p-6 shadow-[0_18px_48px_rgba(35,20,80,0.12)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-[var(--violet-900)]">{title}</span>
        {badge}
      </div>
      {children}
    </div>
  );
}

function StepScan() {
  return (
    <Panel title="Pièce d'identité du dirigeant">
      <div className="flex items-center gap-4">
        <div
          className="demo-appear grid h-20 w-28 shrink-0 place-items-center rounded-lg border border-[var(--ink-150)] bg-gradient-to-br from-[var(--violet-100)] to-[var(--violet-50)] text-[11px] font-bold tracking-wide text-[var(--accent-ink)]"
          style={{ animationDelay: '0ms' }}
        >
          CNI / PDF
        </div>
        <div className="flex-1">
          <Line w="92%" delay={500} />
          <Line w="70%" delay={800} />
          <Line w="82%" delay={1100} />
          <Line w="55%" delay={1400} />
        </div>
      </div>
      <div className="mt-4">
        <Pill tone="green" delay={1900}>✓ Identité extraite — 12 champs préremplis en 8 s</Pill>
      </div>
    </Panel>
  );
}

const FIELDS: Array<[string, string]> = [
  ['Nom de naissance', 'MARTIN'],
  ['Prénoms', 'Sophie, Camille'],
  ['Née le', '15/03/1992 — PARIS'],
  ['Nationalité', 'Française'],
];

function StepForm() {
  return (
    <Panel title="Questionnaire de création" badge={<Pill tone="indigo" delay={0}>SASU</Pill>}>
      <div className="grid gap-2.5">
        {FIELDS.map(([label, value], i) => (
          <div
            key={label}
            className="demo-appear flex items-center justify-between rounded-lg border border-[var(--ink-100)] bg-[var(--ink-50)] px-3.5 py-2.5"
            style={{ animationDelay: `${300 + i * 350}ms` }}
          >
            <span className="text-xs text-[var(--ink-500)]">{label}</span>
            <span className="text-[13px] font-semibold text-[var(--ink-900)]">{value}</span>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <Pill tone="green" delay={1900}>✓ Rien à ressaisir — vous vérifiez, c'est tout</Pill>
      </div>
    </Panel>
  );
}

function StepStatuts() {
  return (
    <Panel title="Statuts — SASU Martin Conseil" badge={<Pill tone="indigo" delay={0}>.DOCX éditable</Pill>}>
      <Line w="50%" delay={200} filled={false} />
      <Line w="100%" delay={400} />
      <Line w="94%" delay={550} />
      <Line w="97%" delay={700} />
      <div className="my-3" />
      <Line w="42%" delay={900} filled={false} />
      <Line w="100%" delay={1050} />
      <Line w="88%" delay={1200} />
      <div className="mt-4">
        <Pill tone="green" delay={1700}>✓ Générés depuis le dossier — vos clauses restent les vôtres</Pill>
      </div>
    </Panel>
  );
}

function StepSignature() {
  return (
    <Panel title="Signature du dirigeant" badge={<Pill tone="indigo" delay={0}>eIDAS avancée</Pill>}>
      <div className="grid place-items-center rounded-lg border border-dashed border-[var(--ink-200)] bg-[var(--ink-50)] py-5">
        <svg width="200" height="56" viewBox="0 0 200 56" aria-hidden="true">
          <path
            className="demo-draw-path"
            d="M10 40 C 32 8, 48 52, 68 30 S 104 6, 124 32 S 166 48, 190 16"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Pill tone="indigo" delay={1400}>OTP SMS vérifié</Pill>
        <Pill tone="green" delay={1800}>✓ Valeur légale — exigence INPI respectée</Pill>
      </div>
    </Panel>
  );
}

const TIMELINE = ['Dossier transmis au Guichet Unique', 'Frais légaux réglés', 'Validé — SIREN attribué'];

function StepDepot() {
  return (
    <Panel title="Suivi INPI en temps réel" badge={<Pill tone="indigo" delay={0}>Synchronisé</Pill>}>
      <div className="grid gap-1">
        {TIMELINE.map((label, i) => (
          <div
            key={label}
            className="demo-appear flex items-center gap-3 border-b border-[var(--ink-100)] py-2.5 last:border-0"
            style={{ animationDelay: `${400 + i * 600}ms` }}
          >
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#137333] text-[11px] font-bold text-white">
              ✓
            </span>
            <span className="text-sm text-[var(--ink-900)]">{label}</span>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <Pill tone="green" delay={2400}>🎉 Société immatriculée</Pill>
      </div>
    </Panel>
  );
}

// ─── Étapes ──────────────────────────────────────────────────────

const STEPS = [
  {
    label: 'Scanner',
    title: "Déposez la pièce d'identité",
    desc: "Photo ou PDF — l'OCR lit la zone MRZ et extrait l'identité complète.",
    visual: <StepScan />,
  },
  {
    label: 'Vérifier',
    title: 'Le questionnaire se remplit seul',
    desc: '90 % des champs INPI préremplis. Vous relisez, vous corrigez si besoin.',
    visual: <StepForm />,
  },
  {
    label: 'Statuts',
    title: 'Les statuts se génèrent',
    desc: 'Un .docx complet, éditable dans Word — pas un template figé.',
    visual: <StepStatuts />,
  },
  {
    label: 'Signer',
    title: 'La signature part en un clic',
    desc: "Email + OTP SMS : signature électronique avancée eIDAS, celle que l'INPI exige.",
    visual: <StepSignature />,
  },
  {
    label: 'Déposer',
    title: 'Déposé et suivi au Guichet Unique',
    desc: "Dépôt via l'API officielle, statut synchronisé en temps réel jusqu'à l'immatriculation.",
    visual: <StepDepot />,
  },
];

export function InteractiveDemo() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (paused || reducedMotion.current) return;
    const t = window.setTimeout(() => setActive((a) => (a + 1) % STEPS.length), STEP_DURATION_MS);
    return () => window.clearTimeout(t);
  }, [active, paused]);

  const step = STEPS[active];

  return (
    <section
      id="demo"
      className="border-b border-[var(--ink-100)] bg-white py-20 sm:py-24"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <Container>
        <SectionHead
          eyebrow="Démo interactive"
          title={
            <>
              De la pièce d&apos;identité à l&apos;immatriculation.
              <br />
              En cinq étapes.
            </>
          }
          lead="Cliquez sur les étapes — ou laissez la démo dérouler le parcours d'un dossier de création."
        />

        {/* Onglets d'étapes */}
        <div className="mx-auto mb-10 flex max-w-3xl flex-wrap justify-center gap-2">
          {STEPS.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setActive(i)}
              aria-current={i === active}
              className={cn(
                'relative overflow-hidden rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200',
                i === active
                  ? 'border-[var(--violet-900)] bg-[var(--violet-900)] text-white'
                  : 'border-[var(--ink-200)] bg-white text-[var(--ink-600)] hover:border-[var(--ink-300)] hover:text-[var(--violet-900)]',
              )}
            >
              <span className="relative z-10">
                {i + 1}. {s.label}
              </span>
              {i === active && !paused && (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 bg-[var(--accent)]/30"
                  style={{ animation: `demo-progress ${STEP_DURATION_MS}ms linear both` }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Contenu de l'étape — key force le rejeu des animations */}
        <div key={active} className="grid items-center gap-10 lg:grid-cols-2">
          <div className="demo-appear order-2 text-center lg:order-1 lg:text-left">
            <span className="font-[Sora] text-sm font-bold text-[var(--accent)]">
              Étape {active + 1} / {STEPS.length}
            </span>
            <h3 className="mt-2 font-[Sora] text-2xl font-semibold tracking-tight text-[var(--violet-900)] sm:text-3xl">
              {step.title}
            </h3>
            <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-[var(--ink-600)] lg:mx-0">
              {step.desc}
            </p>
          </div>
          <div className="order-1 flex justify-center rounded-2xl bg-gradient-to-br from-[#fff3f1] via-[#eae8f6] to-white p-6 sm:p-10 lg:order-2">
            {step.visual}
          </div>
        </div>
      </Container>
    </section>
  );
}
