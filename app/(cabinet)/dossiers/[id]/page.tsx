import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  FileText,
  ListChecks,
  MessageSquare,
  Paperclip,
  Route,
  Send,
  Sparkles,
  SquarePen,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/cabinet/StatusBadge';
import { formatDate, typeFormaliteLabel, formeJuridiqueLabel } from '@/lib/utils/format';
import { addObservation, submitToAdmin } from '@/lib/server-actions/dossiers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, PageShell } from '@/components/cabinet/PageHeader';
import { EmptyState } from '@/components/cabinet/EmptyState';
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
    <PageShell>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Link href="/dossiers" className="text-inherit no-underline hover:text-foreground">
              Dossiers
            </Link>
            <span aria-hidden>/</span>
            <span className="normal-case tracking-normal">{dossier.reference}</span>
          </span>
        }
        title={dossier.client_name}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/dossiers/${id}/edit`}>
                <SquarePen className="size-4" />
                Modifier
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/dashboard?dossier=${id}`}>
                <Sparkles className="size-4" />
                Agent Formalités
              </Link>
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5 text-sm text-muted-foreground">
          <StatusBadge statut={dossier.statut} />
          <span>
            {typeFormaliteLabel(dossier.type_formalite)}
            {dossier.forme_juridique && ` · ${formeJuridiqueLabel(dossier.forme_juridique)}`}
          </span>
          <span aria-hidden>·</span>
          <span className="font-mono text-xs">{dossier.reference}</span>
        </div>
      </PageHeader>

      {typeof sp.doc_error === 'string' && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {DOC_ERROR_LABELS[sp.doc_error] ?? `Échec de la génération du document (${sp.doc_error}).`}
        </div>
      )}
      {sp.doc === 'ok' && (
        <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm">
          <CheckCircle2 className="size-4 shrink-0 text-success" />
          Statuts générés — le document apparaît dans les pièces jointes du dossier.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {/* Parcours : pièce maîtresse de la page */}
          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="flex flex-row items-center justify-between gap-3 border-b px-5 py-4 [.border-b]:pb-4">
              <div className="min-w-0 space-y-1">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Route className="size-4 text-muted-foreground" />
                  Parcours de la formalité
                </CardTitle>
                <CardDescription className="text-xs">
                  Formalité, annonce légale, signatures, paiement.
                </CardDescription>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                <span className="live-dot size-1.5 text-success" />
                <span className="hidden sm:inline">suivi en direct</span>
              </span>
            </CardHeader>
            <CardContent className="p-5">
              <ParcoursFormalite dossierId={id} />
            </CardContent>
          </Card>

          <Card className="gap-0 py-0">
            <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Paperclip className="size-4 text-muted-foreground" />
                Pièces jointes
                <Counter n={documents?.length ?? 0} />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {(documents ?? []).length === 0 && (
                <EmptyState icon={Paperclip} title="Aucune pièce uploadée." compact />
              )}
              <ul className="divide-y">
                {(documents ?? []).map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50">
                    <span className="grid size-8 shrink-0 place-items-center rounded-md border bg-background">
                      <FileText className="size-4 text-muted-foreground" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{d.name}</p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground tabular-nums">
                        {d.size_bytes ? `${(d.size_bytes / 1024).toFixed(0)} Ko · ` : ''}
                        {d.doc_type ? `${d.doc_type} · ` : ''}
                        {formatDate(d.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="gap-0 py-0">
            <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4">
              <CardTitle className="flex items-center gap-2 text-sm">
                <MessageSquare className="size-4 text-muted-foreground" />
                Observations
                <Counter n={observations?.length ?? 0} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-5">
              {(observations ?? []).map((o) => (
                <div
                  key={o.id}
                  className={cn(
                    'rounded-lg border border-l-[3px] p-3',
                    o.author_role === 'admin'
                      ? 'border-l-warning bg-warning/10'
                      : 'border-l-primary bg-muted/40',
                  )}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="label-mono text-foreground">
                      {o.author_role === 'admin' ? 'Admin' : 'Client'}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{formatDate(o.created_at)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{o.message}</p>
                </div>
              ))}
              <form action={addObservation} className="space-y-2">
                <input type="hidden" name="dossier_id" value={id} />
                <label htmlFor="observation-message" className="sr-only">Message</label>
                <Textarea id="observation-message" name="message" placeholder="Écrire un message…" rows={3} required />
                <div className="flex justify-end">
                  <Button type="submit" size="sm">
                    <Send className="size-3.5" />
                    Envoyer
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="gap-0 py-0">
            <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ListChecks className="size-4 text-muted-foreground" />
                Tâches
                <Counter n={tasks?.length ?? 0} />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {(tasks ?? []).length === 0 && (
                <EmptyState icon={ListChecks} title="Aucune tâche." compact />
              )}
              {(tasks ?? []).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <Checkbox checked={t.done} disabled aria-label="Tâche" />
                  <span
                    className={cn(
                      'min-w-0 flex-1 text-sm',
                      t.done ? 'text-muted-foreground line-through' : 'text-foreground',
                    )}
                  >
                    {t.title}
                  </span>
                  {t.due_date && (
                    <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                      {formatDate(t.due_date)}
                    </span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <aside className="min-w-0 space-y-6">
          <Card className="gap-0 py-0">
            <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4">
              <CardTitle className="text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 p-5">
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

          {client && (
            <Card className="gap-0 py-0">
              <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4">
                <CardTitle className="text-sm">Client</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Link
                  href={`/clients/${client.id}`}
                  className="flex items-center gap-3 px-5 py-3 no-underline transition-colors hover:bg-muted/50"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-md border bg-background text-[11px] font-semibold text-muted-foreground">
                    {String(client.denomination ?? '').slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{client.denomination}</span>
                    {client.siren && (
                      <span className="block font-mono text-[11px] text-muted-foreground tabular-nums">{client.siren}</span>
                    )}
                  </span>
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </CardContent>
            </Card>
          )}

          <Card className="gap-0 py-0">
            <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4">
              <CardTitle className="text-sm">Informations</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 text-sm">
                <InfoRow label="Référence" value={<span className="font-mono text-xs">{dossier.reference}</span>} />
                <InfoRow label="Type" value={typeFormaliteLabel(dossier.type_formalite)} />
                <InfoRow label="Forme jur." value={formeJuridiqueLabel(dossier.forme_juridique)} />
                {dossier.siren && (
                  <InfoRow label="SIREN" value={<span className="font-mono text-xs tabular-nums">{dossier.siren}</span>} />
                )}
                <InfoRow label="Priorité" value={dossier.priority || 'normal'} />
                {dossier.internal_due_date && (
                  <InfoRow label="Échéance interne" value={<span className="font-mono text-xs tabular-nums">{formatDate(dossier.internal_due_date)}</span>} />
                )}
                {dossier.inpi_reference && (
                  <InfoRow label="ID INPI" value={<span className="font-mono text-xs">{dossier.inpi_reference}</span>} />
                )}
                <InfoRow label="Créé le" value={<span className="font-mono text-xs tabular-nums">{formatDate(dossier.created_at)}</span>} />
                <InfoRow label="MAJ" value={<span className="font-mono text-xs tabular-nums">{formatDate(dossier.updated_at)}</span>} />
              </dl>
            </CardContent>
          </Card>
        </aside>
      </div>
    </PageShell>
  );
}

function Counter({ n }: { n: number }) {
  return (
    <span className="rounded-md border bg-muted px-1.5 py-px font-mono text-[11px] font-normal text-muted-foreground tabular-nums">
      {n}
    </span>
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
      <dt className="label-mono">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium">{value}</dd>
    </>
  );
}
