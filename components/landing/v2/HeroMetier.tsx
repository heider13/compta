'use client';

// Hero des pages métier (sans chat, réservé à l'accueil) : titre et appels à
// l'action à gauche, scène animée propre au métier à droite.
//   experts-comptables  → portefeuille clients qui se prépare dossier par dossier
//   avocats             → acte qui se rédige, annoté et tamponné « prêt à signer »
//   directions-juridiques → organigramme du groupe, changement propagé aux filiales

import { useEffect, useState } from 'react';
import { ArrowRight, Check, CreditCard, FileText, Layers, Loader2, PenLine, ShieldCheck, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

function useCycle(n: number, ms: number) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const reduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduit) { setI(n); return; }
    const t = setInterval(() => setI((x) => (x + 1) % (n + 3)), ms);
    return () => clearInterval(t);
  }, [n, ms]);
  return Math.min(i, n);
}

const CARTE = 'rounded-2xl border border-[var(--ink-150)] bg-white shadow-[0_24px_60px_rgba(20,13,46,0.10)]';
const FLOTTANTE = 'absolute hidden rounded-xl border border-[var(--ink-150)] bg-white px-3.5 py-2.5 shadow-[0_12px_30px_rgba(20,13,46,0.10)] sm:block';

// ── Experts-comptables : portefeuille clients ──
function ScenePortefeuille() {
  const clients = [
    ['ALPHA CONSEIL', 'Création SASU'],
    ['BOULANGERIE MARTIN', 'Changement de gérant'],
    ['SCI DU PORT', 'Transfert de siège'],
    ['GAMMA FINANCE', 'Mise en sommeil'],
    ['DELTA TRANSPORTS', 'Création SARL'],
  ];
  const prets = useCycle(clients.length, 1300);
  return (
    <div className="relative mx-auto w-full max-w-[480px]">
      <div className={cn(CARTE, 'p-5')}>
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--violet-600)]">Portefeuille clients</p>
          <span className="rounded-full bg-[var(--violet-50)] px-2.5 py-1 text-[11px] font-semibold text-[var(--violet-700)]">{prets}/{clients.length} prêts</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--ink-100)]">
          <div className="h-full rounded-full bg-gradient-to-r from-[#7551e8] to-[#c13ad6] transition-all duration-700" style={{ width: `${(prets / clients.length) * 100}%` }} />
        </div>
        <ul className="mt-4 space-y-2">
          {clients.map(([nom, op], i) => {
            const pret = i < prets;
            const enCours = i === prets;
            return (
              <li key={nom} className={cn('flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors duration-500', pret ? 'border-emerald-200 bg-emerald-50/60' : enCours ? 'border-[var(--violet-300)] bg-[var(--violet-50)]' : 'border-[var(--ink-150)]')}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--violet-900)]">{nom}</span>
                  <span className="block text-xs text-[var(--ink-500)]">{op}</span>
                </span>
                {pret ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"><Check className="size-3" /> Prêt</span>
                ) : enCours ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--violet-100)] px-2 py-0.5 text-[11px] font-semibold text-[var(--violet-700)]"><Loader2 className="size-3 animate-spin" /> L’agent prépare</span>
                ) : (
                  <span className="text-[11px] text-[var(--ink-400)]">En attente</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <div className={cn(FLOTTANTE, 'bp-float -top-6 left-6')}>
        <p className="flex items-center gap-2 text-sm font-semibold text-[var(--violet-900)]"><Layers className="size-4 text-[var(--violet-600)]" /> Lot : 5 clients</p>
      </div>
      <div className={cn(FLOTTANTE, 'bp-float-slow -right-8 bottom-10')}>
        <p className="flex items-center gap-2 text-sm font-semibold text-[var(--violet-900)]"><CreditCard className="size-4 text-[var(--accent)]" /> Frais refacturés au client</p>
      </div>
    </div>
  );
}

// ── Avocats : acte qui se rédige ──
function SceneActe() {
  const lignes = [
    'L’an deux mille vingt-six, l’associé unique de la société',
    'a décidé la dissolution anticipée de la société à compter de ce jour',
    'et sa mise en liquidation amiable sous le régime conventionnel.',
    'Il nomme en qualité de liquidateur M. le gérant, avec les pouvoirs',
    'les plus étendus pour réaliser l’actif et acquitter le passif.',
  ];
  const n = useCycle(lignes.length, 1100);
  const notes = [
    { a: 1, t: 'Article 1844-7 vérifié', c: '#361fab' },
    { a: 3, t: 'Liquidateur et pouvoirs', c: '#a43bc9' },
    { a: 5, t: 'Mentions de l’annonce prêtes', c: '#e2675c' },
  ];
  return (
    <div className="relative mx-auto w-full max-w-[540px]">
      <div className={cn(CARTE, 'grid grid-cols-1 overflow-hidden sm:grid-cols-[1fr_170px]')}>
        <div className="p-6">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--violet-600)]">Procès-verbal des décisions</p>
          <p className="mt-1 font-[Sora] text-lg font-semibold text-[var(--violet-900)]">Dissolution anticipée</p>
          <p className="mt-4 min-h-[9.5rem] leading-relaxed text-[var(--ink-700)]" style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 15.5 }}>
            {lignes.map((l, i) => (
              <span key={l} className={cn('transition-opacity duration-700', i < n ? 'opacity-100' : 'opacity-0')}>
                {l}{' '}
              </span>
            ))}
          </p>
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--ink-100)] pt-4">
            <span className="flex items-center gap-1.5 text-xs text-[var(--ink-500)]"><PenLine className="size-3.5" /> D’après le modèle du cabinet</span>
            <span className={cn('shrink-0 rotate-[-6deg] rounded-lg border-2 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider transition-all duration-500', n >= lignes.length ? 'scale-100 border-[var(--violet-600)] text-[var(--violet-600)] opacity-100' : 'scale-150 border-transparent text-transparent opacity-0')}>
              Prêt à signer
            </span>
          </div>
        </div>
        {/* Marge : annotations de l'agent */}
        <div className="hidden space-y-3 border-l border-[var(--ink-100)] bg-[#f7f7fa] p-4 sm:block">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--violet-600)]">Notes de l’agent</p>
          {notes.map((x) => (
            <div key={x.t} className={cn('rounded-lg border border-[var(--ink-150)] bg-white px-2.5 py-2 shadow-sm transition-all duration-500', n >= x.a ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0')}>
              <p className="flex items-start gap-1.5 text-[11px] font-semibold leading-snug text-[var(--violet-900)]">
                <span className="mt-px grid size-4 shrink-0 place-items-center rounded-full text-white" style={{ background: x.c }}><Check className="size-2.5" /></span>
                {x.t}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Directions juridiques : organigramme du groupe ──
function SceneGroupe() {
  const filiales = ['Filiale France', 'Filiale Logistique', 'Filiale Services', 'SCI Immobilière'];
  const faites = useCycle(filiales.length, 1300);
  return (
    <div className="relative mx-auto w-full max-w-[500px]">
      <div className={cn(CARTE, 'p-6')}>
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--violet-600)]">Changement de président</p>
          <span className="rounded-full bg-[var(--violet-50)] px-2.5 py-1 text-[11px] font-semibold text-[var(--violet-700)]">{faites}/{filiales.length} prêtes</span>
        </div>
        <div className="mt-5 flex flex-col items-center">
          <div className="rounded-lg bg-gradient-to-r from-[#361fab] to-[#7551e8] px-5 py-2.5 text-sm font-semibold text-white">HOLDING DU GROUPE</div>
          <div className="h-5 w-px bg-[var(--violet-900)]/40" />
          <div className="h-px w-[86%] bg-[var(--violet-900)]/40" />
          <div className="grid w-full grid-cols-2 gap-3 pt-5 sm:grid-cols-4">
            {filiales.map((f, i) => {
              const ok = i < faites;
              const cours = i === faites;
              return (
                <div key={f} className={cn('relative rounded-xl border px-2 py-3 text-center transition-all duration-500', ok ? 'border-emerald-300 bg-emerald-50' : cours ? 'border-[var(--violet-400)] bg-[var(--violet-50)]' : 'border-[var(--ink-150)] bg-white')}>
                  {cours && <span className="absolute -inset-1 animate-ping rounded-xl border-2 border-[var(--violet-300)] opacity-40" aria-hidden="true" />}
                  <p className="text-[11px] font-semibold leading-tight text-[var(--violet-900)]">{f}</p>
                  <p className={cn('mt-1.5 text-[10px] font-semibold', ok ? 'text-emerald-700' : cours ? 'text-[var(--violet-700)]' : 'text-[var(--ink-400)]')}>
                    {ok ? 'PV prêt' : cours ? 'En cours…' : 'À traiter'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className={cn(FLOTTANTE, 'bp-float -left-8 -top-5')}>
        <p className="flex items-center gap-2 text-sm font-semibold text-[var(--violet-900)]"><FileText className="size-4 text-[var(--violet-600)]" /> Statuts à jour (RNE)</p>
      </div>
      <div className={cn(FLOTTANTE, 'bp-float-slow -bottom-6 -right-6')}>
        <p className="flex items-center gap-2 text-sm font-semibold text-[var(--violet-900)]"><ShieldCheck className="size-4 text-[var(--accent)]" /> Validation de la direction</p>
      </div>
    </div>
  );
}

const SCENES: Record<string, () => React.ReactNode> = {
  'experts-comptables': ScenePortefeuille,
  avocats: SceneActe,
  'directions-juridiques': SceneGroupe,
};

export function HeroMetier({
  metier,
  kicker,
  ligne1,
  ligne2,
  sousTitre,
  points,
}: {
  metier: string;
  kicker: string;
  ligne1: string;
  ligne2: string;
  sousTitre: string;
  points: string[];
}) {
  const Scene = SCENES[metier] ?? ScenePortefeuille;
  return (
    <section className="relative overflow-hidden bg-[#fcfbff]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 900px 620px at 78% 30%, rgba(117,81,232,0.16), transparent 65%),' +
            'radial-gradient(ellipse 620px 460px at 0% 0%, rgba(255,136,123,0.12), transparent 60%),' +
            'radial-gradient(ellipse 700px 500px at 100% 100%, rgba(193,58,214,0.08), transparent 62%)',
        }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#fcfbff]" />
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pb-24 pt-36 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pt-40">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--violet-200)] bg-[var(--violet-50)] px-3 py-1 text-xs font-semibold text-[var(--violet-700)]">
            <Sparkles className="size-3.5" /> {kicker}
          </span>
          <h1 className="!mt-6 font-[Sora] !text-[clamp(2.2rem,4.6vw,3.6rem)] !font-bold !leading-[1.04] !tracking-[-0.03em] !text-[var(--violet-900)]">
            {ligne1}
            <br />
            <span className="bg-gradient-to-r from-[#4a2bc4] via-[#7551e8] to-[#c13ad6] bg-clip-text text-transparent">{ligne2}</span>
          </h1>
          <p className="!mt-6 max-w-xl text-base !leading-relaxed !text-[var(--ink-600)] sm:text-lg">{sousTitre}</p>
          <ul className="mt-6 space-y-2">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-2 text-[15px] text-[var(--ink-700)]">
                <Check className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" /> {p}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/auth/signup" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#361fab] to-[#7551e8] px-6 py-3 text-[15px] font-semibold !text-white no-underline shadow-[0_10px_24px_rgba(54,31,171,0.25)] transition-transform hover:-translate-y-0.5">
              Créer un compte <ArrowRight className="size-4" />
            </a>
            <a href="/auth/signup" className="inline-flex items-center rounded-lg border border-[var(--ink-200)] bg-white px-6 py-3 text-[15px] font-semibold !text-[var(--violet-900)] no-underline transition-colors hover:border-[var(--violet-500)]">
              Demander une démo
            </a>
          </div>
        </div>
        <Scene />
      </div>
    </section>
  );
}
