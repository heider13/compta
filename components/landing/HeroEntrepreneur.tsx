'use client';

// Hero de la page Indépendants et TPE : le VRAI assistant, utilisable sans compte.
// Il oriente en deux questions au plus, propose la formalité et son prix, puis
// l'entrepreneur continue dans son espace (compte + paiement), où la conversation
// reprend exactement là où elle s'est arrêtée.

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, RotateCcw, Sparkles } from 'lucide-react';
import { DotInfinity } from './DotInfinity';
import { Fil, BoutonOffre } from '@/components/espace/Fil';
import { flux, VPS, type ItemFil, type Offre } from '@/lib/espace/chat';
import type { FormSpec, Reponses } from '@/components/cabinet/dashboard/AgentForm';
import { cn } from '@/lib/utils';

const CLE = 'legaly_chat_entrepreneur';

export function HeroEntrepreneur({
  kicker, ligne1, ligne2, sousTitre, exemples,
}: { kicker: string; ligne1: string; ligne2: string; sousTitre: string; exemples: string[] }) {
  const [items, setItems] = useState<ItemFil[]>([]);
  const [commandeId, setCommandeId] = useState<string | null>(null);
  const [statut, setStatut] = useState<'ouverte' | 'offre' | string>('ouverte');
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [saisie, setSaisie] = useState('');
  const filRef = useRef<HTMLDivElement>(null);

  // Reprise d'une conversation en cours (même navigateur)
  useEffect(() => {
    let id: string | null = null;
    try { id = localStorage.getItem(CLE); } catch {}
    if (!id) return;
    fetch(`${VPS}/api/public/commandes/${id}`).then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) { try { localStorage.removeItem(CLE); } catch {} return; }
      setCommandeId(d.commande_id);
      setItems(d.affichage || []);
      setStatut(d.statut);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const el = filRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items, busy]);

  async function envoyer(texte: string, reponse?: { id: string; reponses: Reponses | null }) {
    if (busy || (!texte.trim() && !reponse)) return;
    const enAttente = items.find((it) => it.type === 'form' && !it.repondu) as { id: string } | undefined;
    if (!reponse && enAttente && texte.trim()) reponse = { id: enAttente.id, reponses: null };
    setErreur(null);
    setBusy(true);
    setSaisie('');
    let local: ItemFil[] = items.map((it) => (reponse && it.type === 'form' && it.id === reponse.id ? { ...it, repondu: true, reponses: reponse.reponses } : it));
    if (texte.trim()) local = [...local, { type: 'user', text: texte.trim() }];
    setItems(local);
    let nouveauTexte = true;
    const maj = (next: ItemFil[]) => { local = next; setItems(next); };
    await flux(`${VPS}/api/public/agent`, {
      commande_id: commandeId,
      ...(texte.trim() ? { input: texte.trim() } : {}),
      ...(reponse ? { form_response: { tool_use_id: reponse.id, reponses: reponse.reponses } } : {}),
    }, {
      onText: (t) => {
        const dernier = local[local.length - 1];
        if (!nouveauTexte && dernier?.type === 'assistant') maj([...local.slice(0, -1), { type: 'assistant', text: dernier.text + t }]);
        else maj([...local, { type: 'assistant', text: t }]);
        nouveauTexte = false;
      },
      onForm: (f: FormSpec & { id: string }) => { maj([...local, { type: 'form', id: f.id, form: f, repondu: false }]); nouveauTexte = true; },
      onTool: (d) => { if (d.kind === 'offre' && d.status === 'done' && d.offre) maj([...local, { type: 'offre', offre: d.offre }]); nouveauTexte = true; },
      onDone: (d) => {
        const id = String(d.commande_id || '');
        if (id) { setCommandeId(id); try { localStorage.setItem(CLE, id); } catch {} }
        setStatut(String(d.statut || 'ouverte'));
      },
      onPaywall: (d) => {
        setStatut('offre');
        if (d.offre && !local.some((it) => it.type === 'offre')) maj([...local, { type: 'offre', offre: d.offre as Offre }]);
      },
      onError: (m) => setErreur(m),
    });
    setBusy(false);
  }

  function recommencer() {
    try { localStorage.removeItem(CLE); } catch {}
    setItems([]); setCommandeId(null); setStatut('ouverte'); setErreur(null);
  }

  const formEnAttente = items.some((it) => it.type === 'form' && !it.repondu);
  const termine = statut !== 'ouverte';
  const vide = items.length === 0;
  const suite = commandeId ? `/espace/commencer?commande=${commandeId}` : '/espace/connexion';

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
          {!vide && (
            <div ref={filRef} className="max-h-[560px] overflow-y-auto px-1 pb-3 pt-1 sm:px-2">
              <Fil
                items={items}
                busy={busy}
                onRepondre={(id, r) => void envoyer('', { id, reponses: r })}
                actionOffre={() => <BoutonOffre href={suite}>Continuer avec l’assistant</BoutonOffre>}
              />
              {erreur && <p className="ml-9 mt-3 rounded-lg bg-[#fff1ef] px-3 py-2 text-sm !text-[#c2410c]">{erreur}</p>}
            </div>
          )}

          {!termine ? (
            <form onSubmit={(e) => { e.preventDefault(); void envoyer(saisie); }} className={cn('relative', !vide && 'border-t pt-3')}>
              <textarea
                value={saisie}
                onChange={(e) => setSaisie(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void envoyer(saisie); } }}
                rows={vide ? 3 : 1}
                maxLength={1500}
                disabled={busy}
                placeholder={formEnAttente ? 'Répondez au questionnaire ci-dessus, ou écrivez votre message…' : vide ? 'Décrivez votre projet : « Je veux créer ma micro-entreprise de graphisme », « transférer le siège de mon EURL »…' : 'Votre message…'}
                className="w-full resize-none rounded-2xl border-0 bg-transparent px-3 py-2 pr-14 text-[15px] text-[#241143] outline-none placeholder:text-[#9a93b3]"
              />
              <button type="submit" disabled={busy || !saisie.trim()} aria-label="Envoyer" className="absolute bottom-2 right-2 grid size-10 place-items-center rounded-xl bg-gradient-to-r from-[#361fab] to-[#7551e8] text-white transition-opacity disabled:opacity-40">
                <ArrowUp className="size-5" />
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-3 border-t px-2 pt-3 text-xs text-[#6b6385]">
              <span>La suite se passe dans votre espace : l’assistant reprend exactement là où vous en êtes.</span>
              <button type="button" onClick={recommencer} className="inline-flex shrink-0 items-center gap-1 text-[#7551e8] hover:underline"><RotateCcw className="size-3.5" /> Autre projet</button>
            </div>
          )}
        </div>

        {vide && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {exemples.map((x) => (
              <button key={x} type="button" onClick={() => void envoyer(x)} className="rounded-full border border-[var(--ink-150)] bg-white px-3.5 py-1.5 text-sm !text-[var(--ink-600)] transition-colors hover:border-[var(--violet-400)] hover:!text-[var(--violet-900)]">{x}</button>
            ))}
          </div>
        )}
        {vide && erreur && <p className="mt-3 text-center text-sm !text-[#c2410c]">{erreur}</p>}
        <p className="!mx-auto !mt-5 max-w-lg text-center text-xs !text-[var(--ink-500)]">
          Gratuit et sans compte : l’assistant vous oriente en deux questions, puis vous propose la formalité adaptée et son prix. Vous ne payez que si vous décidez de continuer.
        </p>
      </div>
    </section>
  );
}
