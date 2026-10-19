'use client';

// Documents publics du RNE pour une entreprise (SIREN) : actes déposés (statuts,
// PV, décisions…), comptes annuels non confidentiels et avis de situation INSEE.
// Aperçu, téléchargement et ajout aux pièces d'un dossier du cabinet.

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle, BookOpen, Check, Download, Eye, FileText, FolderPlus, Landmark, Loader2, Lock, Search,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/cabinet/PageHeader';
import { EmptyState } from '@/components/cabinet/EmptyState';

const VPS = process.env.NEXT_PUBLIC_VPS_BACKEND_URL ?? 'https://0dao73k.cserverhost.cloud';
const INSEE_AVIS = 'https://api-avis-situation-sirene.insee.fr/identification/pdf';

type Doc = {
  id: string;
  kind: 'acte' | 'bilan';
  libelle: string;
  decisions?: string[];
  dateDepot: string | null;
  dateCloture?: string | null;
  confidentiel: boolean;
};
type Result = { siren: string; denomination: string | null; siretSiege: string | null; actes: Doc[]; bilans: Doc[] };
type DossierOption = { id: string; reference: string | null; client_name: string | null };

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function authToken() {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Session expirée, reconnectez-vous.');
  return token;
}

const fileName = (r: Result, d: Doc) =>
  `${d.libelle} - ${r.denomination ?? r.siren}${d.dateDepot ? ` - ${d.dateDepot}` : ''}`.replace(/[\\/:*?"<>|]+/g, ' ');

export function RneDocuments() {
  const router = useRouter();
  const params = useSearchParams();
  const [siren, setSiren] = useState(params.get('siren') ?? '');
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dossiers, setDossiers] = useState<DossierOption[]>([]);
  const [dossierId, setDossierId] = useState('');
  const [added, setAdded] = useState<Record<string, boolean>>({});

  async function load(value: string) {
    const s = value.replace(/\D/g, '');
    if (s.length !== 9) {
      setError('Saisissez un SIREN à 9 chiffres.');
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    setAdded({});
    try {
      const token = await authToken();
      const res = await fetch(`${VPS}/api/rne/${s}/documents`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { detail?: string }).detail || `Erreur ${res.status}`);
      setData(body as Result);
      router.replace(`/rne?siren=${s}`);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'Lecture impossible.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initial = params.get('siren');
    if (initial) load(initial);
    createClient()
      .from('dossiers')
      .select('id, reference, client_name')
      .order('updated_at', { ascending: false })
      .limit(100)
      .then(({ data: rows }) => setDossiers((rows as DossierOption[]) ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openDoc(d: Doc, download: boolean) {
    if (!data) return;
    const key = `${d.kind}-${d.id}-${download ? 'dl' : 'view'}`;
    setBusy(key);
    setError(null);
    try {
      const token = await authToken();
      const name = `${fileName(data, d)}.pdf`;
      const res = await fetch(`${VPS}/api/rne/documents/${d.kind}/${d.id}?name=${encodeURIComponent(name)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error((b as { detail?: string }).detail || `Erreur ${res.status}`);
      }
      const url = URL.createObjectURL(await res.blob());
      if (download) {
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
      } else {
        window.open(url, '_blank', 'noopener');
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ouverture impossible.');
    } finally {
      setBusy(null);
    }
  }

  async function addToDossier(d: Doc) {
    if (!data || !dossierId) return;
    const key = `${d.kind}-${d.id}-add`;
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      const token = await authToken();
      const res = await fetch(`${VPS}/api/rne/documents/${d.kind}/${d.id}/dossier`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dossierId, name: fileName(data, d) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { detail?: string }).detail || `Erreur ${res.status}`);
      const ref = (body as { dossier?: { reference?: string } }).dossier?.reference;
      setAdded((m) => ({ ...m, [`${d.kind}-${d.id}`]: true }));
      setNotice(`« ${d.libelle} » ajouté aux pièces du dossier${ref ? ` ${ref}` : ''}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ajout impossible.');
    } finally {
      setBusy(null);
    }
  }

  const row = (d: Doc) => {
    const k = `${d.kind}-${d.id}`;
    return (
      <li key={k} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-5 py-3 transition-colors hover:bg-muted/50">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md border bg-background text-muted-foreground">
            {d.confidentiel ? <Lock className="size-4" aria-label="Confidentiel" /> : <FileText className="size-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{d.libelle}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <span className="font-mono tabular-nums">Déposé le {formatDate(d.dateDepot)}</span>
              {d.decisions && d.decisions.length > 0 && <> · {d.decisions.join(' ; ')}</>}
            </p>
          </div>
        </div>
        {d.confidentiel ? (
          <Badge variant="outline" className="font-normal text-muted-foreground">
            <Lock className="size-3" /> Confidentiel — non communicable
          </Badge>
        ) : (
          <div className="flex flex-wrap items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => openDoc(d, false)} disabled={busy !== null} aria-label={`Voir ${d.libelle}`}>
              {busy === `${k}-view` ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
              <span className="sr-only sm:not-sr-only">Voir</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => openDoc(d, true)} disabled={busy !== null} aria-label={`Télécharger ${d.libelle}`}>
              {busy === `${k}-dl` ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              <span className="sr-only sm:not-sr-only">Télécharger</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addToDossier(d)}
              disabled={busy !== null || !dossierId || added[k]}
              title={dossierId ? 'Ajouter aux pièces du dossier choisi' : 'Choisissez d’abord un dossier'}
              className={added[k] ? 'border-success/30 text-success' : undefined}
            >
              {busy === `${k}-add` ? <Loader2 className="size-4 animate-spin" /> : added[k] ? <Check className="size-4" /> : <FolderPlus className="size-4" />}
              <span className="sr-only sm:not-sr-only">{added[k] ? 'Ajouté' : 'Au dossier'}</span>
            </Button>
          </div>
        )}
      </li>
    );
  };

  const section = (title: string, description: string, count: number, body: React.ReactNode) => (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-row items-start justify-between gap-3 border-b px-5 py-4 [.border-b]:pb-4">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-sm">{title}</CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
        <span className="shrink-0 rounded-md border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">{count}</span>
      </CardHeader>
      <CardContent className="p-0">{body}</CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Registre national des entreprises"
        title="Documents RNE"
        description="Statuts, procès-verbaux, décisions et comptes annuels déposés au Registre national des entreprises, et avis de situation INSEE."
      />

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load(siren);
        }}
      >
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            value={siren}
            onChange={(e) => setSiren(e.target.value)}
            inputMode="numeric"
            placeholder="SIREN (9 chiffres)"
            className="h-9 w-full rounded-md border bg-background pl-8 pr-3 font-mono text-sm tabular-nums shadow-xs outline-none transition-[color,box-shadow] placeholder:font-sans placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            aria-label="SIREN"
          />
        </div>
        <Button type="submit" size="sm" disabled={loading} className="h-9">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          Rechercher
        </Button>
      </form>

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          <Check className="mt-0.5 size-4 shrink-0" />
          {notice}
        </p>
      )}

      {loading && !data && (
        <div className="space-y-3" aria-busy="true" aria-label="Chargement des documents">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      )}

      {!data && !loading && (
        <Card className="py-0">
          <EmptyState
            icon={BookOpen}
            title="Recherchez une entreprise"
            description="Saisissez un SIREN pour lister ses actes déposés, ses comptes annuels et son avis de situation INSEE."
          />
        </Card>
      )}

      {data && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border bg-card px-5 py-4 shadow-xs">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg border bg-background text-sm font-semibold text-muted-foreground">
                {(data.denomination ?? 'EN').slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-base">{data.denomination ?? 'Entreprise'}</h2>
                <p className="flex flex-wrap items-center gap-x-2 font-mono text-[11px] tabular-nums text-muted-foreground">
                  <span>SIREN {data.siren}</span>
                  <span aria-hidden>·</span>
                  <span>{data.actes.length} acte(s)</span>
                  <span aria-hidden>·</span>
                  <span>{data.bilans.length} compte(s) annuel(s)</span>
                </p>
              </div>
            </div>
            <label className="flex w-full flex-col gap-1.5 sm:w-auto">
              <span className="label-mono">Ajouter les documents au dossier</span>
              <select
                value={dossierId}
                onChange={(e) => setDossierId(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-2 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:w-72"
              >
                <option value="">— Choisir un dossier —</option>
                {dossiers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {[d.reference, d.client_name].filter(Boolean).join(' · ') || d.id}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <Card className="gap-0 py-0">
            <CardContent className="flex flex-wrap items-center gap-3 px-5 py-4">
              <span className="grid size-8 shrink-0 place-items-center rounded-md border bg-background text-muted-foreground">
                <Landmark className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Avis de situation INSEE</p>
                <p className="text-xs text-muted-foreground">Fiche SIRENE de l’établissement siège, délivrée par l’INSEE.</p>
              </div>
              {data.siretSiege ? (
                <Button asChild variant="outline" size="sm">
                  <a href={`${INSEE_AVIS}/${data.siretSiege}`} target="_blank" rel="noopener noreferrer">
                    <Download className="size-4" /> Avis de situation
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">SIRET {data.siretSiege}</span>
                  </a>
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">SIRET du siège absent de la fiche RNE.</p>
              )}
            </CardContent>
          </Card>

          {section(
            'Actes déposés',
            'Statuts, procès-verbaux, décisions, certificats — du plus récent au plus ancien.',
            data.actes.length,
            data.actes.length ? (
              <ul className="divide-y">{data.actes.map(row)}</ul>
            ) : (
              <EmptyState icon={FileText} title="Aucun acte déposé" compact />
            ),
          )}

          {section(
            'Comptes annuels',
            'Les comptes déclarés confidentiels ne sont pas communicables.',
            data.bilans.length,
            data.bilans.length ? (
              <ul className="divide-y">{data.bilans.map(row)}</ul>
            ) : (
              <EmptyState icon={FileText} title="Aucun compte annuel déposé" compact />
            ),
          )}
        </>
      )}
    </div>
  );
}
