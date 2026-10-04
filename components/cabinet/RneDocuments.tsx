'use client';

// Documents publics du RNE pour une entreprise (SIREN) : actes déposés (statuts,
// PV, décisions…), comptes annuels non confidentiels et avis de situation INSEE.
// Aperçu, téléchargement et ajout aux pièces d'un dossier du cabinet.

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle, BookOpen, Check, Download, Eye, FileText, FolderPlus, Loader2, Lock, Search,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
      <li key={k} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{d.libelle}</span>
            {d.confidentiel && <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-label="Confidentiel" />}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Déposé le {formatDate(d.dateDepot)}
            {d.decisions && d.decisions.length > 0 && <> · {d.decisions.join(' ; ')}</>}
          </p>
        </div>
        {d.confidentiel ? (
          <span className="text-xs text-muted-foreground">Confidentiel — non communicable</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => openDoc(d, false)} disabled={busy !== null}>
              {busy === `${k}-view` ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
              <span className="sr-only sm:not-sr-only">Voir</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => openDoc(d, true)} disabled={busy !== null}>
              {busy === `${k}-dl` ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              <span className="sr-only sm:not-sr-only">Télécharger</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addToDossier(d)}
              disabled={busy !== null || !dossierId || added[k]}
              title={dossierId ? 'Ajouter aux pièces du dossier choisi' : 'Choisissez d’abord un dossier'}
            >
              {busy === `${k}-add` ? <Loader2 className="size-4 animate-spin" /> : added[k] ? <Check className="size-4" /> : <FolderPlus className="size-4" />}
              <span className="sr-only sm:not-sr-only">{added[k] ? 'Ajouté' : 'Au dossier'}</span>
            </Button>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2">
          <BookOpen className="size-6" /> Documents RNE
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Statuts, procès-verbaux, décisions et comptes annuels déposés au Registre national des entreprises, et avis de situation INSEE.
        </p>
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load(siren);
        }}
      >
        <input
          value={siren}
          onChange={(e) => setSiren(e.target.value)}
          inputMode="numeric"
          placeholder="SIREN (9 chiffres)"
          className="h-9 w-full max-w-xs rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="SIREN"
        />
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          Rechercher
        </Button>
      </form>

      {error && (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
      {notice && (
        <p className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          <Check className="mt-0.5 size-4 shrink-0" />
          {notice}
        </p>
      )}

      {data && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{data.denomination ?? 'Entreprise'}</h2>
              <p className="text-sm text-muted-foreground">
                SIREN <span className="font-mono">{data.siren}</span> · {data.actes.length} acte(s) · {data.bilans.length} compte(s) annuel(s)
              </p>
            </div>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Ajouter les documents au dossier
              <select
                value={dossierId}
                onChange={(e) => setDossierId(e.target.value)}
                className="h-9 w-72 max-w-full rounded-md border bg-background px-2 text-sm text-foreground"
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

          <Card>
            <CardHeader>
              <CardTitle>Avis de situation INSEE</CardTitle>
              <CardDescription>Fiche SIRENE de l’établissement siège, délivrée par l’INSEE.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.siretSiege ? (
                <Button asChild variant="outline" size="sm">
                  <a href={`${INSEE_AVIS}/${data.siretSiege}`} target="_blank" rel="noopener noreferrer">
                    <Download className="size-4" /> Avis de situation (SIRET {data.siretSiege})
                  </a>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">SIRET du siège absent de la fiche RNE.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actes déposés</CardTitle>
              <CardDescription>Statuts, procès-verbaux, décisions, certificats — du plus récent au plus ancien.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.actes.length ? <ul className="divide-y">{data.actes.map(row)}</ul> : <p className="text-sm text-muted-foreground">Aucun acte déposé.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comptes annuels</CardTitle>
              <CardDescription>Les comptes déclarés confidentiels ne sont pas communicables.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.bilans.length ? <ul className="divide-y">{data.bilans.map(row)}</ul> : <p className="text-sm text-muted-foreground">Aucun compte annuel déposé.</p>}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
