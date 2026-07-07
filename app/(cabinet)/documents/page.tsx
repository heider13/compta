'use client';

// Générateur de documents légaux & contractuels par l'IA.
// Brief en langage naturel → Claude rédige (avec RAG juridique) → aperçu + export .docx.

import { useEffect, useState } from 'react';
import { Download, FileText, Loader2, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const VPS = process.env.NEXT_PUBLIC_VPS_BACKEND_URL ?? 'https://vps-84ac2579.vps.ovh.net';

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
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#ede7ff] text-primary">
            <FileText className="size-5" />
          </span>
          <div className="min-w-0">
            <h1>Rédaction de documents</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Génération de documents juridiques par l&apos;IA, appuyée sur le droit français.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card className="h-fit min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Votre demande</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="docType">Type de document</Label>
              <select
                id="docType"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="border-input flex h-10 w-full rounded-md border bg-[#f3f1fa] px-3 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                {selectTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brief">Brief</Label>
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
              <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[400px] min-w-0">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="min-w-0 truncate text-base">{result ? result.title : 'Aperçu'}</CardTitle>
            {result && (
              <Button size="sm" variant="outline" onClick={downloadDocx} className="shrink-0">
                <Download className="size-4" /> Télécharger .docx
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!result && !busy && (
              <div className="grid place-items-center py-16 text-center text-sm text-muted-foreground">
                <span className="mb-3 grid size-12 place-items-center rounded-full bg-[#ede7ff] text-primary">
                  <Sparkles className="size-6" />
                </span>
                Le document généré s&apos;affichera ici.
              </div>
            )}
            {busy && (
              <div className="grid place-items-center py-16 text-primary">
                <Loader2 className="size-6 animate-spin" />
              </div>
            )}
            {result && (
              <pre className="max-h-[70vh] overflow-y-auto whitespace-pre-wrap rounded-lg bg-[#f5f3fb] p-4 font-sans text-sm leading-relaxed text-foreground">
                {result.markdown}
              </pre>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
