'use client';

// Grand chat de démarrage de l'entrepreneur (après la création du compte) :
// étapes à gauche, demande au centre, puis l'assistant identifie la formalité
// (arbre de décision, sans IA), affiche son prix et lance le paiement. Une fois
// payée, la commande s'ouvre (/espace/[id]) et l'assistant réalise la formalité.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Info, Loader2, Lock, RotateCcw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Avatar, CarteOffre } from '@/components/espace/Fil';
import { Etapes } from '@/components/espace/Etapes';
import { VPS, euros, type Offre } from '@/lib/espace/chat';
import { NOEUDS, aiguiller, type Fin } from '@/lib/espace/parcours';
import { cn } from '@/lib/utils';

type Etape = { noeud: string; choix?: string };

async function jeton() {
  const { data } = await createClient().auth.getSession();
  return data.session?.access_token || null;
}

export function CadreEspace({ etapes, children }: { etapes: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
      <aside className="lg:sticky lg:top-20 lg:self-start">{etapes}</aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Demarrer({ demande }: { demande: string }) {
  const router = useRouter();
  const [tarifs, setTarifs] = useState<Record<string, Offre>>({});
  const [incompris, setIncompris] = useState(false);
  const [etapes, setEtapes] = useState<Etape[]>([{ noeud: 'debut' }]);
  const [fin, setFin] = useState<{ fin: Fin; choix: string } | null>(null);
  const [reflexion, setReflexion] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [commandeId, setCommandeId] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${VPS}/api/public/tarifs`).then((r) => r.json()).then((d) => {
      setTarifs(Object.fromEntries((d.tarifs || []).map((o: Offre) => [o.code, o])));
    }).catch(() => {});
  }, []);

  // Lecture de la demande : quelques instants de « réflexion », puis la question suivante
  useEffect(() => {
    const t = demande.trim();
    const timer = setTimeout(() => {
      setReflexion(false);
      if (!t) return;
      const { noeud, reconnu, choix } = aiguiller(t);
      setIncompris(!reconnu);
      const depart: Etape[] = noeud === 'debut' ? [{ noeud: 'debut' }] : [{ noeud: 'debut', choix: reconnu || undefined }, { noeud }];
      const opt = choix ? NOEUDS[noeud].options.find((o) => o.label === choix) : undefined;
      if (opt) {
        const avecChoix = depart.map((e, i) => (i === depart.length - 1 ? { ...e, choix: opt.label } : e));
        if (opt.fin) { setEtapes(avecChoix); setFin({ fin: opt.fin, choix: opt.label }); return; }
        if (opt.suite) { setEtapes([...avecChoix, { noeud: opt.suite }]); return; }
      }
      setEtapes(depart);
    }, 900);
    return () => clearTimeout(timer);
  }, [demande]);

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [etapes, fin, reflexion]);

  function choisir(index: number, label: string, suite?: string, f?: Fin) {
    const base = etapes.slice(0, index + 1).map((e, i) => (i === index ? { ...e, choix: label } : e));
    if (f) { setEtapes(base); setFin({ fin: f, choix: label }); return; }
    if (suite) { setFin(null); setEtapes([...base, { noeud: suite }]); }
  }

  function retour() {
    if (fin) { setFin(null); setEtapes(etapes.map((e, i) => (i === etapes.length - 1 ? { noeud: e.noeud } : e))); return; }
    if (etapes.length > 1) { const prec = etapes.slice(0, -1); setEtapes(prec.map((e, i) => (i === prec.length - 1 ? { noeud: e.noeud } : e))); }
  }

  const offre = fin ? tarifs[fin.fin.code] : null;
  const resume = () => {
    const parts = etapes.filter((e) => e.choix && !NOEUDS[e.noeud].info).map((e) => e.choix);
    return `Votre projet : ${parts.join(' · ')}${fin?.fin.forme ? ` — forme conseillée : ${fin.fin.forme}` : ''}.`;
  };

  // Commande → rattachée au compte → paiement (Stripe). Payée, la commande s'ouvre.
  async function payer() {
    if (!fin || !offre) return;
    setEnvoi(true); setErreur(null);
    try {
      let id = commandeId;
      if (!id) {
        const reponses = [
          ...(demande ? [{ question: 'Votre projet en quelques mots', reponse: demande }] : []),
          ...etapes.filter((e) => e.choix).map((e) => ({ question: NOEUDS[e.noeud].question, reponse: e.choix as string })),
        ];
        const r = await fetch(`${VPS}/api/public/commandes`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: fin.fin.code, forme: fin.fin.forme, resume: `${resume()} ${fin.fin.pourquoi}`, reponses }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.detail || 'Impossible de continuer pour le moment.');
        id = d.commande_id as string;
        setCommandeId(id);
      }
      const t = await jeton();
      if (!t) { router.replace(`/espace/connexion?next=${encodeURIComponent(`/espace/demarrer?demande=${encodeURIComponent(demande)}`)}`); return; }
      await fetch(`${VPS}/api/espace/commandes/${id}/rattacher`, { method: 'POST', headers: { Authorization: `Bearer ${t}` } });
      const rp = await fetch(`${VPS}/api/espace/commandes/${id}/paiement`, { method: 'POST', headers: { Authorization: `Bearer ${t}` } });
      const j = await rp.json().catch(() => ({}));
      if (j.url) { window.location.href = j.url; return; }
      if (j.deja_payee || j.simule) { router.push(`/espace/${id}`); return; }
      throw new Error(j.detail || 'Le paiement n’a pas pu être lancé.');
    } catch (e) {
      setErreur((e as Error).message);
      setEnvoi(false);
    }
  }

  const faites = [Boolean(fin && offre), false, false, false, false, false];

  return (
    <CadreEspace etapes={<Etapes faites={faites} courante={fin && offre ? 1 : 0} />}>
      <div className="mx-auto max-w-2xl">
        <h1 className="!m-0 text-center font-[Sora] !text-[clamp(1.8rem,3.6vw,2.6rem)] !font-semibold !leading-tight !tracking-[-0.02em] !text-[#241143]">
          Chaque formalité commence par une phrase.
        </h1>

        <div className="mt-6 rounded-2xl border border-[#e4dcff] bg-white px-5 py-4 shadow-[0_8px_24px_rgba(54,31,171,0.06)]">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#7551e8]">Votre demande</div>
          <p className="!m-0 mt-1 text-[15px] !text-[#241143]">{demande || 'Je souhaite être guidé pas à pas.'}</p>
        </div>

        <div className="mt-6 space-y-4">
          {reflexion ? (
            <div className="flex items-center gap-2.5 font-mono text-sm text-[#6b6385]"><Avatar /> <span className="inline-flex items-center gap-2">réflexion<span className="animate-pulse">…</span></span></div>
          ) : (
            <>
              {demande && incompris && (
                <div className="flex gap-2.5"><Avatar /><p className="!m-0 pt-1 text-sm !text-[#241143]">Je n’ai pas tout saisi : choisissez ce qui correspond le mieux, je vous guide.</p></div>
              )}
              {etapes.map((e, i) => {
                const n = NOEUDS[e.noeud];
                const actif = i === etapes.length - 1 && !fin;
                if (demande && i === 0 && e.choix && etapes.length > 1) return null;
                return (
                  <div key={`${e.noeud}-${i}`} className="space-y-3 animate-in fade-in-0 slide-in-from-bottom-1">
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
                <div className="space-y-3 animate-in fade-in-0 slide-in-from-bottom-1">
                  <div className="flex gap-2.5"><Avatar /><p className="!m-0 pt-0.5 text-[15px] !text-[#241143]">Voici la formalité adaptée à votre projet. Réglez-la pour que je la réalise avec vous, étape par étape.</p></div>
                  <div className="ml-9">
                    {offre ? (
                      <CarteOffre
                        offre={{ ...offre, forme: fin.fin.forme, resume: resume(), pourquoi: fin.fin.pourquoi }}
                        action={(
                          <button type="button" onClick={() => void payer()} disabled={envoi} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff887b] px-5 py-3 text-[15px] font-semibold text-[#080331] shadow-[0_10px_24px_-10px_rgba(255,136,123,0.9)] transition-colors hover:bg-[#ffaca3] disabled:opacity-60">
                            {envoi ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />} Payer {euros(offre.prix_ttc_cents)} TTC et continuer
                          </button>
                        )}
                      />
                    ) : <div className="flex items-center gap-2 text-sm text-[#6b6385]"><Loader2 className="size-4 animate-spin" /> Chargement du tarif…</div>}
                    {erreur && (
                      <div className="mt-2 rounded-lg bg-[#fff1ef] px-3 py-2 text-sm text-[#c2410c]">
                        {erreur}
                        {commandeId && <> <a href={`/espace/${commandeId}`} className="font-semibold underline">Voir ma commande</a></>}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-[#ece8f7] pt-3 text-xs">
                <button type="button" onClick={retour} disabled={etapes.length <= 1 && !fin} className="inline-flex items-center gap-1 text-[#6b6385] hover:text-[#361fab] disabled:opacity-30"><ChevronLeft className="size-3.5" /> Retour</button>
                <button type="button" onClick={() => { setFin(null); setIncompris(false); setEtapes([{ noeud: 'debut' }]); setErreur(null); }} className="inline-flex items-center gap-1 text-[#7551e8] hover:underline"><RotateCcw className="size-3.5" /> Recommencer</button>
              </div>
            </>
          )}
          <div ref={finRef} />
        </div>
      </div>
    </CadreEspace>
  );
}
