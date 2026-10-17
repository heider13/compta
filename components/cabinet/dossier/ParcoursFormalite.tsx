'use client';

// Parcours d'une formalité, de la préparation par l'agent jusqu'au paiement :
//   1. réalisation de la formalité (brouillon au Guichet unique)
//   2. annonce légale
//   3. signature des documents par le client (Yousign)
//   4. signature électronique de la formalité (Yousign = signature au Guichet unique)
//   5. paiement (compte client INPI du cabinet ou délégation au client)
// Affiché à droite du chat du tableau de bord et sur la page du dossier. L'état vient du
// serveur (GET /api/dossiers/:id/parcours) ; rafraîchi tout seul quand on attend un tiers.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle, Check, CircleDashed, ExternalLink, FileText, Loader2, Minus, Plus, Send, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { vpsApi } from '@/components/cabinet/dashboard/BatchProgress';

type Statut = 'fait' | 'a_faire' | 'attente' | 'bloque' | 'en_cours' | 'a_venir' | 'sans_objet';
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

const ROUTES: Record<string, string> = {
  signature_inpi: 'signature-inpi',
  signature_simple: 'signature-simple',
  payer: 'payer',
};

export function ParcoursFormalite({
  dossierId,
  onAsk,
  version = 0,
  compact = false,
}: {
  dossierId: string;
  /** Envoie une demande à l'agent (chat) ; sans chat, le bouton est masqué. */
  onAsk?: (message: string) => void;
  /** Change à chaque étape terminée par l'agent : relance la lecture du parcours. */
  version?: number;
  compact?: boolean;
}) {
  const [etat, setEtat] = useState<Etat | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [actionEnCours, setActionEnCours] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null); // formulaire déplié : `${etape}:${type}`
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vivant = useRef(true);

  const charger = useCallback(async () => {
    try {
      const e = await vpsApi<Etat>(`/api/dossiers/${dossierId}/parcours`);
      if (!vivant.current) return;
      setEtat(e);
      setErreur(null);
    } catch (e) {
      if (vivant.current) setErreur(e instanceof Error ? e.message : 'Lecture du parcours impossible.');
    }
  }, [dossierId]);

  // Lecture initiale, à chaque étape de l'agent, puis rafraîchissement automatique
  useEffect(() => {
    vivant.current = true;
    void charger();
    return () => {
      vivant.current = false;
    };
  }, [charger, version]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!etat || etat.termine) return;
    timer.current = setTimeout(() => {
      if (document.visibilityState === 'visible') void charger();
      else setEtat((e) => (e ? { ...e } : e)); // relance le minuteur sans appel réseau
    }, etat.rafraichir_ms);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [etat, charger]);

  // Retour sur l'onglet (après une signature Yousign) : lecture immédiate
  useEffect(() => {
    const onFocus = () => void charger();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [charger]);

  async function poster(chemin: string, corps: object = {}, cle = chemin) {
    setActionEnCours(cle);
    setErreur(null);
    try {
      const e = await vpsApi<Etat & { lien?: string | null }>(`/api/dossiers/${dossierId}/parcours/${chemin}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corps),
      });
      setEtat(e);
      setOuvert(null);
      return e;
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Action impossible.');
      return null;
    } finally {
      setActionEnCours(null);
    }
  }

  async function lancer(etape: Etape, a: Action) {
    if (a.type === 'demander' && a.message) return onAsk?.(a.message);
    if (a.type === 'signature_client' || a.type === 'deleguer') return setOuvert(`${etape.cle}:${a.type}`);
    if (a.type === 'relancer_signature_client') return poster('annuler', { etape: 'signature_client' }, a.type);
    if (a.type === 'relancer_signature_inpi') return poster('annuler', { etape: 'signature_inpi' }, a.type);
    if (a.confirmation) return setOuvert(`${etape.cle}:${a.type}`);
    if (a.type === 'signature_inpi') {
      // Fenêtre ouverte pendant le clic (sinon bloquée par le navigateur), remplie au retour du serveur
      const fenetre = window.open('about:blank', '_blank');
      const r = await poster(ROUTES[a.type], {}, a.type);
      if (r?.lien && fenetre) fenetre.location.href = r.lien;
      else fenetre?.close();
      return;
    }
    if (ROUTES[a.type]) return poster(ROUTES[a.type], {}, a.type);
  }

  if (!etat) {
    return (
      <div className="space-y-3" aria-busy="true">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Étapes de la formalité</p>
        {erreur ? (
          <p className="flex items-start gap-1.5 text-xs text-destructive">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            {erreur}
            <button type="button" className="ml-1 underline" onClick={() => void charger()}>
              Réessayer
            </button>
          </p>
        ) : (
          [0, 1, 2, 3, 4].map((i) => <div key={i} className="h-10 animate-pulse rounded-md bg-muted/70" />)
        )}
      </div>
    );
  }

  const faites = etat.etapes.filter((e) => e.statut === 'fait' || e.statut === 'sans_objet').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Étapes de la formalité</p>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {faites}/{etat.etapes.length}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(faites / etat.etapes.length) * 100}%` }} />
      </div>

      <ol className="relative space-y-0">
        {etat.etapes.map((e, i) => {
          const courante = etat.courante === e.cle;
          const derniere = i === etat.etapes.length - 1;
          return (
            <li key={e.cle} className="relative flex gap-3 pb-4">
              {!derniere && (
                <span className={cn('absolute left-[11px] top-6 h-[calc(100%-1.25rem)] w-px', e.statut === 'fait' || e.statut === 'sans_objet' ? 'bg-primary/40' : 'bg-border')} />
              )}
              <Pastille statut={e.statut} numero={i + 1} />
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm leading-6', courante ? 'font-semibold' : 'font-medium', (e.statut === 'a_venir' || e.statut === 'sans_objet') && 'text-muted-foreground')}>
                  {e.titre}
                </p>
                <p className={cn('text-xs leading-snug', e.statut === 'bloque' ? 'text-destructive' : 'text-muted-foreground')}>{e.detail}</p>
                {e.erreur && <p className="mt-1 text-xs text-destructive">{e.erreur}</p>}
                {e.alertes?.map((a) => (
                  <p key={a} className="mt-1 flex items-start gap-1 text-xs text-amber-700">
                    <AlertCircle className="mt-0.5 size-3 shrink-0" />
                    {a}
                  </p>
                ))}
                {!compact && e.documents && e.documents.length > 0 && e.statut !== 'a_venir' && (
                  <ul className="mt-1.5 space-y-0.5">
                    {e.documents.slice(0, 6).map((d) => (
                      <li key={d.id} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        {d.signe ? <Check className="size-3 shrink-0 text-emerald-600" /> : <FileText className="size-3 shrink-0" />}
                        <span className="truncate">{d.nom}</span>
                      </li>
                    ))}
                    {e.documents.length > 6 && <li className="text-[11px] text-muted-foreground">+ {e.documents.length - 6} autre(s)</li>}
                  </ul>
                )}
                {e.lienSignature && (
                  <a href={e.lienSignature} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    Ouvrir la signature Yousign <ExternalLink className="size-3" />
                  </a>
                )}

                {e.actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {e.actions
                      .filter((a) => a.type !== 'demander' || onAsk)
                      .map((a) => (
                        <Button
                          key={a.type}
                          type="button"
                          size="sm"
                          variant={a.secondaire ? 'ghost' : courante ? 'default' : 'outline'}
                          className="h-7 px-2.5 text-xs"
                          disabled={Boolean(a.desactive) || actionEnCours !== null}
                          title={a.raison ?? undefined}
                          onClick={() => void lancer(e, a)}
                        >
                          {actionEnCours === a.type && <Loader2 className="size-3 animate-spin" />}
                          {a.label}
                        </Button>
                      ))}
                  </div>
                )}
                {e.actions.some((a) => a.desactive && a.raison) && (
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{e.actions.find((a) => a.desactive && a.raison)?.raison}</p>
                )}
                {e.lienPaiement && e.statut !== 'a_venir' && (
                  <a href={e.lienPaiement} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground hover:underline">
                    Payer par carte sur le Guichet unique <ExternalLink className="size-3" />
                  </a>
                )}

                {ouvert === `${e.cle}:signature_client` && (
                  <FormSignataires
                    initiaux={e.signataires ?? []}
                    enCours={actionEnCours === 'signature-client'}
                    onAnnuler={() => setOuvert(null)}
                    onEnvoyer={(signataires) => void poster('signature-client', { signataires }, 'signature-client')}
                  />
                )}
                {ouvert === `${e.cle}:deleguer` && (
                  <FormDelegation
                    initial={e.emailClient ?? ''}
                    enCours={actionEnCours === 'deleguer'}
                    onAnnuler={() => setOuvert(null)}
                    onEnvoyer={(email) => void poster('deleguer', { email }, 'deleguer')}
                  />
                )}
                {e.actions
                  .filter((a) => a.confirmation && ouvert === `${e.cle}:${a.type}`)
                  .map((a) => (
                    <div key={a.type} className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-2.5">
                      <p className="text-xs text-amber-900">{a.confirmation}</p>
                      <div className="mt-2 flex gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 px-2.5 text-xs"
                          disabled={actionEnCours !== null}
                          onClick={() => void poster(ROUTES[a.type], { confirme: true, montant_cents: e.montant_cents }, a.type)}
                        >
                          {actionEnCours === a.type && <Loader2 className="size-3 animate-spin" />}
                          Confirmer
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="h-7 px-2.5 text-xs" onClick={() => setOuvert(null)}>
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </li>
          );
        })}
      </ol>

      {erreur && (
        <p role="alert" className="flex items-start gap-1.5 rounded-md bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          {erreur}
        </p>
      )}
      {etat.termine && (
        <p className="rounded-md bg-emerald-50 px-2.5 py-2 text-xs text-emerald-800">
          Formalité signée et payée : elle est transmise au greffe. Suivez son traitement dans Formalités INPI.
        </p>
      )}
    </div>
  );
}

function Pastille({ statut, numero }: { statut: Statut; numero: number }) {
  const base = 'relative z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold';
  if (statut === 'fait') return <span className={cn(base, 'bg-primary text-primary-foreground')}><Check className="size-3.5" /></span>;
  if (statut === 'sans_objet') return <span className={cn(base, 'border bg-card text-muted-foreground')}><Minus className="size-3" /></span>;
  if (statut === 'attente' || statut === 'en_cours') return <span className={cn(base, 'border border-amber-300 bg-amber-50 text-amber-700')}><Loader2 className="size-3.5 animate-spin" /></span>;
  if (statut === 'bloque') return <span className={cn(base, 'border border-destructive/40 bg-destructive/10 text-destructive')}><AlertCircle className="size-3.5" /></span>;
  if (statut === 'a_faire') return <span className={cn(base, 'border-2 border-primary bg-card text-primary')}>{numero}</span>;
  return <span className={cn(base, 'border bg-card text-muted-foreground')}>{statut === 'a_venir' ? numero : <CircleDashed className="size-3" />}</span>;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const valide = liste.length > 0 && liste.every((s) => s.prenom.trim() && s.nom.trim() && EMAIL.test(s.email.trim()));
  const champ = 'h-8 w-full min-w-0 rounded-md border bg-card px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30';
  return (
    <form
      className="mt-2 space-y-2 rounded-md border bg-card p-2.5"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (valide && !enCours) onEnvoyer(liste.map((s) => ({ ...s, email: s.email.trim() })));
      }}
    >
      <p className="text-[11px] text-muted-foreground">Chaque signataire reçoit un e-mail Yousign pour signer tous les actes.</p>
      {liste.map((s, i) => (
        <div key={i} className="space-y-1.5 rounded border border-dashed p-2">
          <div className="flex gap-1.5">
            <input aria-label="Prénom" placeholder="Prénom" value={s.prenom} onChange={(e) => maj(i, 'prenom', e.target.value)} className={champ} />
            <input aria-label="Nom" placeholder="Nom" value={s.nom} onChange={(e) => maj(i, 'nom', e.target.value)} className={champ} />
            {liste.length > 1 && (
              <button type="button" aria-label="Retirer ce signataire" onClick={() => setListe((l) => l.filter((_, j) => j !== i))} className="shrink-0 rounded px-1 text-muted-foreground hover:text-destructive">
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
            className={cn(champ, s.email && !EMAIL.test(s.email.trim()) && 'border-destructive')}
          />
          <input aria-label="Téléphone (code SMS, facultatif)" type="tel" placeholder="Téléphone mobile (facultatif)" value={s.telephone ?? ''} onChange={(e) => maj(i, 'telephone', e.target.value)} className={champ} />
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-1.5">
        <Button type="submit" size="sm" className="h-7 px-2.5 text-xs" disabled={!valide || enCours}>
          {enCours ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
          {enCours ? 'Préparation des PDF…' : 'Envoyer'}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setListe((l) => [...l, { prenom: '', nom: '', email: '', telephone: '' }])}>
          <Plus className="size-3" /> Signataire
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
      <p className="text-[11px] text-muted-foreground">Le Guichet unique envoie au client un e-mail pour payer lui-même les frais.</p>
      <input
        aria-label="E-mail du client"
        type="email"
        placeholder="E-mail du client"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-8 w-full rounded-md border bg-card px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
      />
      <div className="flex gap-1.5">
        <Button type="submit" size="sm" className="h-7 px-2.5 text-xs" disabled={!valide || enCours}>
          {enCours && <Loader2 className="size-3 animate-spin" />}
          Envoyer la délégation
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onAnnuler}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
