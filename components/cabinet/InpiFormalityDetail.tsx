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
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Lecture de la formalité au Guichet unique…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
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
    <div className="space-y-5">
      <BackLink />

      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate">{data.societe ?? '(sans nom)'}</h1>
            <StatusBadge statut={data.statut} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.typeLabel} · liasse <span className="font-mono">{data.liasse}</span>
            {data.siren && <> · SIREN <span className="font-mono">{data.siren}</span></>}
            {data.referenceMandataire && <> · réf. {data.referenceMandataire}</>}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Statut au {formatDate(data.dateStatut)}
            {data.dateSignature && <> · signée le {formatDate(data.dateSignature)}{data.lieuSignature ? ` à ${data.lieuSignature}` : ''}</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openFile(`${VPS}/api/formalites/${encodeURIComponent(id)}/synthesis`, 'synthese', `synthese-${data.liasse}.pdf`, false)}
            disabled={busyPiece === 'synthese'}
          >
            {busyPiece === 'synthese' ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
            Synthèse INPI
          </Button>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
            Actualiser
          </Button>
        </div>
      </div>

      {error && (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      {/* Demandes du greffe en cours */}
      {data.demandesEnCours.length > 0 && (
        <Card className="gap-0 border-[#ffd2cb] bg-[#fff8f6] py-0">
          <CardContent className="space-y-3 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-[#c2410c]">
              <AlertTriangle className="size-4" />
              Régularisation demandée par le {data.demandesEnCours[0].partenaire?.toLowerCase() ?? 'greffe'}
            </p>
            {data.demandesEnCours.map((d) => (
              <div key={d.id} className="space-y-2">
                <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <CalendarClock className="size-3.5" />
                  Demande du {formatDate(d.date, true)}
                  {d.echeance && <span className="font-medium text-[#c2410c]">· à traiter avant le {formatDate(d.echeance)}</span>}
                </p>
                <ul className="space-y-1.5">
                  {d.objets.map((o, i) => (
                    <li key={i} className="rounded-lg border bg-card px-3 py-2 text-sm">
                      <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{o.libelle}</span>
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
        <Card className="gap-0 border-red-200 bg-red-50/60 py-0">
          <CardContent className="space-y-1 p-5 text-sm">
            <p className="font-semibold text-red-700">Motif du rejet</p>
            {rejets.map((r, i) => (
              <p key={i} className="whitespace-pre-wrap">
                {r.observation ?? ''} {r.motifsRejet ? JSON.stringify(r.motifsRejet) : ''}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Agent de régularisation */}
      <FormalityAgent inpiFormality={{ id: String(data.id), label, aTraiter }} />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Pièces déposées */}
        <Card className="min-w-0 gap-0 py-0 lg:col-span-2">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-base">Pièces de la formalité ({data.pieces.length})</CardTitle>
            <CardDescription>Tous les documents déposés au Guichet unique pour cette formalité.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {data.pieces.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Aucune pièce.</p>
            ) : (
              <ul className="divide-y">
                {data.pieces.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#f3efff] text-primary">
                      <FileText className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.nom}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {DEPOSANT_LABELS[p.deposant] ?? p.deposant} · {formatDate(p.date)} · {formatSize(p.taille)} · {p.type}
                        {p.conformite && p.conformite !== 'VALID' && <span className="font-medium text-[#c2410c]"> · {p.conformite}</span>}
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
        <div className="min-w-0 space-y-5">
          {data.observationDeclarant && (
            <Card className="gap-0 py-0">
              <CardContent className="space-y-1 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Observation du déclarant</p>
                <p className="whitespace-pre-wrap text-sm">{data.observationDeclarant}</p>
              </CardContent>
            </Card>
          )}
          <Card className="gap-0 py-0">
            <CardContent className="p-5">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Régularisations traitées ({historique.length})
                </span>
                <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', showHistory && 'rotate-180')} />
              </button>
              {showHistory && (
                historique.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">Aucune.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {historique.map((d) => (
                      <li key={d.id} className="text-sm">
                        <span className="block text-[11px] text-muted-foreground">{formatDate(d.date, true)} · {d.partenaire}</span>
                        {d.objets.map((o, i) => (
                          <span key={i} className="block">{o.observation || o.libelle}</span>
                        ))}
                      </li>
                    ))}
                  </ul>
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
    <Link href="/inpi" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" />
      <Landmark className="size-4" />
      Déposées à l&apos;INPI
    </Link>
  );
}
