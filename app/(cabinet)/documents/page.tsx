'use client';

// Générateur de documents légaux & contractuels par l'IA.
// Brief en langage naturel → Claude rédige (avec RAG juridique) → aperçu + export .docx.

import { useEffect, useState } from 'react';
import { Download, FileText, Loader2, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Markdown } from '@/components/ui/markdown';
import { PageHeader, PageShell } from '@/components/cabinet/PageHeader';
import { EmptyState } from '@/components/cabinet/EmptyState';

const VPS = process.env.NEXT_PUBLIC_VPS_BACKEND_URL ?? 'https://0dao73k.cserverhost.cloud';

type DocType = { id: string; label: string };

export default function DocumentsPage() {
  const [types, setTypes] = useState<DocType[]>([]);
  const [docType, setDocType] = useState('contrat_prestation');
  const [brief, setBrief] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ title: string; markdown: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        const res = await fetch(`${VPS}/api/ai/doc-types`, {
          headers: { Authorization: `Bearer ${data.session?.access_token}` },
        });
        if (res.ok) setTypes((await res.json()).types);
      } catch { /* défaut ci-dessous */ }
    })();
  }, []);

  async function token() {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function generate() {
    if (!brief.trim() || busy) return;
    setBusy(true); setError(null); setResult(null);
    try {
      const t = await token();
      const res = await fetch(`${VPS}/api/ai/draft-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ docType, brief, format: 'markdown' }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.detail || body.error || `Erreur ${res.status}`);
      setResult(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  async function downloadDocx() {
    const t = await token();
    const res = await fetch(`${VPS}/api/ai/draft-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ docType, brief, format: 'docx' }),
    });
    if (!res.ok) { setError('Export .docx échoué'); return; }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${result?.title || 'document'}.docx`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const selectTypes = types.length ? types : [
    { id: 'contrat_prestation', label: 'Contrat de prestation de services' },
    { id: 'cgv', label: 'Conditions générales de vente' },
    { id: 'pacte_associes', label: "Pacte d'associés" },
    { id: 'pv_ag', label: "Procès-verbal d'assemblée générale" },
    { id: 'contrat_travail', label: 'Contrat de travail' },
    { id: 'nda', label: 'Accord de confidentialité (NDA)' },
    { id: 'cession_parts', label: 'Cession de parts sociales' },
    { id: 'bail_commercial', label: 'Bail commercial' },
    { id: 'autre', label: 'Autre document juridique' },
  ];

  return (
    <PageShell>
      <PageHeader
        eyebrow="Outils IA"
        title="Rédaction de documents"
        description="Génération de documents juridiques par l'IA, appuyée sur le droit français. Relisez toujours le projet avant usage."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Card className="h-fit min-w-0 gap-0 py-0">
          <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4">
            <CardTitle className="text-sm">Votre demande</CardTitle>
            <CardDescription className="text-xs">Type de document et brief en langage naturel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <div className="space-y-1.5">
              <Label htmlFor="docType">Type de document</Label>
              <select
                id="docType"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="border-input flex h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {selectTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor="brief">Brief</Label>
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{brief.length} car.</span>
              </div>
              <Textarea
                id="brief"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                rows={8}
                placeholder="Ex : Contrat de prestation entre la société DUPONT SAS (prestataire) et MARTIN SARL (client) pour une mission de conseil en stratégie de 6 mois, 4 500 € HT/mois, clause de confidentialité et de non-concurrence…"
              />
              <p className="text-xs text-muted-foreground">
                Plus le brief est précis (parties, montants, durée, conditions), meilleur est le projet.
              </p>
            </div>
            <Button onClick={generate} disabled={busy || !brief.trim()} className="w-full">
              {busy ? <><Loader2 className="size-4 animate-spin" /> Rédaction…</> : <><Sparkles className="size-4" /> Générer le document</>}
            </Button>
            {error && (
              <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[400px] min-w-0 gap-0 py-0">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b px-5 py-4 [.border-b]:pb-4">
            <div className="min-w-0 space-y-1">
              <p className="label-mono flex items-center gap-1.5">
                {busy ? (
                  <><span className="live-dot size-1.5 text-primary" aria-hidden /> Rédaction en cours</>
                ) : result ? (
                  <><span className="size-1.5 rounded-full bg-success" aria-hidden /> Projet généré</>
                ) : (
                  'Aperçu'
                )}
              </p>
              <CardTitle className="min-w-0 truncate text-sm">{result ? result.title : 'Document'}</CardTitle>
            </div>
            {result && (
              <Button size="sm" variant="outline" onClick={downloadDocx} className="shrink-0">
                <Download className="size-4" /> Télécharger .docx
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {!result && !busy && (
              <EmptyState
                icon={FileText}
                title="Aucun document généré"
                description="Choisissez un type de document, décrivez votre besoin puis lancez la génération : le projet s'affichera ici."
              />
            )}
            {busy && (
              <div className="space-y-3 p-5" aria-busy="true" aria-label="Rédaction en cours">
                <Skeleton className="h-5 w-2/5" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-11/12" />
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="mt-5 h-4 w-1/3" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-10/12" />
                <Skeleton className="h-3.5 w-3/4" />
              </div>
            )}
            {result && (
              <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
                <Markdown>{result.markdown}</Markdown>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
