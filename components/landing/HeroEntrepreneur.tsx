'use client';

// Hero de la page Indépendants et TPE : parcours d'orientation GRATUIT, sous
// forme de conversation, piloté par un arbre de décision (lib/espace/parcours.ts,
// aucun appel à l'IA). À l'issue, la formalité et son prix (grille du serveur) ;
// l'entrepreneur continue dans son espace, où le vrai assistant prend le relais.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUp, ChevronLeft, Info, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { DotInfinity } from './DotInfinity';
import { Avatar, CarteOffre } from '@/components/espace/Fil';
import { VPS, type Offre } from '@/lib/espace/chat';
import { NOEUDS, aiguiller, type Fin } from '@/lib/espace/parcours';
import { cn } from '@/lib/utils';

type Etape = { noeud: string; choix?: string };

export function HeroEntrepreneur({
  kicker, ligne1, ligne2, sousTitre, exemples,
}: { kicker: string; ligne1: string; ligne2: string; sousTitre: string; exemples: string[] }) {
  const router = useRouter();
  const [tarifs, setTarifs] = useState<Record<string, Offre>>({});
  const [debute, setDebute] = useState(false);
  const [message, setMessage] = useState<string | null>(null); // message libre de départ
  const [incompris, setIncompris] = useState(false);
  const [etapes, setEtapes] = useState<Etape[]>([{ noeud: 'debut' }]);
  const [fin, setFin] = useState<{ fin: Fin; choix: string } | null>(null);
  const [saisie, setSaisie] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const filRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${VPS}/api/public/tarifs`).then((r) => r.json()).then((d) => {
      setTarifs(Object.fromEntries((d.tarifs || []).map((o: Offre) => [o.code, o])));
    }).catch(() => {});
  }, []);

  useEffect(() => { const el = filRef.current; if (el) el.scrollTop = el.scrollHeight; }, [etapes, fin]);

  function demarrer(texte: string) {
    const t = texte.trim();
    if (!t) return;
    const { noeud, reconnu, choix } = aiguiller(t);
    setDebute(true);
    setMessage(t);
    setIncompris(!reconnu);
    setFin(null);
    setSaisie('');
    const depart: Etape[] = noeud === 'debut' ? [{ noeud: 'debut' }] : [{ noeud: 'debut', choix: reconnu || undefined }, { noeud }];
    // Réponse déjà contenue dans le message (« SASU », « transférer le siège »…)
    const opt = choix ? NOEUDS[noeud].options.find((o) => o.label === choix) : undefined;
    if (opt) {
      const avecChoix = depart.map((e, i) => (i === depart.length - 1 ? { ...e, choix: opt.label } : e));
      if (opt.fin) { setEtapes(avecChoix); setFin({ fin: opt.fin, choix: opt.label }); return; }
      if (opt.suite) { setEtapes([...avecChoix, { noeud: opt.suite }]); return; }
    }
    setEtapes(depart);
  }

  function choisir(index: number, label: string, suite?: string, f?: Fin) {
    const base = etapes.slice(0, index + 1).map((e, i) => (i === index ? { ...e, choix: label } : e));
    if (f) { setEtapes(base); setFin({ fin: f, choix: label }); return; }
    if (suite) { setFin(null); setEtapes([...base, { noeud: suite }]); }
  }

  function retour() {
    if (fin) { setFin(null); setEtapes(etapes.map((e, i) => (i === etapes.length - 1 ? { noeud: e.noeud } : e))); return; }
    if (etapes.length > 1) { const prec = etapes.slice(0, -1); setEtapes(prec.map((e, i) => (i === prec.length - 1 ? { noeud: e.noeud } : e))); }
  }

  function recommencer() {
    setDebute(false); setMessage(null); setIncompris(false); setFin(null); setEtapes([{ noeud: 'debut' }]); setErreur(null);
  }

  const offre = fin ? tarifs[fin.fin.code] : null;
  const resume = () => {
    const parts = etapes.filter((e) => e.choix && !NOEUDS[e.noeud].info).map((e) => e.choix);
    return `Votre projet : ${parts.join(' · ')}${fin?.fin.forme ? ` — forme conseillée : ${fin.fin.forme}` : ''}.`;
  };

  async function continuer() {
    if (!fin || !offre) return;
    setEnvoi(true); setErreur(null);
    const reponses = [
      ...(message ? [{ question: 'Votre projet en quelques mots', reponse: message }] : []),
      ...etapes.filter((e) => e.choix).map((e) => ({ question: NOEUDS[e.noeud].question, reponse: e.choix as string })),
    ];
    try {
      const r = await fetch(`${VPS}/api/public/commandes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: fin.fin.code, forme: fin.fin.forme, resume: `${resume()} ${fin.fin.pourquoi}`, reponses }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Impossible de continuer pour le moment.');
      router.push(`/espace/commencer?commande=${d.commande_id}`);
    } catch (e) {
      setErreur((e as Error).message);
      setEnvoi(false);
    }
  }

  return (
    <section className="relative overflow-hidden bg-[#fcfbff]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 900px 600px at 50% 10%, rgba(117,81,232,0.14), transparent 65%), radial-gradient(ellipse 600px 420px at 0% 100%, rgba(255,136,123,0.10), transparent 60%)' }} />
      <DotInfinity className="pointer-events-none absolute left-1/2 top-[70px] h-[520px] w-[min(1400px,100vw)] -translate-x-1/2 opacity-[0.35] sm:h-[620px]" />
      <div className="relative mx-auto w-full max-w-3xl px-4 pb-20 pt-32 sm:px-6 sm:pt-36">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--violet-200)] bg-[var(--violet-50)] px-3 py-1 text-xs font-semibold text-[var(--violet-700)]"><Sparkles className="size-3.5" /> {kicker}</span>
          <h1 className="!mt-5 font-[Sora] !text-[clamp(2.1rem,4.6vw,3.4rem)] !font-bold !leading-[1.05] !tracking-[-0.03em] !text-[var(--violet-900)]">
            {ligne1} <span className="bg-gradient-to-r from-[#4a2bc4] via-[#7551e8] to-[#c13ad6] bg-clip-text text-transparent">{ligne2}</span>
          </h1>
          <p className="!mx-auto !mt-4 max-w-xl text-base !leading-relaxed !text-[var(--ink-600)]">{sousTitre}</p>
        </div>

        <div className="mt-8 rounded-3xl border border-[var(--ink-150)] bg-white/95 p-3 shadow-[0_30px_80px_rgba(20,13,46,0.12)] backdrop-blur sm:p-4">
          {!debute ? (
            <form onSubmit={(e) => { e.preventDefault(); demarrer(saisie); }} className="relative">
              <textarea
                value={saisie}
                onChange={(e) => setSaisie(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); demarrer(saisie); } }}
                rows={3}
                maxLength={500}
                placeholder="Décrivez votre projet : « Je veux créer ma micro-entreprise de graphisme », « transférer le siège de mon EURL »…"
                className="w-full resize-none rounded-2xl border-0 bg-transparent px-3 py-2 pr-14 text-[15px] text-[#241143] outline-none placeholder:text-[#9a93b3]"
              />
              <button type="submit" disabled={!saisie.trim()} aria-label="Commencer" className="absolute bottom-2 right-2 grid size-10 place-items-center rounded-xl bg-gradient-to-r from-[#361fab] to-[#7551e8] text-white transition-opacity disabled:opacity-40">
                <ArrowUp className="size-5" />
              </button>
              <div className="border-t px-3 pt-3">
                <button type="button" onClick={() => { setDebute(true); setEtapes([{ noeud: 'debut' }]); }} className="text-sm font-medium text-[#7551e8] hover:underline">
                  Ou laissez-vous guider pas à pas →
                </button>
              </div>
            </form>
          ) : (
            <div ref={filRef} className="max-h-[600px] space-y-4 overflow-y-auto px-1 pb-1 pt-1 sm:px-2">
              {message && (
                <div className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#361fab] px-4 py-2.5 text-sm text-white">{message}</div></div>
              )}
              {message && incompris && (
                <div className="flex gap-2.5"><Avatar /><p className="!m-0 pt-1 text-sm !text-[#241143]">Je n’ai pas tout saisi : choisissez ce qui correspond le mieux, je vous guide.</p></div>
              )}
              {etapes.map((e, i) => {
                const n = NOEUDS[e.noeud];
                const actif = i === etapes.length - 1 && !fin;
                // L'étape reconnue dans le message libre n'est pas réaffichée
                if (message && i === 0 && e.choix && etapes.length > 1) return null;
                return (
                  <div key={`${e.noeud}-${i}`} className="space-y-3">
                    <div className="flex gap-2.5">
                      <Avatar />
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className={cn('!m-0 text-[15px] !text-[#241143]', !n.info && 'font-semibold')}>{n.info && <Info className="mr-1.5 inline size-4 text-[#7551e8]" />}{n.question}</p>
                        {n.aide && <p className="!m-0 mt-1 text-xs !text-[#6b6385]">{n.aide}</p>}
                      </div>
                    </div>
                    {actif ? (
                      <div className="ml-9 grid gap-2 sm:grid-cols-2">
                        {n.options.map((o) => (
                          <button key={o.label} type="button" onClick={() => choisir(i, o.label, o.suite, o.fin)} className="rounded-xl border border-[#e4dcff] bg-white px-3.5 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-[#7551e8] hover:shadow-[0_8px_20px_rgba(117,81,232,0.12)]">
                            <span className="block text-sm font-semibold text-[#241143]">{o.label}</span>
                            {o.description && <span className="mt-0.5 block text-xs text-[#6b6385]">{o.description}</span>}
                          </button>
                        ))}
                      </div>
                    ) : e.choix ? (
                      <div className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#361fab] px-4 py-2.5 text-sm text-white">{e.choix}</div></div>
                    ) : null}
                  </div>
                );
              })}
              {fin && (
                <div className="space-y-3">
                  <div className="flex gap-2.5"><Avatar /><p className="!m-0 pt-0.5 text-[15px] !text-[#241143]">Voici la formalité adaptée à votre projet.</p></div>
                  <div className="ml-9">
                    {offre ? (
                      <CarteOffre
                        offre={{ ...offre, forme: fin.fin.forme, resume: resume(), pourquoi: fin.fin.pourquoi }}
                        action={(
                          <button type="button" onClick={() => void continuer()} disabled={envoi} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#361fab] to-[#7551e8] px-5 py-3 text-[15px] font-semibold text-white shadow-[0_10px_24px_rgba(54,31,171,0.25)] transition-transform hover:-translate-y-0.5 disabled:opacity-60">
                            {envoi && <Loader2 className="size-4 animate-spin" />} Continuer avec l’assistant
                          </button>
                        )}
                      />
                    ) : <div className="flex items-center gap-2 text-sm text-[#6b6385]"><Loader2 className="size-4 animate-spin" /> Chargement du tarif…</div>}
                    {erreur && <p className="mt-2 rounded-lg bg-[#fff1ef] px-3 py-2 text-sm !text-[#c2410c]">{erreur}</p>}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between border-t pt-3 text-xs">
                <button type="button" onClick={retour} disabled={etapes.length <= 1 && !fin} className="inline-flex items-center gap-1 text-[#6b6385] hover:text-[#361fab] disabled:opacity-30"><ChevronLeft className="size-3.5" /> Retour</button>
                <button type="button" onClick={recommencer} className="inline-flex items-center gap-1 text-[#7551e8] hover:underline"><RotateCcw className="size-3.5" /> Recommencer</button>
              </div>
            </div>
          )}
        </div>

        {!debute && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {exemples.map((x) => (
              <button key={x} type="button" onClick={() => demarrer(x)} className="rounded-full border border-[var(--ink-150)] bg-white px-3.5 py-1.5 text-sm !text-[var(--ink-600)] transition-colors hover:border-[var(--violet-400)] hover:!text-[var(--violet-900)]">{x}</button>
            ))}
          </div>
        )}
        <p className="!mx-auto !mt-5 max-w-lg text-center text-xs !text-[var(--ink-500)]">
          Gratuit et sans compte : quelques questions pour trouver la formalité adaptée et son prix. Vous ne payez que si vous décidez de continuer avec l’assistant.
        </p>
      </div>
    </section>
  );
}
