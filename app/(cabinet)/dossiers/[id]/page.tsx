import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  CheckCircle2,
  FileText,
  Paperclip,
  Send,
  Sparkles,
  SquarePen,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/cabinet/StatusBadge';
import { formatDate, typeFormaliteLabel, formeJuridiqueLabel } from '@/lib/utils/format';
import { addObservation, submitToAdmin } from '@/lib/server-actions/dossiers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ParcoursFormalite } from '@/components/cabinet/dossier/ParcoursFormalite';

const VPS_BACKEND_URL =
  process.env.NEXT_PUBLIC_VPS_BACKEND_URL ?? 'https://0dao73k.cserverhost.cloud';


// Formes juridiques couvertes par le générateur de statuts backend
// (server/lib/doc-generator.js — SUPPORTED_FORMES).
const STATUTS_FORMES = ['SASU', 'SAS', 'EURL', 'SARL', 'SCI'];

// ─── Server Action : génération des statuts (.docx) via le backend VPS ───
async function generateStatutsAction(formData: FormData) {
  'use server';

  const dossierId = String(formData.get('dossierId') ?? '');
  if (!dossierId) return;

  const supabase = await createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) redirect('/auth/login');

  // org_id du dossier pour le header x-organization-id (multi-tenant backend)
  const { data: dossier } = await supabase
    .from('dossiers')
    .select('organization_id')
    .eq('id', dossierId)
    .maybeSingle();

  let errorCode: string | null = null;
  try {
    const res = await fetch(`${VPS_BACKEND_URL}/api/dossiers/${dossierId}/generate-doc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(dossier?.organization_id
          ? { 'x-organization-id': dossier.organization_id }
          : {}),
      },
      body: JSON.stringify({ docType: 'STATUTS' }),
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      errorCode = body.error || `http_${res.status}`;
    }
  } catch {
    errorCode = 'vps_unreachable';
  }

  if (errorCode) {
    redirect(`/dossiers/${dossierId}?doc_error=${encodeURIComponent(errorCode)}`);
  }
  revalidatePath(`/dossiers/${dossierId}`);
  redirect(`/dossiers/${dossierId}?doc=ok`);
}

const DOC_ERROR_LABELS: Record<string, string> = {
  vps_unreachable: 'Le serveur de génération est injoignable. Réessayez dans quelques minutes.',
  unsupported_forme: 'La génération de statuts n’est pas disponible pour cette forme juridique.',
  unsupported_doc_type: 'Type de document non géré.',
  not_found: 'Dossier introuvable côté serveur.',
  forbidden: 'Vous n’avez pas les droits pour générer un document sur ce dossier.',
  storage_upload_failed: 'Échec de l’enregistrement du document généré.',
};


export default async function DossierDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: dossier } = await supabase.from('dossiers').select('*').eq('id', id).single();
  if (!dossier) notFound();


  const [{ data: observations }, { data: documents }, { data: tasks }, client] = await Promise.all([
    supabase.from('dossier_observations').select('*').eq('dossier_id', id).order('created_at', { ascending: true }),
    supabase.from('dossier_documents').select('*').eq('dossier_id', id).order('created_at', { ascending: true }),
    supabase.from('dossier_tasks').select('*').eq('dossier_id', id).order('done', { ascending: true }),
    dossier.client_id ? (await supabase.from('clients').select('id, denomination, siren').eq('id', dossier.client_id).single()).data : null,
  ]);

  const meta = (dossier.metadata ?? {}) as { inpi_formality_id?: string; inpi_draft_id?: string };
  const canSubmit = ['DRAFT', 'INTERNAL_AMENDMENT_PENDING'].includes(dossier.statut) && !meta.inpi_formality_id && !meta.inpi_draft_id;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/dossiers" className="hover:text-foreground">
          Dossiers
        </Link>
        <span>›</span>
        <span className="font-mono text-xs">{dossier.reference}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1>{dossier.client_name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>
              {typeFormaliteLabel(dossier.type_formalite)}
              {dossier.forme_juridique && ` · ${formeJuridiqueLabel(dossier.forme_juridique)}`}
              {' · '}
              <span className="font-mono text-xs">{dossier.reference}</span>
            </span>
            <StatusBadge statut={dossier.statut} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="lg">
            <Link href={`/dashboard?dossier=${id}`}>
              <Sparkles className="size-4" />
              Agent Formalités
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/dossiers/${id}/edit`}>
              <SquarePen className="size-4" />
              Modifier
            </Link>
          </Button>
        </div>
      </div>

      {typeof sp.doc_error === 'string' && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {DOC_ERROR_LABELS[sp.doc_error] ?? `Échec de la génération du document (${sp.doc_error}).`}
        </div>
      )}
      {sp.doc === 'ok' && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-[#ede7ff] px-4 py-3 text-sm text-primary">
          <CheckCircle2 className="size-4 shrink-0" />
          Statuts générés — le document apparaît dans les pièces jointes du dossier.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {client && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Client</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-baseline gap-3">
                <Link
                  href={`/clients/${client.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {client.denomination}
                </Link>
                {client.siren && (
                  <span className="font-mono text-xs text-muted-foreground">{client.siren}</span>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Paperclip className="size-4 text-muted-foreground" />
                Pièces jointes ({documents?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {(documents ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Aucune pièce uploadée.</p>
              )}
              {(documents ?? []).map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.size_bytes ? `${(d.size_bytes / 1024).toFixed(0)} Ko · ` : ''}
                      {d.doc_type ? `${d.doc_type} · ` : ''}
                      {formatDate(d.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Observations ({observations?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(observations ?? []).map((o) => (
                <div
                  key={o.id}
                  className={cn(
                    'rounded-lg border-l-[3px] p-3',
                    o.author_role === 'admin'
                      ? 'border-l-amber-500 bg-amber-50'
                      : 'border-l-primary bg-muted/60',
                  )}
                >
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <strong className="font-semibold">
                      {o.author_role === 'admin' ? 'Admin' : 'Client'}
                    </strong>
                    <span className="font-mono">{formatDate(o.created_at)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{o.message}</p>
                </div>
              ))}
              <form action={addObservation} className="space-y-2">
                <input type="hidden" name="dossier_id" value={id} />
                <Textarea name="message" placeholder="Écrire un message…" rows={3} required />
                <div className="flex justify-end">
                  <Button type="submit" size="sm">
                    <Send className="size-3.5" />
                    Envoyer
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tâches ({tasks?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {(tasks ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Aucune tâche.</p>
              )}
              {(tasks ?? []).map((t) => (
                <div
                  key={t.id}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2',
                    t.done && 'bg-muted/60',
                  )}
                >
                  <Checkbox checked={t.done} disabled aria-label="Tâche" />
                  <span
                    className={cn(
                      'flex-1 text-sm',
                      t.done ? 'text-muted-foreground line-through' : 'text-foreground',
                    )}
                  >
                    {t.title}
                  </span>
                  {t.due_date && (
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {formatDate(t.due_date)}
                    </span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <aside className="order-first min-w-0 space-y-6 lg:order-none">
          <Card>
            <CardContent className="pt-5">
              <ParcoursFormalite dossierId={id} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {canSubmit && (
                <form action={async () => { 'use server'; await submitToAdmin(id); }}>
                  <Button type="submit" className="w-full">
                    <Send className="size-4" />
                    Soumettre pour validation
                  </Button>
                </form>
              )}
              {STATUTS_FORMES.includes(dossier.forme_juridique) && (
                <div>
                  <form action={generateStatutsAction}>
                    <input type="hidden" name="dossierId" value={id} />
                    <Button type="submit" variant="outline" className="w-full">
                      <FileText className="size-4" />
                      Générer les statuts (.docx)
                    </Button>
                  </form>
                  <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
                    Document éditable généré à partir des données du dossier.
                  </p>
                </div>
              )}
              <Button asChild variant="ghost" size="sm" className="w-full text-muted-foreground">
                <a href={`/app.html?route=nouveau&type=${dossier.forme_juridique || dossier.type_formalite}&d=${id}`}>
                  Continuer dans le wizard
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 text-sm">
                <InfoRow label="Référence" value={<span className="font-mono text-xs">{dossier.reference}</span>} />
                <InfoRow label="Type" value={typeFormaliteLabel(dossier.type_formalite)} />
                <InfoRow label="Forme jur." value={formeJuridiqueLabel(dossier.forme_juridique)} />
                {dossier.siren && (
                  <InfoRow label="SIREN" value={<span className="font-mono text-xs">{dossier.siren}</span>} />
                )}
                <InfoRow label="Priorité" value={dossier.priority || 'normal'} />
                {dossier.internal_due_date && (
                  <InfoRow label="Échéance interne" value={formatDate(dossier.internal_due_date)} />
                )}
                {dossier.inpi_reference && (
                  <InfoRow label="ID INPI" value={<span className="font-mono text-xs">{dossier.inpi_reference}</span>} />
                )}
                <InfoRow label="Créé le" value={formatDate(dossier.created_at)} />
                <InfoRow label="MAJ" value={formatDate(dossier.updated_at)} />
              </dl>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </>
  );
}
