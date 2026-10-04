'use client';

// Hero « agent » (structure inspirée de NanoCorp, identité Legaly : violets + corail, Sora) :
// grand titre centré,
// zone de saisie façon chat. Aucun appel IA : un petit algorithme reconnaît la
// formalité décrite (mots-clés) et joue une animation en plusieurs scènes — de la
// conversation au brouillon prêt sur le Guichet unique — pour présenter le produit.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUp, Check, FileText, Landmark, Megaphone, MessageSquare, Pause, Play, Plus,
  RotateCcw, ScanLine, PenLine,
} from 'lucide-react';
import { Arrow } from '@/components/icons';
import { DotBook } from './DotBook';
import { cn } from '@/lib/utils';

const SERIF = { fontFamily: "'Instrument Serif', 'Fraunces', Georgia, serif" };

// ─── Scénarios reconnus par l'algorithme ───
type Scenario = {
  key: string;
  titre: string;
  reponse: string;
  pieces: string[];
  actes: string[];
  annonce: { type: string; extrait: string } | null;
  inpi: { type: string; evenement: string };
};

const SCENARIOS: Record<string, Scenario> = {
  creation: {
    key: 'creation',
    titre: 'Création de société',
    reponse: 'Création détectée. Je prépare les statuts, les actes de constitution, l’annonce et le brouillon au Guichet unique.',
    pieces: ['Pièce d’identité du dirigeant', 'Justificatif de siège', 'Attestation de dépôt des fonds'],
    actes: ['Statuts', 'Déclaration de non-condamnation', 'Liste des souscripteurs', 'Pouvoir'],
    annonce: { type: 'Avis de constitution', extrait: 'Aux termes d’un acte sous seing privé, il a été constitué une société présentant les caractéristiques suivantes…' },
    inpi: { type: 'Création', evenement: 'Immatriculation' },
  },
  transfert: {
    key: 'transfert',
    titre: 'Transfert de siège',
    reponse: 'Transfert de siège détecté. Je lis la fiche RNE, rédige le procès-verbal, les statuts mis à jour et l’annonce.',
    pieces: ['Fiche RNE à jour', 'Statuts en vigueur (RNE)', 'Justificatif du nouveau siège'],
    actes: ['Procès-verbal de décision', 'Statuts mis à jour', 'Pouvoir'],
    annonce: { type: 'Avis de transfert de siège', extrait: 'Par décision du 1er octobre, l’associé unique a transféré le siège social du…' },
    inpi: { type: 'Modification', evenement: '60M — transfert du siège' },
  },
  dirigeant: {
    key: 'dirigeant',
    titre: 'Changement de dirigeant',
    reponse: 'Changement de dirigeant détecté. Je rédige le PV, la déclaration de non-condamnation et mets à jour les bénéficiaires effectifs.',
    pieces: ['Fiche RNE à jour', 'Pièce d’identité du nouveau dirigeant'],
    actes: ['Procès-verbal de nomination', 'Déclaration de non-condamnation', 'Pouvoir'],
    annonce: { type: 'Avis de modification', extrait: 'Aux termes d’une décision du 1er octobre, M. X a été nommé gérant en remplacement de…' },
    inpi: { type: 'Modification', evenement: '35M — dirigeants' },
  },
  objet: {
    key: 'objet',
    titre: 'Modification de l’objet social',
    reponse: 'Modification d’objet détectée. Je reprends les statuts déposés au RNE et rédige les nouvelles clauses.',
    pieces: ['Fiche RNE à jour', 'Statuts en vigueur (RNE)'],
    actes: ['Procès-verbal de décision', 'Statuts mis à jour', 'Pouvoir'],
    annonce: { type: 'Avis de modification', extrait: 'L’objet social a été étendu, à compter du 1er octobre, aux activités suivantes…' },
    inpi: { type: 'Modification', evenement: '12M — objet' },
  },
  dissolution: {
    key: 'dissolution',
    titre: 'Dissolution et liquidation',
    reponse: 'Dissolution détectée. Je prépare le PV de dissolution, la nomination du liquidateur et l’annonce, puis la clôture.',
    pieces: ['Fiche RNE à jour', 'Pièce d’identité du liquidateur'],
    actes: ['PV de dissolution anticipée', 'Comptes de liquidation', 'Pouvoir'],
    annonce: { type: 'Avis de dissolution anticipée', extrait: 'L’associé unique a décidé la dissolution anticipée de la société et nommé liquidateur…' },
    inpi: { type: 'Cessation', evenement: 'Dissolution · liquidation' },
  },
  sommeil: {
    key: 'sommeil',
    titre: 'Mise en sommeil',
    reponse: 'Mise en sommeil détectée. Pas d’annonce légale : je prépare la décision et le brouillon de cessation temporaire.',
    pieces: ['Fiche RNE à jour'],
    actes: ['Décision de mise en sommeil', 'Pouvoir'],
    annonce: null,
    inpi: { type: 'Cessation', evenement: '40M — mise en sommeil' },
  },
  regularisation: {
    key: 'regularisation',
    titre: 'Régularisation du greffe',
    reponse: 'Régularisation détectée. Je lis la demande du greffe et les pièces déjà déposées, puis je prépare la correction.',
    pieces: ['Demande de régularisation', 'Pièces déposées à l’INPI'],
    actes: ['Courrier de réponse au greffe', 'Pièce corrigée'],
    annonce: null,
    inpi: { type: 'Régularisation', evenement: 'Réponse au greffe' },
  },
};

const REGLES: [RegExp, string][] = [
  [/r[ée]gularis|greffe|rejet/i, 'regularisation'],
  [/dissou|dissolution|liquidat|radiation|fermer/i, 'dissolution'],
  [/sommeil|cessation temporaire/i, 'sommeil'],
  [/si[eè]ge|d[ée]m[ée]nag|transf[ée]r/i, 'transfert'],
  [/g[ée]rant|pr[ée]sident|dirigeant|nomm|r[ée]voc|d[ée]mission/i, 'dirigeant'],
  [/objet|activit[ée]/i, 'objet'],
  [/cr[ée]|immatricul|lancer|monter|sasu?\b|sarl|eurl|sci\b|micro|auto-?entrepr/i, 'creation'],
];

function detecter(texte: string): Scenario {
  for (const [re, k] of REGLES) if (re.test(texte)) return SCENARIOS[k];
  return SCENARIOS.creation;
}

const EXEMPLES = [
  'Créer une SASU de conseil à Marseille, capital 1 000 €',
  'Transférer le siège de ma SARL à Lyon',
  'Nommer un nouveau gérant',
  'Dissoudre et liquider ma société',
  'Répondre à une régularisation du greffe',
];

const CHIPS = [
  ['Créer une société', 'Créer une SAS à deux associés'],
  ['Transférer le siège', 'Transférer le siège de ma société'],
  ['Changer de dirigeant', 'Nommer un nouveau président'],
  ['Dissoudre', 'Dissoudre et liquider ma société'],
  ['Régularisation', 'Répondre à une régularisation du greffe'],
] as const;

// ─── Scènes de l'animation ───
const SCENES = [
  { key: 'conversation', label: 'Conversation', icon: MessageSquare },
  { key: 'pieces', label: 'Pièces lues', icon: ScanLine },
  { key: 'actes', label: 'Actes rédigés', icon: FileText },
  { key: 'annonce', label: 'Annonce légale', icon: Megaphone },
  { key: 'inpi', label: 'Brouillon INPI', icon: Landmark },
  { key: 'validation', label: 'Vous validez', icon: PenLine },
] as const;
const SCENE_MS = 3200;

function useTypewriter(phrases: string[], active: boolean) {
  const [text, setText] = useState('');
  useEffect(() => {
    if (!active) return;
    let i = 0;
    let j = 0;
    let deleting = false;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const p = phrases[i % phrases.length];
      if (!deleting) {
        j += 1;
        setText(p.slice(0, j));
        if (j === p.length) { deleting = true; t = setTimeout(tick, 1600); return; }
        t = setTimeout(tick, 45);
      } else {
        j -= 1;
        setText(p.slice(0, j));
        if (j === 0) { deleting = false; i += 1; t = setTimeout(tick, 350); return; }
        t = setTimeout(tick, 22);
      }
    };
    t = setTimeout(tick, 600);
    return () => clearTimeout(t);
  }, [phrases, active]);
  return text;
}

export function HeroAgent() {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [demande, setDemande] = useState<string | null>(null);
  const scenario = useMemo(() => (demande ? detecter(demande) : null), [demande]);
  const placeholder = useTypewriter(EXEMPLES, !focused && !value && !demande);
  const panelRef = useRef<HTMLDivElement>(null);

  function lancer(texte: string) {
    const t = texte.trim() || EXEMPLES[0];
    setDemande(t);
    setValue('');
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }

  return (
    <section className="relative overflow-hidden bg-[#fbfaff] text-[var(--violet-900)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 700px 520px at 8% -4%, rgba(255,190,140,0.35), transparent 60%),' +
            'radial-gradient(ellipse 900px 640px at 55% 18%, rgba(117,81,232,0.16), transparent 65%),' +
            'radial-gradient(ellipse 760px 600px at 100% 95%, rgba(234,66,253,0.12), transparent 62%)',
        }}
      />
      {/* Trame de points discrète */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: 'radial-gradient(rgba(54,31,171,0.18) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
          maskImage: 'radial-gradient(ellipse 70% 55% at 50% 100%, black 10%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 55% at 50% 100%, black 10%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto w-full max-w-5xl px-4 pb-20 pt-36 text-center sm:px-6 sm:pt-40">
        <p className="inline-flex items-center gap-2 font-mono !text-[11px] uppercase tracking-[0.28em] !text-[var(--ink-500)] sm:text-xs">
          Connecté au
          <span className="rounded-full bg-[var(--violet-600)] px-2 py-0.5 text-white">Guichet unique</span>
          INPI
        </p>

        <h1
          className="!mx-auto !mt-6 max-w-4xl font-[Sora] text-[clamp(2.5rem,6.6vw,5rem)] !font-bold !leading-[1.02] !tracking-[-0.03em] !text-[var(--violet-900)]"
        >
          Décrivez la formalité.
          <br />
          <span className="bg-gradient-to-r from-[#ffbe8c] via-[#ff887b] to-[#ea42fd] bg-clip-text text-transparent">
            L’agent la prépare.
          </span>
        </h1>

        <p className="!mx-auto !mt-6 max-w-xl text-base leading-relaxed !text-[var(--ink-600)] sm:text-lg">
          Création, modification, cessation, régularisation.
          <br className="hidden sm:block" /> De la conversation au brouillon INPI — vous validez, signez, payez.
        </p>

        {/* Zone de saisie */}
        <form
          className="relative z-10 mx-auto mt-10 max-w-3xl rounded-2xl border border-[var(--ink-150)] bg-white text-left shadow-[0_18px_50px_rgba(43,23,105,0.10)] transition-shadow focus-within:border-[var(--violet-300)] focus-within:shadow-[0_22px_60px_rgba(54,31,171,0.18)]"
          onSubmit={(e) => {
            e.preventDefault();
            lancer(value);
          }}
        >
          <label className="flex items-start gap-2 px-5 pt-5">
            <span className="mt-[3px] text-[10px] text-[var(--violet-600)]" aria-hidden="true">▶</span>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  lancer(value);
                }
              }}
              rows={3}
              placeholder={focused ? 'Décrivez votre formalité…' : placeholder}
              aria-label="Décrivez votre formalité"
              className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-[var(--violet-900)] outline-none placeholder:text-[var(--ink-400)]"
            />
          </label>
          <div className="flex items-center justify-between gap-3 px-4 pb-4 pt-1">
            <span
              className="group relative grid size-9 place-items-center rounded-md text-[var(--ink-500)] transition-colors hover:bg-[var(--ink-50)]"
              title="Pièces d’identité, PV d’AG, statuts, annonces…"
            >
              <Plus className="size-5" />
            </span>
            <div className="flex items-center gap-3">
              <span className="hidden font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-500)] sm:inline">
                Agent formalités
              </span>
              <button
                type="submit"
                className="grid size-9 place-items-center rounded-full bg-[var(--accent)] text-white shadow-[0_8px_20px_rgba(255,136,123,0.45)] transition-transform hover:-translate-y-0.5"
                aria-label="Lancer la démonstration"
              >
                <ArrowUp className="size-4 !text-white" strokeWidth={2.25} />
              </button>
            </div>
          </div>
        </form>

        <div className="mx-auto mt-4 flex max-w-3xl flex-wrap justify-center gap-2">
          {CHIPS.map(([label, texte]) => (
            <button
              key={label}
              type="button"
              onClick={() => lancer(texte)}
              className="rounded-full border border-[var(--ink-150)] bg-white/80 px-3.5 py-1.5 text-[13px] font-medium text-[var(--ink-700)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-ink)]"
            >
              {label}
            </button>
          ))}
        </div>

        <p className="!mt-6 font-mono !text-[13px] !text-[var(--ink-500)]">
          Vous êtes un cabinet ?{' '}
          <a href="/auth/signup" className="inline-flex items-center gap-1 text-[var(--violet-900)] underline-offset-4 hover:underline">
            Créer un compte <Arrow size={14} />
          </a>
        </p>

        {/* Livre en points (écho au logo) qui s'ouvre et feuillette */}
        {!demande && (
          <DotBook className="pointer-events-none relative left-1/2 -mb-20 -mt-6 block h-[340px] w-screen max-w-[1400px] -translate-x-1/2 sm:h-[460px] lg:h-[560px]" />
        )}

        {demande && scenario && (
          <div ref={panelRef} className="scroll-mt-24">
            <DemoPlayer key={demande} demande={demande} scenario={scenario} />
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Lecteur : réponse de l'« agent » puis animation scène par scène ───
function DemoPlayer({ demande, scenario }: { demande: string; scenario: Scenario }) {
  const [phase, setPhase] = useState<'reflexion' | 'reponse' | 'video'>('reflexion');
  const [pos, setPos] = useState(0); // position de lecture en ms
  const [playing, setPlaying] = useState(true);
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const scenes = SCENES.filter((s) => s.key !== 'annonce' || scenario.annonce);
  const total = scenes.length * SCENE_MS;
  const fini = pos >= total;
  const scene = Math.min(scenes.length - 1, Math.floor(pos / SCENE_MS));
  const elapsed = fini ? SCENE_MS : pos - scene * SCENE_MS;
  const goTo = (i: number) => setPos(i * SCENE_MS);

  useEffect(() => {
    const a = setTimeout(() => setPhase('reponse'), reduced ? 0 : 900);
    const b = setTimeout(() => setPhase('video'), reduced ? 0 : 2600);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [reduced]);

  useEffect(() => {
    if (phase !== 'video' || !playing || fini) return;
    const id = setInterval(() => setPos((p) => Math.min(total, p + 50)), 50);
    return () => clearInterval(id);
  }, [phase, playing, fini, total]);

  const progress = Math.min(1, pos / total);
  const current = scenes[scene].key;

  return (
    <div className="mx-auto mt-12 max-w-3xl text-left">
      {/* Échange */}
      <div className="space-y-3 font-mono text-[13px]">
        <div className="ml-auto w-fit max-w-[85%] rounded-lg bg-[var(--violet-600)] px-4 py-2.5 text-white">{demande}</div>
        <div className="w-fit max-w-[90%] rounded-lg border border-[var(--ink-150)] bg-[white] px-4 py-2.5 text-[var(--violet-900)]">
          {phase === 'reflexion' ? (
            <span className="inline-flex gap-1" aria-label="L’agent réfléchit">
              <Dot d={0} /> <Dot d={150} /> <Dot d={300} />
            </span>
          ) : (
            <>
              <span className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-[var(--violet-600)]">{scenario.titre}</span>
              {scenario.reponse}
            </>
          )}
        </div>
      </div>

      {/* « Vidéo » */}
      {phase === 'video' && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--violet-800)] bg-[#0e0b1a] shadow-[0_30px_70px_rgba(14,11,26,0.35)]">
          <div className="flex items-center justify-between px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white/60">
            <span>Legaly AI · {scenario.titre}</span>
            <span>{String(scene + 1).padStart(2, '0')} / {String(scenes.length).padStart(2, '0')}</span>
          </div>

          <div className="relative min-h-[320px] bg-[var(--ink-50)] sm:min-h-[340px]">
            <div key={current} className="absolute inset-0 grid place-items-center p-5 sm:p-8 animate-[heroSceneIn_.5s_ease-out]">
              <Scene k={current} scenario={scenario} demande={demande} t={elapsed / SCENE_MS} />
            </div>
          </div>

          {/* Barre de lecture */}
          <div className="h-1 bg-white/15">
            <div className="h-full bg-gradient-to-r from-[#ff887b] to-[#ea42fd] transition-[width] duration-75" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5">
            <button
              type="button"
              onClick={() => {
                if (fini) { setPos(0); setPlaying(true); } else setPlaying((p) => !p);
              }}
              className="grid size-8 place-items-center rounded-md !text-white hover:bg-white/10"
              aria-label={fini ? 'Rejouer' : playing ? 'Pause' : 'Lecture'}
            >
              {fini ? <RotateCcw className="size-4" /> : playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
            <div className="flex flex-1 flex-wrap gap-1">
              {scenes.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => goTo(i)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 font-mono !text-[11px] transition-colors',
                    i === scene ? 'bg-white !text-[var(--violet-900)]' : i < scene ? '!text-[#ffbe8c]' : '!text-white/50 hover:!text-white',
                  )}
                >
                  {i < scene ? <Check className="size-3.5" /> : <s.icon className="size-3.5" />}
                  <span className="hidden md:inline">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {fini && (
        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <p className="font-mono !text-[13px] !text-[var(--ink-500)]">Brouillon prêt sur le Guichet unique. Il ne reste qu’à relire, signer et payer.</p>
          <a
            href="/auth/signup"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-[15px] font-semibold text-white shadow-[0_12px_30px_rgba(255,136,123,0.4)] transition-transform hover:-translate-y-0.5"
          >
            Essayer avec mon cabinet <Arrow size={15} />
          </a>
        </div>
      )}
    </div>
  );
}

function Dot({ d }: { d: number }) {
  return <span className="inline-block size-1.5 animate-bounce rounded-full bg-[var(--violet-400)]" style={{ animationDelay: `${d}ms` }} />;
}

// Apparition progressive d'une liste selon l'avancement t (0 → 1) de la scène.
const visible = (i: number, n: number, t: number) => t > (i + 0.4) / (n + 1);

function Scene({ k, scenario, demande, t }: { k: string; scenario: Scenario; demande: string; t: number }) {
  const card = 'w-full max-w-md rounded-lg border border-[var(--ink-150)] bg-[white] p-4 text-left shadow-[0_10px_30px_rgba(43,23,105,0.10)] sm:p-5';
  const head = 'mb-3 font-mono !text-[11px] uppercase tracking-[0.18em] !text-[var(--violet-600)]';
  const line = 'flex items-center gap-2.5 py-1.5 text-[13px] !text-[var(--violet-900)] transition-opacity duration-300';

  if (k === 'conversation') {
    const q = ['Quelle date de décision ?', 'Qui signe les actes ?', 'Des pièces à joindre ?'];
    return (
      <div className={card}>
        <p className={head}>L’agent recueille les informations</p>
        <p className="mb-2 rounded-md bg-[var(--violet-600)] px-3 py-2 font-mono !text-[12px] !text-white">{demande}</p>
        {q.map((x, i) => (
          <p key={x} className={cn(line, 'font-mono !text-[12px]', visible(i, q.length, t) ? 'opacity-100' : 'opacity-0')}>
            <MessageSquare className="size-3.5 text-[var(--violet-600)]" /> {x}
          </p>
        ))}
      </div>
    );
  }
  if (k === 'pieces') {
    return (
      <div className={card}>
        <p className={head}>Lecture des pièces jointes</p>
        <div className="relative mb-3 h-16 overflow-hidden rounded-md border border-dashed border-[var(--ink-200)] bg-[var(--ink-50)]">
          <div className="absolute inset-x-0 h-0.5 bg-[var(--accent)] shadow-[0_0_12px_#ff887b]" style={{ top: `${(t * 100) % 100}%` }} />
          <div className="space-y-1.5 p-3">
            <div className="h-1.5 w-2/3 rounded bg-[var(--ink-150)]" />
            <div className="h-1.5 w-1/2 rounded bg-[var(--ink-150)]" />
            <div className="h-1.5 w-3/4 rounded bg-[var(--ink-150)]" />
          </div>
        </div>
        {scenario.pieces.map((x, i) => (
          <p key={x} className={cn(line, visible(i, scenario.pieces.length, t) ? 'opacity-100' : 'opacity-30')}>
            <Check className="size-4 text-[var(--violet-600)]" /> {x}
          </p>
        ))}
      </div>
    );
  }
  if (k === 'actes') {
    return (
      <div className="flex w-full max-w-lg flex-wrap justify-center gap-3">
        {scenario.actes.map((x, i) => (
          <div
            key={x}
            className={cn(
              'w-[46%] rounded-md border border-[var(--ink-150)] bg-[white] p-3 text-left shadow-sm transition-all duration-500 sm:w-[30%]',
              visible(i, scenario.actes.length, t) ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
            )}
          >
            <FileText className="mb-2 size-4 text-[var(--violet-600)]" />
            <p className="!text-[12px] font-medium leading-snug !text-[var(--violet-900)]">{x}</p>
            <div className="mt-2 space-y-1">
              <div className="h-1 w-full rounded bg-[var(--ink-100)]" />
              <div className="h-1 w-4/5 rounded bg-[var(--ink-100)]" />
              <div className="h-1 w-3/5 rounded bg-[var(--ink-100)]" />
            </div>
            <p className="mt-2 font-mono !text-[10px] uppercase tracking-wider !text-[var(--ink-400)]">.docx éditable</p>
          </div>
        ))}
      </div>
    );
  }
  if (k === 'annonce' && scenario.annonce) {
    const n = Math.floor(scenario.annonce.extrait.length * Math.min(1, t * 1.6));
    const mentions = ['Dénomination, forme, capital', 'SIREN et greffe', 'Organe et date de décision'];
    return (
      <div className={card}>
        <p className={head}>{scenario.annonce.type}</p>
        <p className="min-h-[3.5rem] !text-[13px] leading-relaxed !text-[var(--violet-900)]" style={SERIF}>
          {scenario.annonce.extrait.slice(0, n)}
          <span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-[var(--violet-900)] align-middle" />
        </p>
        <div className="mt-3 border-t border-[var(--ink-100)] pt-2">
          {mentions.map((x, i) => (
            <p key={x} className={cn(line, 'py-1 text-[12px]', visible(i + 1, mentions.length + 1, t) ? 'opacity-100' : 'opacity-25')}>
              <Check className="size-3.5 text-[var(--violet-600)]" /> {x}
            </p>
          ))}
        </div>
      </div>
    );
  }
  if (k === 'inpi') {
    const champs = [['Type de formalité', scenario.inpi.type], ['Événement', scenario.inpi.evenement], ['Pièces jointes', `${scenario.actes.length + scenario.pieces.length} déposées`]];
    return (
      <div className={card}>
        <p className={cn(head, 'flex items-center gap-2')}><Landmark className="size-3.5" /> Guichet unique — brouillon</p>
        {champs.map(([l, v], i) => (
          <div key={l} className="flex items-center justify-between gap-3 border-b border-[var(--ink-100)] py-2 text-[13px]">
            <span className="text-[var(--ink-500)]">{l}</span>
            <span className={cn('font-mono text-[12px] text-[var(--violet-900)] transition-opacity duration-300', visible(i, champs.length, t) ? 'opacity-100' : 'opacity-0')}>{v}</span>
          </div>
        ))}
        <p className={cn('mt-3 inline-flex items-center gap-2 rounded-md bg-[var(--accent-soft)] px-2.5 py-1 font-mono !text-[11px] !text-[var(--accent-ink)] transition-opacity', t > 0.8 ? 'opacity-100' : 'opacity-0')}>
          <Check className="size-3.5" /> Brouillon créé · en attente de signature
        </p>
      </div>
    );
  }
  // validation
  return (
    <div className={card}>
      <p className={head}>À vous de jouer</p>
      <p className="mb-4 !text-[13px] !text-[var(--violet-900)]">L’agent ne signe et ne paie jamais : vous gardez la main sur chaque formalité.</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {['Relire', 'Signer', 'Payer'].map((x, i) => (
          <span
            key={x}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 font-mono text-[12px] transition-colors duration-300',
              visible(i, 3, t) ? 'border-[var(--violet-600)] bg-[var(--violet-600)] text-white' : 'border-[var(--ink-150)] text-[var(--ink-500)]',
            )}
          >
            {visible(i, 3, t) && <Check className="size-3.5" />} {x}
          </span>
        ))}
      </div>
      <p className="mt-3 font-mono !text-[11px] !text-[var(--ink-400)]">Paiement par vos moyens ou par délégation de paiement.</p>
    </div>
  );
}
