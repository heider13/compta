'use client';

// Démo interactive façon "screen recording" — une fenêtre de navigateur
// simulée montrant l'app, avec curseur animé qui clique, et contrôles de
// lecteur vidéo (play/pause + timeline chapitrée cliquable).
// 100 % CSS/React : rien à re-tourner quand le produit évolue.
// prefers-reduced-motion : lecture manuelle uniquement, visuels posés.

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { Container, SectionHead } from './ui';
import { cn } from '@/lib/utils';

const SCENE_MS = 7000;

// ─── Briques visuelles ───────────────────────────────────────────

function L({ w, delay, tone = 'fill', h = 'h-2' }: { w: string; delay?: number; tone?: 'fill' | 'ghost'; h?: string }) {
  return (
    <div
      className={cn('demo-appear mb-1.5 rounded', h, tone === 'fill' ? 'bg-[var(--violet-200)]' : 'bg-[var(--ink-100)]')}
      style={{ width: w, animationDelay: `${delay ?? 0}ms` }}
    />
  );
}

function Tag({ children, tone, delay }: { children: React.ReactNode; tone: 'green' | 'indigo' | 'amber'; delay?: number }) {
  const tones = {
    green: 'bg-[rgba(19,115,51,0.1)] text-[#137333]',
    indigo: 'bg-[var(--violet-50)] text-[var(--accent-ink)]',
    amber: 'bg-amber-100 text-amber-800',
  };
  return (
    <span
      className={cn('demo-appear inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', tones[tone])}
      style={{ animationDelay: `${delay ?? 0}ms` }}
    >
      {children}
    </span>
  );
}

function Cursor({ scene }: { scene: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="demo-cursor"
      style={{ animationName: `demo-cursor-s${scene + 1}` }}
      aria-hidden="true"
    >
      <path d="M5 3 L19 12 L12 13.5 L9.5 20 Z" fill="white" stroke="#080331" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function Click({ left, top, delay }: { left: string; top: string; delay: number }) {
  return <span className="demo-click" style={{ left, top, animationDelay: `${delay}ms` }} aria-hidden="true" />;
}

// Coquille de l'app dans la fenêtre : sidebar violette + zone contenu
function AppShell({ title, children }: { title: string; children: React.ReactNode }) {
  const nav = ['Tableau de bord', 'Formalités', 'Clients', 'Tâches'];
  return (
    <div className="flex h-full">
      <div className="hidden w-36 shrink-0 flex-col gap-1 bg-[#14102a] p-3 sm:flex">
        <div className="mb-3 flex items-center gap-1.5">
          <span className="grid size-5 place-items-center rounded bg-[#7551e8] text-[10px] font-bold text-white">L</span>
          <span className="text-[11px] font-semibold text-white">Legaly AI</span>
        </div>
        {nav.map((n, i) => (
          <div
            key={n}
            className={cn(
              'rounded px-2 py-1.5 text-[10px]',
              i === 1 ? 'bg-[#241d45] font-semibold text-white' : 'text-[#8e8a9f]',
            )}
          >
            {n}
          </div>
        ))}
      </div>
      <div className="min-w-0 flex-1 bg-[#f8f7fb] p-4">
        <div className="mb-3 text-[11px] font-bold text-[#0e0b1a]">{title}</div>
        {children}
      </div>
    </div>
  );
}

// ─── Scènes (une par chapitre) ───────────────────────────────────

function SceneScan() {
  return (
    <AppShell title="Nouvelle formalité — Identité du déclarant">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--ink-150)] bg-white p-3">
          <div className="mb-2 text-[10px] font-semibold text-[var(--ink-600)]">📷 Scanner une pièce d'identité</div>
          <div className="grid grid-cols-2 gap-2">
            {/* Le bouton Recto passe au vert après le "clic" (2 s) */}
            <div className="relative rounded-md border-[1.5px] border-dashed border-[var(--accent)] px-2 py-2 text-center text-[10px] font-semibold text-[var(--accent-ink)]">
              Recto
              <div
                className="demo-appear absolute inset-0 grid place-items-center rounded-md border-[1.5px] border-[#137333] bg-[#f0faf2] text-[#137333]"
                style={{ animationDelay: '2300ms' }}
              >
                ✅ Recto lu
              </div>
            </div>
            <div className="rounded-md border-[1.5px] border-dashed border-[var(--ink-200)] px-2 py-2 text-center text-[10px] font-semibold text-[var(--ink-500)]">
              Verso
            </div>
          </div>
          <div className="mt-2">
            <Tag tone="green" delay={3200}>✓ Identité extraite — 12 champs préremplis</Tag>
          </div>
        </div>
        <div className="rounded-lg border border-[var(--ink-150)] bg-white p-3">
          <div className="mb-2 text-[10px] font-semibold text-[var(--ink-600)]">Champs INPI</div>
          <L w="90%" delay={3600} />
          <L w="72%" delay={3900} />
          <L w="84%" delay={4200} />
          <L w="60%" delay={4500} />
        </div>
      </div>
      <Click left="38%" top="46%" delay={1700} />
    </AppShell>
  );
}

const FIELDS: Array<[string, string]> = [
  ['Nom de naissance', 'MARTIN'],
  ['Prénoms', 'Sophie, Camille'],
  ['Née le', '15/03/1992 — PARIS'],
  ['Nationalité', 'Française'],
];

function SceneForm() {
  return (
    <AppShell title="Questionnaire de création — SASU Martin Conseil">
      <div className="grid max-w-md gap-1.5">
        {FIELDS.map(([label, value], i) => (
          <div
            key={label}
            className="demo-appear flex items-center justify-between rounded-md border border-[var(--ink-100)] bg-white px-2.5 py-1.5"
            style={{ animationDelay: `${500 + i * 500}ms` }}
          >
            <span className="text-[9px] text-[var(--ink-500)]">{label}</span>
            <span className="text-[10px] font-semibold text-[var(--ink-900)]">{value}</span>
          </div>
        ))}
        <div className="mt-1">
          <Tag tone="green" delay={3000}>✓ Prérempli par l'OCR — rien à ressaisir</Tag>
        </div>
      </div>
      <Click left="55%" top="38%" delay={2000} />
    </AppShell>
  );
}

function SceneStatuts() {
  return (
    <AppShell title="Dossier SASU Martin Conseil">
      <div className="grid gap-3 sm:grid-cols-[1fr_130px]">
        <div className="rounded-lg border border-[var(--ink-150)] bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-[var(--ink-600)]">Pièces jointes</span>
            <Tag tone="indigo" delay={3400}>Statuts — .DOCX</Tag>
          </div>
          <L w="45%" delay={3600} tone="ghost" />
          <L w="95%" delay={3800} />
          <L w="88%" delay={4000} />
          <L w="92%" delay={4200} />
        </div>
        <div className="flex flex-col gap-1.5">
          {/* Bouton cliqué à 2 s */}
          <div className="relative rounded-md bg-[var(--accent-ink)] px-2 py-1.5 text-center text-[9px] font-semibold text-white">
            📄 Générer les statuts
          </div>
          <div className="rounded-md border border-[var(--ink-200)] px-2 py-1.5 text-center text-[9px] text-[var(--ink-600)]">
            Demander la signature
          </div>
          <Tag tone="green" delay={3200}>✓ Document généré</Tag>
        </div>
      </div>
      <Click left="74%" top="34%" delay={1900} />
    </AppShell>
  );
}

function SceneSign() {
  return (
    <AppShell title="Signature électronique — PV de décision">
      <div className="grid max-w-md gap-2">
        <div className="rounded-lg border border-[var(--ink-150)] bg-white p-3">
          <div className="grid place-items-center rounded border border-dashed border-[var(--ink-200)] bg-[var(--ink-50)] py-2">
            <svg width="150" height="40" viewBox="0 0 200 56" aria-hidden="true">
              <path
                className="demo-draw-path"
                style={{ animationDelay: '3000ms' }}
                d="M10 40 C 32 8, 48 52, 68 30 S 104 6, 124 32 S 166 48, 190 16"
                fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Tag tone="indigo" delay={4300}>OTP SMS vérifié</Tag>
            <Tag tone="green" delay={4800}>✓ eIDAS avancée</Tag>
          </div>
        </div>
        <div className="relative w-40 rounded-md bg-[var(--accent-ink)] px-2 py-1.5 text-center text-[9px] font-semibold text-white">
          Envoyer la demande de signature
        </div>
      </div>
      <Click left="68%" top="72%" delay={2000} />
    </AppShell>
  );
}

const TIMELINE = ['Transmis au Guichet Unique', 'Frais légaux réglés', 'Validé — SIREN attribué'];

function SceneDepot() {
  return (
    <AppShell title="Suivi INPI — temps réel">
      <div className="grid max-w-sm gap-1">
        {TIMELINE.map((label, i) => (
          <div
            key={label}
            className="demo-appear flex items-center gap-2 rounded-md border border-[var(--ink-100)] bg-white px-2.5 py-2"
            style={{ animationDelay: `${600 + i * 900}ms` }}
          >
            <span className="grid size-4 shrink-0 place-items-center rounded-full bg-[#137333] text-[9px] font-bold text-white">✓</span>
            <span className="text-[10px] text-[var(--ink-900)]">{label}</span>
          </div>
        ))}
        <div className="mt-1.5">
          <Tag tone="green" delay={3800}>🎉 Société immatriculée</Tag>
        </div>
      </div>
      <Click left="42%" top="40%" delay={2200} />
    </AppShell>
  );
}

// ─── Chapitres ───────────────────────────────────────────────────

const SCENES = [
  { label: 'Scanner la CNI', url: 'app.legaly.ai/dossiers/nouveau', view: <SceneScan /> },
  { label: 'Vérifier', url: 'app.legaly.ai/dossiers/nouveau', view: <SceneForm /> },
  { label: 'Générer les statuts', url: 'app.legaly.ai/dossiers/D-2481', view: <SceneStatuts /> },
  { label: 'Signer', url: 'app.legaly.ai/dossiers/D-2481/sign', view: <SceneSign /> },
  { label: 'Déposer à l’INPI', url: 'app.legaly.ai/dashboard', view: <SceneDepot /> },
];

export function InteractiveDemo() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion.current) setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => setActive((a) => (a + 1) % SCENES.length), SCENE_MS);
    return () => window.clearTimeout(t);
  }, [active, playing]);

  const seek = (i: number) => {
    setActive(i);
    // rester en pause si l'utilisateur avait mis pause
  };

  return (
    <section id="demo" className="border-b border-[var(--ink-100)] bg-[var(--ink-50)] py-20 sm:py-24">
      <Container>
        <SectionHead
          eyebrow="Démo interactive"
          title={
            <>
              Regardez un dossier se déposer.
              <br />
              Sans lever le petit doigt.
            </>
          }
          lead="Une création de SASU, de la pièce d'identité à l'immatriculation — naviguez dans les chapitres ou laissez tourner."
        />

        {/* Fenêtre navigateur */}
        <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-[var(--ink-200)] bg-white shadow-[0_30px_80px_rgba(8,3,49,0.18)]">
          {/* Barre du navigateur */}
          <div className="flex items-center gap-3 border-b border-[var(--ink-100)] bg-[var(--ink-50)] px-4 py-2.5">
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="size-2.5 rounded-full bg-[#ff5f57]" />
              <span className="size-2.5 rounded-full bg-[#febc2e]" />
              <span className="size-2.5 rounded-full bg-[#28c840]" />
            </div>
            <div className="flex-1 rounded-md bg-white px-3 py-1 text-center text-[11px] text-[var(--ink-500)] ring-1 ring-[var(--ink-150)]">
              🔒 {SCENES[active].url}
            </div>
          </div>

          {/* Écran — key remonte la scène pour rejouer les animations */}
          <div key={active} className={cn('relative aspect-[16/9] overflow-hidden sm:aspect-[2/1]', !playing && 'demo-paused')}>
            {SCENES[active].view}
            <Cursor scene={active} />
          </div>

          {/* Contrôles vidéo */}
          <div className="flex items-center gap-3 border-t border-[var(--ink-100)] bg-[#0e0b1a] px-4 py-3">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? 'Pause' : 'Lecture'}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[#080331] transition-transform hover:scale-105"
            >
              {playing ? <Pause className="size-4" fill="currentColor" /> : <Play className="size-4 translate-x-[1px]" fill="currentColor" />}
            </button>

            {/* Timeline chapitrée */}
            <div className="flex flex-1 gap-1.5">
              {SCENES.map((s, i) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => seek(i)}
                  aria-label={`Chapitre ${i + 1} : ${s.label}`}
                  aria-current={i === active}
                  className="group relative h-6 flex-1"
                >
                  <span className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/20 transition-all group-hover:h-2.5">
                    {i < active && <span className="absolute inset-0 bg-[var(--accent)]" />}
                    {i === active && (
                      <span
                        key={`p-${active}-${playing}`}
                        className="absolute inset-y-0 left-0 bg-[var(--accent)]"
                        style={{
                          animation: `demo-progress ${SCENE_MS}ms linear both`,
                          animationPlayState: playing ? 'running' : 'paused',
                        }}
                      />
                    )}
                  </span>
                  <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[#080331] px-2 py-0.5 text-[10px] font-medium text-white group-hover:block">
                    {s.label}
                  </span>
                </button>
              ))}
            </div>

            <span className="hidden shrink-0 text-xs font-medium text-white/70 sm:block">
              {active + 1} / {SCENES.length} — {SCENES[active].label}
            </span>
          </div>
        </div>
      </Container>
    </section>
  );
}
