'use client';

// Page d'une commande dans l'espace entrepreneur :
//   - avant paiement : récapitulatif de la formalité proposée et paiement ;
//   - après paiement : l'assistant reprend la conversation et mène la formalité,
//     avec les documents du dossier à droite.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowUp, CheckCircle2, Download, FileText, Loader2, Lock, Paperclip, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Fil, CarteOffre } from '@/components/espace/Fil';
import { CadreEspace } from '@/components/espace/Demarrer';
import { Etapes } from '@/components/espace/Etapes';
import { FormalitePropulsee } from '@/components/espace/FormalitePropulsee';
import { euros, flux, VPS, type ItemFil, type Offre } from '@/lib/espace/chat';
import type { FormSpec, Reponses } from '@/components/cabinet/dashboard/AgentForm';
import { cn } from '@/lib/utils';

type Commande = { id: string; statut: string; offre: Offre | null; email: string | null; paye_le: string | null; dossier_id: string | null; affichage: ItemFil[]; affichage_gratuit: ItemFil[] };
type Doc = { id: string; nom: string; type: string; cree_le: string; url: string | null };
type Fichier = { name: string; mime: string; data: string };

const TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

async function jeton() {
  const { data } = await createClient().auth.getSession();
  return data.session?.access_token || null;
}

const lire = (f: File) => new Promise<string>((ok, ko) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result).split(',')[1] || '');
  r.onerror = () => ko(new Error('Lecture impossible'));
  r.readAsDataURL(f);
});

export function EspaceCommande({ id }: { id: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [c, setC] = useState<Commande | null>(null);
  const [items, setItems] = useState<ItemFil[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [paiement, setPaiement] = useState<'idle' | 'busy'>('idle');
  const [saisie, setSaisie] = useState('');
  const [fichiers, setFichiers] = useState<Fichier[]>([]);
  const filRef = useRef<HTMLDivElement>(null);
  const demarre = useRef(false);
  const [propulsee, setPropulsee] = useState(false);

  const charger = useCallback(async () => {
    const t = await jeton();
    if (!t) { router.replace(`/espace/connexion?mode=connexion&next=${encodeURIComponent(`/espace/${id}`)}`); return null; }
    const r = await fetch(`${VPS}/api/espace/commandes/${id}`, { headers: { Authorization: `Bearer ${t}` } });
    if (!r.ok) { setErreur('Commande introuvable.'); return null; }
    const d: Commande = await r.json();
    setC(d);
    setItems(d.affichage || []);
    if (d.dossier_id) {
      const rd = await fetch(`${VPS}/api/espace/commandes/${id}/documents`, { headers: { Authorization: `Bearer ${t}` } });
      if (rd.ok) setDocs((await rd.json()).documents || []);
    }
    return d;
  }, [id, router]);

  useEffect(() => { void charger(); }, [charger]);

  // Retour de Stripe : le webhook peut arriver quelques secondes après
  useEffect(() => {
    if (sp.get('paiement') !== 'ok' || c?.statut === 'payee') return;
    let n = 0;
    const t = setInterval(async () => { n += 1; const d = await charger(); if (d?.statut === 'payee' || n > 20) clearInterval(t); }, 3000);
    return () => clearInterval(t);
  }, [sp, c?.statut, charger]);

  useEffect(() => { const el = filRef.current; if (el) el.scrollTop = el.scrollHeight; }, [items, busy]);

  const envoyer = useCallback(async (texte: string, reponse?: { id: string; reponses: Reponses | null }, demarrage = false) => {
    if (busy) return;
    const enAttente = items.find((it) => it.type === 'form' && !it.repondu) as { id: string } | undefined;
    if (!reponse && enAttente && (texte.trim() || fichiers.length)) reponse = { id: enAttente.id, reponses: null };
    const t = await jeton();
    if (!t) return;
    const pj = fichiers;
    setErreur(null); setBusy(true); setSaisie(''); setFichiers([]);
    let local: ItemFil[] = items.map((it) => (reponse && it.type === 'form' && it.id === reponse.id ? { ...it, repondu: true, reponses: reponse.reponses } : it));
    if (texte.trim() || pj.length) local = [...local, { type: 'user', text: texte.trim(), files: pj.map((f) => f.name) }];
    setItems(local);
    let nouveau = true;
    const maj = (n: ItemFil[]) => { local = n; setItems(n); };
    await flux(`${VPS}/api/espace/agent`, {
      commande_id: id,
      ...(texte.trim() ? { input: texte.trim() } : {}),
      ...(pj.length ? { attachments: pj } : {}),
      ...(reponse ? { form_response: { tool_use_id: reponse.id, reponses: reponse.reponses } } : {}),
    }, {
      onText: (x) => {
        const d = local[local.length - 1];
        if (!nouveau && d?.type === 'assistant') maj([...local.slice(0, -1), { type: 'assistant', text: d.text + x }]);
        else maj([...local, { type: 'assistant', text: x }]);
        nouveau = false;
      },
      onForm: (f: FormSpec & { id: string }) => { maj([...local, { type: 'form', id: f.id, form: f, repondu: false }]); nouveau = true; },
      onTool: (d) => {
        nouveau = true;
        const autres = local.filter((it) => !(it.type === 'etape' && it.statut === 'start'));
        if (d.status === 'start') maj([...autres, { type: 'etape', label: d.label, statut: 'start' }]);
        else if (d.kind === 'document' && d.status === 'done') maj([...autres, { type: 'document', label: d.label, detail: d.detail || null }]);
        else maj([...autres, { type: 'etape', label: d.label, detail: d.status === 'error' ? d.detail : undefined, statut: d.status }]);
      },
      onDone: () => { void charger(); },
      onError: (m) => setErreur(m),
    }, t);
    setBusy(false);
    if (demarrage) demarre.current = true;
  }, [busy, fichiers, items, id, charger]);

  // Premier passage après paiement : l'assistant reprend la conversation
  useEffect(() => {
    if (c?.statut === 'payee' && !(c.affichage || []).length && !demarre.current && !busy) {
      demarre.current = true;
      void envoyer('', undefined, true);
    }
  }, [c, busy, envoyer]);

  async function payer() {
    setPaiement('busy'); setErreur(null);
    const t = await jeton();
    const r = await fetch(`${VPS}/api/espace/commandes/${id}/paiement`, { method: 'POST', headers: { Authorization: `Bearer ${t}` } });
    const j = await r.json().catch(() => ({}));
    if (j.url) { window.location.href = j.url; return; }
    if (j.deja_payee) { await charger(); setPaiement('idle'); return; }
    setErreur(j.detail || 'Le paiement n’a pas pu être lancé.');
    setPaiement('idle');
  }

  async function ajouter(list: FileList | null) {
    if (!list) return;
    const next = [...fichiers];
    for (const f of Array.from(list)) {
      if (!TYPES.includes(f.type)) { setErreur(`Format non pris en charge : ${f.name} (PDF, image ou Word).`); continue; }
      if (f.size > 8 * 1024 * 1024) { setErreur(`${f.name} dépasse 8 Mo.`); continue; }
      if (next.length >= 5) break;
      next.push({ name: f.name, mime: f.type, data: await lire(f) });
    }
    setFichiers(next);
  }

  // Avancement à gauche : déduit des documents du dossier et des étapes de l'assistant
  const payee = c?.statut === 'payee';
  const SANS_ANNONCE = ['creation_micro', 'fermeture_micro', 'mise_en_sommeil', 'depot_comptes'];
  const fDocuments = docs.some((d) => d.type && !['PIECE_JOINTE', 'ANNONCE_LEGALE'].includes(d.type) && !/^SYNTHESE/.test(d.type));
  const fAnnonce = docs.some((d) => d.type === 'ANNONCE_LEGALE') || (fDocuments && SANS_ANNONCE.includes(c?.offre?.code || ''));
  const fSignature = docs.some((d) => /\(sign[ée]\)/i.test(d.nom));
  const fDepot = items.some((it) => it.type === 'etape' && it.statut === 'done' && /brouillon.*cr[ée]{2}/i.test(it.label));
  const faites = [true, payee, fDocuments, fAnnonce, fSignature, fDepot];
  const courante = faites.findIndex((f) => !f);

  // Formalité propulsée : animation de fin, une seule fois par commande
  useEffect(() => {
    if (!fDepot) return;
    const cle = `legaly-propulsee-${id}`;
    try { if (localStorage.getItem(cle)) return; localStorage.setItem(cle, '1'); } catch {}
    setPropulsee(true);
  }, [fDepot, id]);

  if (erreur && !c) return <p className="rounded-lg bg-[#fff1ef] p-4 text-sm text-[#c2410c]">{erreur}</p>;
  if (!c) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Chargement…</div>;

  // ── Avant paiement ──
  if (c.statut !== 'payee') {
    return (
      <CadreEspace etapes={<Etapes faites={faites} courante={courante} />}>
      <div className="mx-auto max-w-2xl space-y-5">
        <div>
          <h1 className="!m-0 text-2xl font-semibold text-[#241143]">Votre formalité</h1>
          <p className="!m-0 mt-1 text-sm text-[#6b6385]">Réglez la prestation pour que l’assistant poursuive avec vous et prépare tout le dossier.</p>
        </div>
        {sp.get('paiement') === 'ok' && <p className="flex items-center gap-2 rounded-lg bg-[#f4efff] p-3 text-sm text-[#361fab]"><Loader2 className="size-4 animate-spin" /> Paiement reçu, confirmation en cours…</p>}
        {sp.get('paiement') === 'annule' && <p className="rounded-lg bg-[#fff8eb] p-3 text-sm text-amber-800">Paiement annulé : vous pouvez réessayer quand vous voulez.</p>}
        {c.offre ? (
          <CarteOffre
            offre={c.offre}
            action={(
              <button type="button" onClick={() => void payer()} disabled={paiement === 'busy'} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#361fab] to-[#7551e8] px-5 py-3 text-[15px] font-semibold text-white shadow-[0_10px_24px_rgba(54,31,171,0.25)] disabled:opacity-60">
                {paiement === 'busy' ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />} Payer {euros(c.offre.prix_ttc_cents)} TTC et continuer
              </button>
            )}
          />
        ) : <p className="text-sm text-[#6b6385]">Aucune formalité proposée pour cette conversation.</p>}
        {erreur && <p className="rounded-lg bg-[#fff1ef] p-3 text-sm text-[#c2410c]">{erreur}</p>}
        <p className="flex items-center gap-1.5 text-xs text-[#8a83a3]"><Lock className="size-3.5" /> Paiement sécurisé par Stripe. Les frais officiels (greffe, annonce légale) se règlent ensuite sur le Guichet unique.</p>
      </div>
      </CadreEspace>
    );
  }

  // ── Après paiement : l'assistant ──
  const formEnAttente = items.some((it) => it.type === 'form' && !it.repondu);
  return (
    <CadreEspace etapes={<Etapes faites={faites} courante={courante} />}>
    {propulsee && <FormalitePropulsee libelle={c.offre?.libelle || 'Votre formalité'} onFermer={() => setPropulsee(false)} />}
    <div className="grid gap-5 xl:grid-cols-[1fr_260px]">
      <div className="flex min-h-[78vh] flex-col rounded-2xl border border-[#ebe6f7] bg-white">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-[#241143]">{c.offre?.libelle}</div>
            <div className="flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="size-3.5" /> Réglée{c.paye_le ? ` le ${new Date(c.paye_le).toLocaleDateString('fr-FR')}` : ''}</div>
          </div>
        </div>
        <div ref={filRef} className="flex-1 overflow-y-auto px-4 py-4">
          <Fil items={items} busy={busy} onRepondre={(fid, r) => void envoyer('', { id: fid, reponses: r })} />
          {erreur && <p className="ml-9 mt-3 rounded-lg bg-[#fff1ef] px-3 py-2 text-sm text-[#c2410c]">{erreur}</p>}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); void envoyer(saisie); }} className="border-t p-3">
          {!!fichiers.length && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {fichiers.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-[#f4efff] px-2.5 py-1 text-xs text-[#361fab]">
                  {f.name}<button type="button" onClick={() => setFichiers(fichiers.filter((_, j) => j !== i))} aria-label="Retirer"><X className="size-3" /></button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <label className={cn('grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl border text-[#6b6385] hover:text-[#361fab]', busy && 'pointer-events-none opacity-50')} title="Joindre un document (pièce d’identité, justificatif…)">
              <Paperclip className="size-4" />
              <input type="file" multiple accept=".pdf,image/*,.docx" className="hidden" onChange={(e) => { void ajouter(e.target.files); e.target.value = ''; }} />
            </label>
            <textarea
              value={saisie} onChange={(e) => setSaisie(e.target.value)} rows={1} maxLength={8000}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void envoyer(saisie); } }}
              disabled={busy}
              placeholder={formEnAttente ? 'Répondez au questionnaire ci-dessus, ou écrivez votre message…' : 'Votre message…'}
              className="min-h-10 flex-1 resize-none rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#7551e8]"
            />
            <button type="submit" disabled={busy || (!saisie.trim() && !fichiers.length)} className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-r from-[#361fab] to-[#7551e8] text-white disabled:opacity-40" aria-label="Envoyer">
              <ArrowUp className="size-5" />
            </button>
          </div>
        </form>
      </div>
      <aside className="space-y-4">
        <div className="rounded-2xl border border-[#ebe6f7] bg-white p-4">
          <div className="text-sm font-semibold text-[#241143]">Vos documents</div>
          {!docs.length && <p className="!m-0 mt-2 text-xs text-[#8a83a3]">Les documents rédigés et les pièces que vous joignez apparaîtront ici.</p>}
          <ul className="!m-0 mt-2 space-y-1.5 !p-0">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center gap-2 text-xs">
                <FileText className="size-3.5 shrink-0 text-[#7551e8]" />
                <span className="min-w-0 flex-1 truncate" title={d.nom}>{d.nom}</span>
                {d.url && <a href={d.url} target="_blank" rel="noreferrer" className="text-[#7551e8]" aria-label="Télécharger"><Download className="size-3.5" /></a>}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-[#ebe6f7] bg-white p-4 text-xs leading-relaxed text-[#6b6385]">
          <div className="mb-1 text-sm font-semibold text-[#241143]">Comment ça se passe</div>
          L’assistant prépare vos documents et votre dossier. Un formaliste de Legaly le vérifie, puis le dépose au Guichet unique comme mandataire. Vous réglez les frais officiels par le lien de paiement reçu par e-mail.
        </div>
      </aside>
    </div>
    </CadreEspace>
  );
}
