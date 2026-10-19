'use client';

// Détail d'une formalité du Guichet unique INPI : demandes de régularisation du
// greffe, ensemble des pièces déposées (aperçu / téléchargement), synthèse PDF
// et agent de régularisation.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, ArrowLeft, CalendarClock, ChevronDown, Download, Eye, FileText,
  Landmark, Loader2, RefreshCw,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/cabinet/StatusBadge';
import { FormalityAgent } from '@/components/cabinet/dashboard/FormalityAgent';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/cabinet/PageHeader';
import { EmptyState } from '@/components/cabinet/EmptyState';
import { PaiementCard, type Paiement } from '@/components/cabinet/Paiement';

const VPS = process.env.NEXT_PUBLIC_VPS_BACKEND_URL ?? 'https://0dao73k.cserverhost.cloud';

type Piece = {
  id: number;
  nom: string;
  type: string;
  sousType: string | null;
  taille: number;
  deposant: string;
  conformite: string | null;
  statut: string;
  extension: string;
  date: string;
};

type Objet = { type: string; libelle: string; observation: string; champ: string | null; pieceId: number | null };
type Demande = { id: number; statut: string; echeance: string | null; date: string; objets: Objet[]; partenaire?: string | null };
type Regularisation = { partenaire: string | null; statut: string; observation: string | null; motifsRejet: unknown; demandes: Demande[] };

type Summary = {
  id: number;
  liasse: string;
  societe: string | null;
  siren: string | null;
  formeJuridique: string | null;
  typeLabel: string;
  statut: string;
  dateStatut: string | null;
  dateSignature: string | null;
  lieuSignature: string | null;
  referenceMandataire: string | null;
  observationDeclarant: string | null;
  regularisations: Regularisation[];
  demandesEnCours: Demande[];
  pieces: Piece[];
  paiement?: Paiement | null;
};

const TO_HANDLE = ['AMENDMENT_PENDING', 'AMENDMENT_SIGNATURE_PENDING', 'AMENDMENT_PAYMENT_PENDING', 'SIGNATURE_PENDING', 'PAYMENT_PENDING'];

const DEPOSANT_LABELS: Record<string, string> = {
  DECLARANT: 'Déposée par le cabinet',
  GUICHET_UNIQUE: 'Générée par le Guichet unique',
  PARTENAIRE: 'Ajoutée par un partenaire',
};

function formatDate(iso: string | null, withTime = false) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} Ko` : `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

async function authToken() {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Session expirée, reconnectez-vous.');
  return token;
}

export function InpiFormalityDetail({ id }: { id: string }) {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyPiece, setBusyPiece] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const token = await authToken();
      const res = await fetch(`${VPS}/api/inpi/formalites/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { detail?: string }).detail || `Erreur ${res.status}`);
      setData(body as Summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function openFile(url: string, key: string, filename: string, download: boolean) {
    setBusyPiece(key);
    setError(null);
    try {
      const token = await authToken();
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error((b as { detail?: string }).detail || `Erreur ${res.status}`);
      }
      const blobUrl = URL.createObjectURL(await res.blob());
      if (download) {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        a.click();
      } else {
        window.open(blobUrl, '_blank', 'noopener');
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ouverture impossible.');
    } finally {
      setBusyPiece(null);
    }
  }

  const pieceUrl = (p: Piece) =>
    `${VPS}/api/inpi/formalites/${encodeURIComponent(id)}/pieces/${p.id}?name=${encodeURIComponent(p.nom)}`;

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="space-y-3" aria-busy="true" aria-label="Lecture de la formalité au Guichet unique">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-8 w-72 max-w-full" />
          <p className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <span className="live-dot size-1.5 text-success" />
            Lecture de la formalité au Guichet unique…
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow={<BackLink />} title="Formalité INPI" />
        <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {error ?? 'Formalité introuvable.'}
        </p>
      </div>
    );
  }

  const aTraiter = TO_HANDLE.includes(data.statut);
  const historique = data.regularisations.flatMap((r) =>
    r.demandes.filter((d) => d.statut === 'REGULARIZED').map((d) => ({ ...d, partenaire: r.partenaire })),
  );
  const rejets = data.regularisations.filter((r) => r.motifsRejet || r.observation);
  const label = `${data.societe ?? 'Sans nom'} (liasse ${data.liasse})`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<BackLink />}
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="min-w-0 break-words">{data.societe ?? '(sans nom)'}</span>
            <StatusBadge statut={data.statut} />
          </span>
        }
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
              Actualiser
            </Button>
            {data.siren && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/rne?siren=${data.siren}`}>
                  <FileText className="size-4" /> Documents RNE
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => openFile(`${VPS}/api/formalites/${encodeURIComponent(id)}/synthesis`, 'synthese', `synthese-${data.liasse}.pdf`, false)}
              disabled={busyPiece === 'synthese'}
            >
              {busyPiece === 'synthese' ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
              Synthèse INPI
            </Button>
          </>
        }
      >
        <dl className="flex flex-wrap gap-x-5 gap-y-1.5 pt-1 text-xs">
          <div className="flex items-center gap-1.5">
            <dt className="label-mono">Type</dt>
            <dd>{data.typeLabel}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="label-mono">Liasse</dt>
            <dd className="font-mono tabular-nums">{data.liasse}</dd>
          </div>
          {data.siren && (
            <div className="flex items-center gap-1.5">
              <dt className="label-mono">SIREN</dt>
              <dd className="font-mono tabular-nums">{data.siren}</dd>
            </div>
          )}
          {data.referenceMandataire && (
            <div className="flex items-center gap-1.5">
              <dt className="label-mono">Réf.</dt>
              <dd className="font-mono">{data.referenceMandataire}</dd>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <dt className="label-mono">Statut au</dt>
            <dd className="font-mono tabular-nums">{formatDate(data.dateStatut)}</dd>
          </div>
          {data.dateSignature && (
            <div className="flex items-center gap-1.5">
              <dt className="label-mono">Signée le</dt>
              <dd>
                <span className="font-mono tabular-nums">{formatDate(data.dateSignature)}</span>
                {data.lieuSignature ? ` à ${data.lieuSignature}` : ''}
              </dd>
            </div>
          )}
        </dl>
      </PageHeader>

      {error && (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      {/* Demandes du greffe en cours */}
      {data.demandesEnCours.length > 0 && (
        <Card className="gap-0 border-warning/40 bg-warning/10 py-0">
          <CardContent className="space-y-3 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="size-4 text-warning" />
              Régularisation demandée par le {data.demandesEnCours[0].partenaire?.toLowerCase() ?? 'greffe'}
            </p>
            {data.demandesEnCours.map((d) => (
              <div key={d.id} className="space-y-2">
                <p className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
                  <CalendarClock className="size-3.5" />
                  Demande du {formatDate(d.date, true)}
                  {d.echeance && <span className="font-medium text-foreground">· à traiter avant le {formatDate(d.echeance)}</span>}
                </p>
                <ul className="space-y-1.5">
                  {d.objets.map((o, i) => (
                    <li key={i} className="rounded-lg border bg-card px-3 py-2 text-sm">
                      <span className="label-mono mb-0.5 block">{o.libelle}</span>
                      {o.observation || '—'}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {rejets.length > 0 && data.statut === 'REJECTED' && (
        <Card className="gap-0 border-destructive/30 bg-destructive/10 py-0">
          <CardContent className="space-y-1 p-5 text-sm">
            <p className="font-semibold text-destructive">Motif du rejet</p>
            {rejets.map((r, i) => (
              <p key={i} className="whitespace-pre-wrap">
                {r.observation ?? ''} {r.motifsRejet ? JSON.stringify(r.motifsRejet) : ''}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {data.paiement && data.paiement.statut !== 'aucun' && (
        <PaiementCard p={data.paiement} liasse={data.liasse} formalityId={data.id} />
      )}

      {/* Agent de régularisation */}
      <FormalityAgent inpiFormality={{ id: String(data.id), label, aTraiter }} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pièces déposées */}
        <Card className="min-w-0 gap-0 py-0 lg:col-span-2">
          <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              Pièces de la formalité
              <span className="rounded-md border bg-muted px-1.5 py-px font-mono text-[11px] font-normal text-muted-foreground tabular-nums">{data.pieces.length}</span>
            </CardTitle>
            <CardDescription className="text-xs">Tous les documents déposés au Guichet unique pour cette formalité.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {data.pieces.length === 0 ? (
              <EmptyState icon={FileText} title="Aucune pièce." compact />
            ) : (
              <ul className="divide-y">
                {data.pieces.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50">
                    <span className="grid size-8 shrink-0 place-items-center rounded-md border bg-background font-mono text-[9px] font-semibold uppercase text-muted-foreground">
                      {p.extension ? p.extension.replace('.', '').slice(0, 4) : <FileText className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.nom}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {DEPOSANT_LABELS[p.deposant] ?? p.deposant} · <span className="font-mono tabular-nums">{formatDate(p.date)} · {formatSize(p.taille)}</span> · {p.type}
                        {p.conformite && p.conformite !== 'VALID' && <span className="font-medium text-warning"> · {p.conformite}</span>}
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Aperçu"
                      aria-label={`Aperçu de ${p.nom}`}
                      onClick={() => openFile(pieceUrl(p), `v${p.id}`, p.nom, false)}
                      disabled={busyPiece === `v${p.id}`}
                    >
                      {busyPiece === `v${p.id}` ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Télécharger"
                      aria-label={`Télécharger ${p.nom}`}
                      onClick={() => openFile(`${pieceUrl(p)}&download=1`, `d${p.id}`, p.nom, true)}
                      disabled={busyPiece === `d${p.id}`}
                    >
                      {busyPiece === `d${p.id}` ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Informations et historique */}
        <div className="min-w-0 space-y-6">
          {data.observationDeclarant && (
            <Card className="gap-0 py-0">
              <CardContent className="space-y-1.5 p-5">
                <p className="label-mono">Observation du déclarant</p>
                <p className="whitespace-pre-wrap text-sm">{data.observationDeclarant}</p>
              </CardContent>
            </Card>
          )}
          <Card className="gap-0 py-0">
            <CardContent className="p-0">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                aria-expanded={showHistory}
                className="flex w-full items-center justify-between rounded-xl px-5 py-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  Régularisations traitées
                  <span className="rounded-md border bg-muted px-1.5 py-px font-mono text-[11px] font-normal text-muted-foreground tabular-nums">{historique.length}</span>
                </span>
                <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', showHistory && 'rotate-180')} />
              </button>
              {showHistory && (
                historique.length === 0 ? (
                  <p className="border-t px-5 py-4 text-sm text-muted-foreground">Aucune.</p>
                ) : (
                  <ol className="space-y-4 border-t px-5 py-4">
                    {historique.map((d) => (
                      <li key={d.id} className="relative border-l pl-4 text-sm">
                        <span className="absolute -left-[3.5px] top-1.5 size-1.5 rounded-full bg-success" aria-hidden="true" />
                        <span className="block font-mono text-[11px] text-muted-foreground">{formatDate(d.date, true)} · {d.partenaire}</span>
                        {d.objets.map((o, i) => (
                          <span key={i} className="block">{o.observation || o.libelle}</span>
                        ))}
                      </li>
                    ))}
                  </ol>
                )
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/inpi" className="inline-flex items-center gap-1.5 text-inherit no-underline hover:text-foreground">
      <ArrowLeft className="size-3" />
      <Landmark className="size-3" />
      Déposées à l&apos;INPI
    </Link>
  );
}
