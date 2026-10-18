'use client';

// Parcours d'une formalité, de la préparation par l'agent jusqu'au paiement :
//   1. réalisation de la formalité
//   2. annonce légale
//   3. signature des documents par le client (Yousign)
//   4. signature électronique de la formalité (Yousign = signature au Guichet unique)
//   5. paiement (compte client INPI du cabinet ou délégation au client)
// Affiché à droite du chat du tableau de bord et sur la page du dossier. L'état vient du
// serveur (GET /api/dossiers/:id/parcours) ; rafraîchi tout seul, plus vite quand on attend un tiers.

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle, AlertTriangle, Check, Clock, ExternalLink, FileText, HelpCircle, Loader2, Minus, Plus, Send, Trash2, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { vpsApi } from '@/components/cabinet/dashboard/BatchProgress';

type Statut = 'fait' | 'a_faire' | 'attente' | 'bloque' | 'en_cours' | 'a_venir' | 'sans_objet' | 'inconnu' | 'passee';
type Action = {
  type: string;
  label: string;
  message?: string;
  secondaire?: boolean;
  desactive?: boolean;
  raison?: string | null;
  confirmation?: string;
};
type Signataire = { prenom: string; nom: string; email: string; telephone?: string };
type Etape = {
  cle: string;
  titre: string;
  statut: Statut;
  detail: string;
  erreur?: string | null;
  alertes?: string[];
  documents?: { id: string; nom: string; signe?: boolean }[];
  actions: Action[];
  signataires?: Signataire[];
  lienSignature?: string | null;
  lienPaiement?: string | null;
  lien?: string | null;
  montant_cents?: number | null;
  emailClient?: string;
};
type Etat = {
  dossier: { id: string; reference: string; denomination: string };
  etapes: Etape[];
  courante: string | null;
  termine: boolean;
  rafraichir_ms: number;
};

// Actions → route POST /api/dossiers/:id/parcours/<route> (+ corps)
const ROUTES: Record<string, { route: string; corps?: object }> = {
  signature_inpi: { route: 'signature-inpi' },
  signature_simple: { route: 'signature-simple', corps: { confirme: true } },
  payer: { route: 'payer' },
  annuler_signature_client: { route: 'annuler', corps: { etape: 'signature_client' } },
  annuler_signature_inpi: { route: 'annuler', corps: { etape: 'signature_inpi' } },
  reverser_actes: { route: 'reverser-actes' },
  redeclarer_signature: { route: 'redeclarer-signature' },
  annonce_faite: { route: 'annonce-faite' },
  annonce_passee: { route: 'annonce-passee' },
  verser_attestation: { route: 'verser-attestation' },
  versement_ignore: { route: 'versement-ignore' },
  recommencer_signature_inpi: { route: 'recommencer-signature-inpi' },
};

const LIBELLE_STATUT: Record<Statut, string> = {
  fait: 'terminée', a_faire: 'à faire', attente: 'en attente', bloque: 'bloquée', en_cours: 'en cours',
  a_venir: 'à venir', sans_objet: 'sans objet', inconnu: 'statut indisponible', passee: 'passée, à faire plus tard',
};

const DELAI_LECTURE_MS = 12000;

function ParcoursFormaliteBase({
  dossierId,
  onAsk,
  occupe = false,
  version = 0,
}: {
  dossierId: string;
  /** Envoie une demande à l'agent (chat). Sans chat, l'action ouvre le chat du dossier. */
  onAsk?: (message: string) => void;
  /** L'agent travaille : les demandes à l'agent attendent la fin du tour. */
  occupe?: boolean;
  /** Change quand l'agent termine une étape utile : relance la lecture du parcours. */
  version?: number;
}) {
  const [etat, setEtat] = useState<Etat | null>(null);
  const [erreurLecture, setErreurLecture] = useState<string | null>(null);
  const [erreurAction, setErreurAction] = useState<{ etape: string; message: string } | null>(null);
  const [actionEnCours, setActionEnCours] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null); // formulaire ou confirmation : `${etape}:${type}`
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0); // ordre des réponses : une lecture plus ancienne ne remplace jamais une plus récente
  const enVol = useRef<AbortController | null>(null);
  const echecs = useRef(0);
  const dernierFocus = useRef(0);
  const vivant = useRef(true);
  const etatRef = useRef<Etat | null>(null);

  const planifier = useCallback((ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void chargerRef.current(), ms);
  }, []);

  const charger = useCallback(async (forcer = false) => {
    if (enVol.current && !forcer) return;
    if (document.visibilityState !== 'visible' && etatRef.current) {
      planifier(etatRef.current.rafraichir_ms); // onglet caché : pas d'appel réseau
      return;
    }
    enVol.current?.abort(); // une lecture plus récente remplace celle en cours
    const n = ++seq.current;
    const ctrl = new AbortController();
    enVol.current = ctrl;
    let expire = false;
    const delai = setTimeout(() => { expire = true; ctrl.abort(); }, DELAI_LECTURE_MS);
    try {
      const e = await vpsApi<Etat>(`/api/dossiers/${dossierId}/parcours`, { signal: ctrl.signal });
      if (!vivant.current || n !== seq.current) return;
      etatRef.current = e;
      setEtat(e);
      setErreurLecture(null);
      echecs.current = 0;
      planifier(e.rafraichir_ms);
    } catch (e) {
      if (!vivant.current || n !== seq.current) return;
      echecs.current += 1;
      setErreurLecture(expire ? 'Le serveur met du temps à répondre…' : e instanceof Error ? e.message : 'Lecture du parcours impossible.');
      // Nouvel essai de plus en plus espacé (8 s, 16 s, 32 s, 60 s max)
      planifier(Math.min(60000, 8000 * 2 ** (echecs.current - 1)));
    } finally {
      clearTimeout(delai);
      if (enVol.current === ctrl) enVol.current = null;
    }
  }, [dossierId, planifier]);
  const chargerRef = useRef(charger);
  chargerRef.current = charger;

  // Lecture initiale, puis après chaque étape utile de l'agent (anti-rebond 500 ms)
  useEffect(() => {
    vivant.current = true;
    const t = setTimeout(() => void charger(true), etatRef.current ? 500 : 0);
    return () => clearTimeout(t);
  }, [charger, version]);

  useEffect(() => {
    // Retour sur l'onglet (après une signature Yousign) : lecture immédiate, 1 fois / 5 s au plus
    const onFocus = () => {
      if (Date.now() - dernierFocus.current < 5000) return;
      dernierFocus.current = Date.now();
      void chargerRef.current();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      vivant.current = false;
      enVol.current?.abort();
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);

  async function poster(etape: string, cle: string, route: string, corps: object = {}) {
    setActionEnCours(cle);
    setErreurAction(null);
    ++seq.current; // invalide les lectures en vol
    enVol.current?.abort();
    try {
      const e = await vpsApi<Etat & { lien?: string | null }>(`/api/dossiers/${dossierId}/parcours/${route}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corps),
      });
      if (!vivant.current) return null;
      etatRef.current = e;
      setEtat(e);
      setOuvert(null);
      planifier(e.rafraichir_ms);
      return e;
    } catch (e) {
      if (vivant.current) {
        setErreurAction({ etape, message: e instanceof Error ? e.message : 'Action impossible.' });
        planifier(etatRef.current?.rafraichir_ms ?? 30000);
      }
      return null;
    } finally {
      if (vivant.current) setActionEnCours(null);
    }
  }

  async function signerAvecYousign(etape: Etape) {
    // Fenêtre ouverte pendant le clic (sinon bloquée par le navigateur), remplie au retour du serveur
    const fenetre = window.open('', '_blank');
    if (fenetre) {
      fenetre.opener = null;
      fenetre.document.title = 'Signature Yousign';
      fenetre.document.body.innerHTML = '<p style="font:15px system-ui,sans-serif;padding:32px;color:#444">Préparation de la signature de la formalité…</p>';
    }
    const r = await poster(etape.cle, 'signature_inpi', 'signature-inpi');
    if (r?.lien && fenetre) fenetre.location.href = r.lien;
    else fenetre?.close();
  }

  function lancer(etape: Etape, a: Action) {
    setErreurAction(null);
    if (a.type === 'demander') {
      if (a.message && onAsk) onAsk(a.message);
      return;
    }
    if (a.type === 'signature_client' || a.type === 'deleguer' || a.confirmation) {
      setOuvert(`${etape.cle}:${a.type}`);
      return;
    }
    if (a.type === 'signature_inpi') return void signerAvecYousign(etape);
    const r = ROUTES[a.type];
    if (r) void poster(etape.cle, a.type, r.route, r.corps);
  }

  function confirmer(etape: Etape, a: Action) {
    const r = ROUTES[a.type];
    if (!r) return;
    const corps = a.type === 'payer' ? { confirme: true, montant_cents: etape.montant_cents } : r.corps;
    void poster(etape.cle, a.type, r.route, corps);
  }

  if (!etat) return <Squelette erreur={erreurLecture} onRetry={() => void charger()} />;

  const applicables = etat.etapes.filter((e) => e.statut !== 'sans_objet');
  const faites = applicables.filter((e) => e.statut === 'fait').length;
  const pct = applicables.length ? Math.round((faites / applicables.length) * 100) : 100;
  const lienFormalite = etat.etapes[0]?.lien ?? null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Étapes de la formalité</p>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {faites}/{applicables.length}
        </span>
      </div>
      <div
        className="h-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="Avancement de la formalité"
        aria-valuemin={0}
        aria-valuemax={applicables.length}
        aria-valuenow={faites}
      >
        <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      {erreurLecture && (
        <p className="flex items-center gap-1.5 text-[11px] text-amber-700">
          <AlertCircle className="size-3 shrink-0" />
          {erreurLecture}
        </p>
      )}

      <ol className="relative">
        {etat.etapes.map((e, i) => {
          const courante = etat.courante === e.cle;
          const derniere = i === etat.etapes.length - 1;
          const attenue = e.statut === 'a_venir' || e.statut === 'sans_objet';
          const actions = e.actions;
          const raisons = actions.filter((a) => a.desactive && a.raison);
          return (
            <li key={e.cle} className="relative flex gap-3 pb-4" aria-current={courante ? 'step' : undefined}>
              {!derniere && (
                <span
                  aria-hidden
                  className={cn('absolute left-[11px] top-7 h-[calc(100%-1.5rem)] w-px', e.statut === 'fait' || e.statut === 'sans_objet' ? 'bg-primary/40' : 'bg-border')}
                />
              )}
              <Pastille statut={e.statut} numero={i + 1} />
              <div className="min-w-0 flex-1">
                <p className={cn('min-h-6 pt-0.5 text-sm leading-5', courante ? 'font-semibold' : 'font-medium', attenue && 'text-muted-foreground')}>
                  {e.titre}
                </p>
                <p className={cn('mt-0.5 text-xs leading-snug', e.statut === 'bloque' ? 'text-destructive' : 'text-muted-foreground')}>{e.detail}</p>
                {e.erreur && <p className="mt-1 text-xs leading-snug text-amber-700">{e.erreur}</p>}
                {e.alertes?.map((a) => (
                  <p key={a} className="mt-1 flex items-start gap-1 text-xs leading-snug text-amber-700">
                    <AlertCircle className="mt-0.5 size-3 shrink-0" />
                    {a}
                  </p>
                ))}
                {e.documents && e.documents.length > 0 && !attenue && (
                  <ul className="mt-1.5 space-y-0.5">
                    {e.documents.slice(0, 6).map((d) => (
                      <li key={d.id} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        {d.signe ? <Check className="size-3 shrink-0 text-emerald-600" aria-label="signé" /> : <FileText className="size-3 shrink-0" aria-hidden />}
                        <span className="truncate" title={d.nom}>{d.nom}</span>
                      </li>
                    ))}
                    {e.documents.length > 6 && <li className="text-[11px] text-muted-foreground">+ {e.documents.length - 6} autre(s)</li>}
                  </ul>
                )}
                {e.lien && e.cle === 'formalite' && (
                  <Link href={e.lien} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    Ouvrir la formalité
                  </Link>
                )}
                {e.lienSignature && (
                  <a href={e.lienSignature} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    Ouvrir la signature Yousign <ExternalLink className="size-3" aria-hidden />
                  </a>
                )}

                {actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {actions.map((a) => {
                      const raisonId = a.desactive && a.raison ? `raison-${e.cle}-${a.type}` : undefined;
                      const versChat = a.type === 'demander' && !onAsk;
                      const attendAgent = a.type === 'demander' && occupe;
                      const classes = 'h-auto min-h-7 max-w-full whitespace-normal px-2.5 py-1 text-left text-xs leading-snug';
                      if (versChat && a.message) {
                        return (
                          <Button key={a.type} asChild size="sm" variant={courante ? 'default' : 'outline'} className={classes}>
                            <Link href={`/dashboard?dossier=${dossierId}&demande=${encodeURIComponent(a.message)}`}>{a.label}</Link>
                          </Button>
                        );
                      }
                      return (
                        <Button
                          key={a.type}
                          type="button"
                          size="sm"
                          variant={a.secondaire ? 'ghost' : courante ? 'default' : 'outline'}
                          className={classes}
                          disabled={Boolean(a.desactive) || actionEnCours !== null || attendAgent}
                          aria-describedby={raisonId}
                          title={attendAgent ? 'Disponible quand l’agent a terminé' : undefined}
                          onClick={() => lancer(e, a)}
                        >
                          {actionEnCours === a.type && <Loader2 className="size-3 animate-spin" aria-hidden />}
                          {a.label}
                        </Button>
                      );
                    })}
                  </div>
                )}
                {occupe && actions.some((a) => a.type === 'demander') && onAsk && (
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">Disponible quand l&apos;agent a terminé.</p>
                )}
                {raisons.map((a) => (
                  <p key={a.type} id={`raison-${e.cle}-${a.type}`} className="mt-1 text-[11px] leading-snug text-muted-foreground">
                    {a.raison}
                  </p>
                ))}
                {e.lienPaiement && (
                  <a href={e.lienPaiement} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground hover:underline">
                    Payer par carte sur le Guichet unique <ExternalLink className="size-3" aria-hidden />
                  </a>
                )}

                {ouvert === `${e.cle}:signature_client` && (
                  <FormSignataires
                    initiaux={e.signataires ?? []}
                    enCours={actionEnCours === 'signature_client'}
                    onAnnuler={() => setOuvert(null)}
                    onEnvoyer={(signataires) => void poster(e.cle, 'signature_client', 'signature-client', { signataires })}
                  />
                )}
                {ouvert === `${e.cle}:deleguer` && (
                  <FormDelegation
                    initial={e.emailClient ?? ''}
                    enCours={actionEnCours === 'deleguer'}
                    onAnnuler={() => setOuvert(null)}
                    onEnvoyer={(email) => void poster(e.cle, 'deleguer', 'deleguer', { email })}
                  />
                )}
                {actions
                  .filter((a) => a.confirmation && ouvert === `${e.cle}:${a.type}`)
                  .map((a) => (
                    <div key={a.type} className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-2.5" role="alertdialog" aria-label={a.label}>
                      <p className="text-xs leading-snug text-amber-900">{a.confirmation}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Button type="button" size="sm" className="h-7 px-2.5 text-xs" disabled={actionEnCours !== null} onClick={() => confirmer(e, a)} autoFocus>
                          {actionEnCours === a.type && <Loader2 className="size-3 animate-spin" aria-hidden />}
                          Confirmer
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="h-7 px-2.5 text-xs" onClick={() => setOuvert(null)}>
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ))}
                {erreurAction?.etape === e.cle && (
                  <p role="alert" className="mt-2 flex items-start gap-1.5 rounded-md bg-destructive/10 px-2 py-1.5 text-xs leading-snug text-destructive">
                    <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1">{erreurAction.message}</span>
                    <button type="button" aria-label="Fermer le message" onClick={() => setErreurAction(null)} className="shrink-0 rounded hover:bg-destructive/10">
                      <X className="size-3.5" />
                    </button>
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {etat.termine && (
        <p className="rounded-md bg-emerald-50 px-2.5 py-2 text-xs leading-snug text-emerald-800">
          Formalité signée et payée, transmise au greffe.{' '}
          {lienFormalite && (
            <Link href={lienFormalite} className="font-medium underline">
              Suivre son traitement
            </Link>
          )}
        </p>
      )}
    </div>
  );
}

export const ParcoursFormalite = memo(ParcoursFormaliteBase);

// Squelette de même hauteur que le contenu final : rien ne saute à l'affichage
function Squelette({ erreur, onRetry }: { erreur: string | null; onRetry: () => void }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Chargement des étapes de la formalité">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Étapes de la formalité</p>
        <span className="h-3 w-6 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-1 rounded-full bg-muted" />
      {erreur ? (
        <p className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {erreur}{' '}
            <button type="button" className="underline" onClick={onRetry}>
              Réessayer
            </button>
          </span>
        </p>
      ) : null}
      <ol>
        {[0, 1, 2, 3, 4].map((i) => (
          <li key={i} className="flex min-h-[72px] gap-3 pb-4">
            <span className="size-6 shrink-0 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-1.5 pt-1">
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-full animate-pulse rounded bg-muted/70" />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Pastille({ statut, numero }: { statut: Statut; numero: number }) {
  const base = 'relative z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold';
  const sr = <span className="sr-only">Étape {numero}, {LIBELLE_STATUT[statut]}</span>;
  if (statut === 'fait') return <span className={cn(base, 'bg-primary text-primary-foreground')}><Check className="size-3.5" aria-hidden />{sr}</span>;
  if (statut === 'sans_objet') return <span className={cn(base, 'border bg-card text-muted-foreground')}><Minus className="size-3" aria-hidden />{sr}</span>;
  if (statut === 'attente') return <span className={cn(base, 'border border-amber-300 bg-amber-50 text-amber-700')}><Clock className="size-3.5" aria-hidden />{sr}</span>;
  if (statut === 'en_cours') return <span className={cn(base, 'border border-amber-300 bg-amber-50 text-amber-700')}><Loader2 className="size-3.5 animate-spin" aria-hidden />{sr}</span>;
  if (statut === 'bloque') return <span className={cn(base, 'border border-destructive/40 bg-destructive/10 text-destructive')}><AlertCircle className="size-3.5" aria-hidden />{sr}</span>;
  if (statut === 'passee') return <span className={cn(base, 'border border-amber-400 bg-amber-50 text-amber-700')}><AlertTriangle className="size-3.5" aria-hidden />{sr}</span>;
  if (statut === 'inconnu') return <span className={cn(base, 'border bg-card text-muted-foreground')}><HelpCircle className="size-3.5" aria-hidden />{sr}</span>;
  if (statut === 'a_faire') return <span className={cn(base, 'border-2 border-primary bg-card text-primary')}><span aria-hidden>{numero}</span>{sr}</span>;
  return <span className={cn(base, 'border bg-card text-muted-foreground')}><span aria-hidden>{numero}</span>{sr}</span>;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEL = /^(\+\d{8,15}|00\d{8,15}|0[1-9]\d{8})$/;
const telValide = (t?: string) => !t || TEL.test(t.replace(/[\s.\-()]/g, ''));

function FormSignataires({
  initiaux,
  enCours,
  onEnvoyer,
  onAnnuler,
}: {
  initiaux: Signataire[];
  enCours: boolean;
  onEnvoyer: (s: Signataire[]) => void;
  onAnnuler: () => void;
}) {
  const [liste, setListe] = useState<Signataire[]>(initiaux.length ? initiaux : [{ prenom: '', nom: '', email: '', telephone: '' }]);
  const maj = (i: number, champ: keyof Signataire, v: string) => setListe((l) => l.map((s, j) => (j === i ? { ...s, [champ]: v } : s)));
  const emails = liste.map((s) => s.email.trim().toLowerCase());
  const doublon = emails.some((m, i) => m && emails.indexOf(m) !== i);
  const valide = liste.length > 0 && !doublon && liste.every((s) => s.prenom.trim() && s.nom.trim() && EMAIL.test(s.email.trim()) && telValide(s.telephone));
  const champ = 'h-8 w-full min-w-0 rounded-md border bg-card px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30';
  return (
    <form
      className="mt-2 space-y-2 rounded-md border bg-card p-2.5"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (valide && !enCours) onEnvoyer(liste.map((s) => ({ ...s, email: s.email.trim() })));
      }}
    >
      <p className="text-[11px] leading-snug text-muted-foreground">Chaque signataire reçoit un e-mail Yousign pour signer tous les actes.</p>
      {liste.map((s, i) => (
        <fieldset key={i} className="space-y-1.5 rounded border border-dashed p-2">
          <legend className="sr-only">Signataire {i + 1}</legend>
          <div className="flex gap-1.5">
            <input aria-label="Prénom" placeholder="Prénom" value={s.prenom} onChange={(e) => maj(i, 'prenom', e.target.value)} className={champ} autoFocus={i === 0} />
            <input aria-label="Nom" placeholder="Nom" value={s.nom} onChange={(e) => maj(i, 'nom', e.target.value)} className={champ} />
            {liste.length > 1 && (
              <button type="button" aria-label={`Retirer le signataire ${i + 1}`} onClick={() => setListe((l) => l.filter((_, j) => j !== i))} className="shrink-0 rounded px-1 text-muted-foreground hover:text-destructive">
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
          <input
            aria-label="E-mail"
            type="email"
            placeholder="E-mail"
            value={s.email}
            onChange={(e) => maj(i, 'email', e.target.value)}
            aria-invalid={Boolean(s.email && !EMAIL.test(s.email.trim()))}
            className={cn(champ, s.email && !EMAIL.test(s.email.trim()) && 'border-destructive')}
          />
          <input
            aria-label="Téléphone mobile, facultatif, pour le code SMS"
            type="tel"
            placeholder="Mobile pour le code SMS (facultatif)"
            value={s.telephone ?? ''}
            onChange={(e) => maj(i, 'telephone', e.target.value)}
            aria-invalid={!telValide(s.telephone)}
            className={cn(champ, !telValide(s.telephone) && 'border-destructive')}
          />
        </fieldset>
      ))}
      {doublon && <p className="text-[11px] text-destructive">Chaque signataire doit avoir son propre e-mail.</p>}
      <div className="flex flex-wrap items-center gap-1.5">
        <Button type="submit" size="sm" className="h-7 px-2.5 text-xs" disabled={!valide || enCours}>
          {enCours ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <Send className="size-3" aria-hidden />}
          {enCours ? 'Préparation des PDF…' : 'Envoyer'}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setListe((l) => [...l, { prenom: '', nom: '', email: '', telephone: '' }])}>
          <Plus className="size-3" aria-hidden /> Signataire
        </Button>
        <Button type="button" size="sm" variant="ghost" className="ml-auto h-7 px-2 text-xs" onClick={onAnnuler}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

function FormDelegation({ initial, enCours, onEnvoyer, onAnnuler }: { initial: string; enCours: boolean; onEnvoyer: (email: string) => void; onAnnuler: () => void }) {
  const [email, setEmail] = useState(initial);
  const valide = EMAIL.test(email.trim());
  return (
    <form
      className="mt-2 space-y-2 rounded-md border bg-card p-2.5"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (valide && !enCours) onEnvoyer(email.trim());
      }}
    >
      <p className="text-[11px] leading-snug text-muted-foreground">Le Guichet unique envoie au client un e-mail pour payer lui-même les frais.</p>
      <input
        aria-label="E-mail du client"
        type="email"
        placeholder="E-mail du client"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoFocus
        className="h-8 w-full rounded-md border bg-card px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
      />
      <div className="flex flex-wrap gap-1.5">
        <Button type="submit" size="sm" className="h-7 px-2.5 text-xs" disabled={!valide || enCours}>
          {enCours && <Loader2 className="size-3 animate-spin" aria-hidden />}
          Envoyer la délégation
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onAnnuler}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
