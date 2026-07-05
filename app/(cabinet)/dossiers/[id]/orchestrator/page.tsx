// Orchestrateur de formalité — la « flotte d'agents » qui pilote le dossier
// de A à Z : collecte → identité (OCR) → statuts → signature eIDAS →
// contrôle → dépôt INPI. Chaque étape est un agent avec son état temps réel.
//
// L'état est calculé côté VPS (GET /api/dossiers/:id/pipeline) à partir du
// dossier réel. Les actions relancent les endpoints existants.

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  ScanLine,
  FileText,
  PenTool,
  ShieldCheck,
  Landmark,
  Building2,
  CheckCircle2,
  Circle,
  ArrowRight,
  Clock,
  AlertTriangle,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const VPS_BACKEND_URL =
  process.env.NEXT_PUBLIC_VPS_BACKEND_URL ?? 'https://vps-84ac2579.vps.ovh.net';

interface StepAction {
  kind: string;
  label: string;
}
interface Step {
  key: string;
  agent: string;
  title: string;
  description: string;
  detail: string;
  status: 'done' | 'active' | 'waiting' | 'pending' | 'blocked';
  link?: string | null;
  action?: StepAction | null;
}
interface Pipeline {
  dossierId: string;
  reference: string | null;
  typeFormalite: string | null;
  statut: string;
  progress: { done: number; total: number; percent: number; complete: boolean };
  steps: Step[];
  next: { key: string; agent: string; title: string; action: StepAction | null; waiting: boolean } | null;
  society: { denomination: string; objet: string; dirigeants: number };
  isAdmin: boolean;
}

const AGENT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  collecte: Building2,
  identite: ScanLine,
  redaction: FileText,
  signature: PenTool,
  controle: ShieldCheck,
  depot: Landmark,
};

// ─── Server Actions ──────────────────────────────────────
async function backendCall(
  dossierId: string,
  path: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) redirect('/auth/login');

  const { data: dossier } = await supabase
    .from('dossiers')
    .select('organization_id')
    .eq('id', dossierId)
    .maybeSingle();

  try {
    const res = await fetch(`${VPS_BACKEND_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(dossier?.organization_id
          ? { 'x-organization-id': dossier.organization_id }
          : {}),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: res.ok, error: json.error };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'network_error';
    if (msg === 'NEXT_REDIRECT') throw err;
    return { ok: false, error: msg };
  }
}

async function generateStatuts(formData: FormData) {
  'use server';
  const dossierId = String(formData.get('dossierId') ?? '');
  const r = await backendCall(dossierId, `/api/dossiers/${dossierId}/generate-doc`, {
    docType: 'STATUTS',
  });
  redirect(
    `/dossiers/${dossierId}/orchestrator?${r.ok ? 'ok=statuts' : 'error=' + encodeURIComponent(r.error || 'echec')}`,
  );
}

async function validateDossier(formData: FormData) {
  'use server';
  const dossierId = String(formData.get('dossierId') ?? '');
  const sendToInpi = String(formData.get('sendToInpi') ?? '') === '1';
  const r = await backendCall(
    dossierId,
    `/api/admin/dossiers/${dossierId}/validate`,
    { sendToInpi },
  );
  redirect(
    `/dossiers/${dossierId}/orchestrator?${r.ok ? 'ok=' + (sendToInpi ? 'depot' : 'valide') : 'error=' + encodeURIComponent(r.error || 'echec')}`,
  );
}

// Auto-pilote : enchaîne automatiquement les étapes SÛRES (génération de
// statuts, validation interne pour un admin) et s'arrête net dès qu'une étape
// exige une intervention humaine ou une action irréversible/sortante
// (signature envoyée à un tiers, dépôt INPI) — jamais déclenchées sans un clic
// explicite de l'utilisateur.
async function autoPilot(formData: FormData) {
  'use server';
  const dossierId = String(formData.get('dossierId') ?? '');
  const supabase = await createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) redirect('/auth/login');
  const { data: d } = await supabase
    .from('dossiers')
    .select('organization_id')
    .eq('id', dossierId)
    .maybeSingle();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(d?.organization_id ? { 'x-organization-id': d.organization_id } : {}),
  };
  const post = (path: string, body: unknown) =>
    fetch(`${VPS_BACKEND_URL}${path}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

  let advanced = 0;
  let stopped = 'done';
  try {
    for (let i = 0; i < 6; i++) {
      const pres = await fetch(`${VPS_BACKEND_URL}/api/dossiers/${dossierId}/pipeline`, {
        headers,
        cache: 'no-store',
      });
      if (!pres.ok) { stopped = 'error'; break; }
      const pipe = (await pres.json()) as Pipeline;
      if (pipe.progress.complete || !pipe.next) { stopped = 'done'; break; }
      if (pipe.next.waiting) { stopped = 'waiting_signature'; break; }
      const kind = pipe.next.action?.kind;
      if (kind === 'generate-doc') {
        const r = await post(`/api/dossiers/${dossierId}/generate-doc`, { docType: 'STATUTS' });
        if (!r.ok) { stopped = 'error'; break; }
        advanced++;
        continue;
      }
      if (kind === 'validate' && pipe.isAdmin) {
        const r = await post(`/api/admin/dossiers/${dossierId}/validate`, { sendToInpi: false });
        if (!r.ok) { stopped = 'error'; break; }
        advanced++;
        continue;
      }
      // Étapes qui exigent une main humaine ou une action sortante → on s'arrête.
      stopped =
        kind === 'wizard'
          ? 'needs_input'
          : kind === 'sign-request' || kind === 'sign-status'
            ? 'needs_signature'
            : kind === 'submit-inpi'
              ? 'needs_inpi_confirm'
              : kind === 'validate'
                ? 'needs_admin'
                : 'blocked';
      break;
    }
  } catch (err) {
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') throw err;
    stopped = 'error';
  }
  redirect(`/dossiers/${dossierId}/orchestrator?auto=${advanced}&stopped=${stopped}`);
}

// ─── Rendu d'une étape-agent ─────────────────────────────
function StepNode({
  step,
  dossierId,
  isAdmin,
  isLast,
}: {
  step: Step;
  dossierId: string;
  isAdmin: boolean;
  isLast: boolean;
}) {
  const Icon = AGENT_ICON[step.key] ?? Sparkles;
  const done = step.status === 'done';
  const active = step.status === 'active';
  const waiting = step.status === 'waiting';
  const blocked = step.status === 'blocked';

  const railColor = done
    ? 'bg-green-500'
    : active
      ? 'bg-primary'
      : blocked
        ? 'bg-destructive'
        : 'bg-border';

  const StatusIcon = done
    ? CheckCircle2
    : waiting
      ? Clock
      : blocked
        ? AlertTriangle
        : active
          ? ArrowRight
          : Circle;

  return (
    <div className="relative flex gap-4">
      {/* rail vertical */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'grid size-11 shrink-0 place-items-center rounded-xl border transition-colors',
            done && 'border-green-300 bg-green-50 text-green-700',
            active && 'border-primary/40 bg-primary/10 text-primary',
            waiting && 'border-amber-300 bg-amber-50 text-amber-700',
            blocked && 'border-destructive/40 bg-destructive/10 text-destructive',
            step.status === 'pending' && 'border-border bg-muted text-muted-foreground',
          )}
        >
          <Icon className="size-5" />
        </div>
        {!isLast && <div className={cn('mt-1 w-0.5 flex-1', railColor)} />}
      </div>

      {/* contenu */}
      <div className={cn('flex-1 pb-8', isLast && 'pb-0')}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {step.agent}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
              done && 'bg-green-100 text-green-800',
              active && 'bg-primary/15 text-primary',
              waiting && 'bg-amber-100 text-amber-800',
              blocked && 'bg-destructive/15 text-destructive',
              step.status === 'pending' && 'bg-muted text-muted-foreground',
            )}
          >
            <StatusIcon className="size-3" />
            {done
              ? 'Terminé'
              : active
                ? 'À faire'
                : waiting
                  ? 'En cours'
                  : blocked
                    ? 'Bloqué'
                    : 'En attente'}
          </span>
        </div>

        <h3 className="mt-1 text-base font-semibold tracking-tight">{step.title}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{step.description}</p>
        <p
          className={cn(
            'mt-1.5 text-sm',
            done ? 'text-green-700' : blocked ? 'text-destructive' : 'text-foreground/80',
          )}
        >
          {step.detail}
        </p>

        {/* Action de l'étape active */}
        {(active || blocked || waiting) && step.action && (
          <div className="mt-3">
            <StepActionButton
              action={step.action}
              step={step}
              dossierId={dossierId}
              isAdmin={isAdmin}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function StepActionButton({
  action,
  step,
  dossierId,
  isAdmin,
}: {
  action: StepAction;
  step: Step;
  dossierId: string;
  isAdmin: boolean;
}) {
  switch (action.kind) {
    case 'wizard':
      return (
        <Button asChild size="sm">
          <Link href={`/dossiers/${dossierId}/edit`}>
            {action.label} <ArrowRight className="ml-1 size-4" />
          </Link>
        </Button>
      );
    case 'generate-doc':
      return (
        <form action={generateStatuts}>
          <input type="hidden" name="dossierId" value={dossierId} />
          <Button type="submit" size="sm">
            <Sparkles className="mr-1 size-4" /> {action.label}
          </Button>
        </form>
      );
    case 'sign-request':
    case 'sign-status':
      return (
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm">
            <Link href={`/dossiers/${dossierId}/sign`}>
              {action.label} <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
          {step.link && (
            <Button asChild variant="outline" size="sm">
              <a href={step.link} target="_blank" rel="noopener noreferrer">
                Lien de signature <ExternalLink className="ml-1 size-3.5" />
              </a>
            </Button>
          )}
        </div>
      );
    case 'validate':
      if (!isAdmin)
        return (
          <p className="text-xs text-muted-foreground">
            En attente de validation par un administrateur du cabinet.
          </p>
        );
      return (
        <form action={validateDossier}>
          <input type="hidden" name="dossierId" value={dossierId} />
          <input type="hidden" name="sendToInpi" value="0" />
          <Button type="submit" size="sm">
            <ShieldCheck className="mr-1 size-4" /> {action.label}
          </Button>
        </form>
      );
    case 'submit-inpi':
      if (!isAdmin)
        return (
          <p className="text-xs text-muted-foreground">
            Le dépôt INPI est réservé aux administrateurs du cabinet.
          </p>
        );
      return (
        <form action={validateDossier}>
          <input type="hidden" name="dossierId" value={dossierId} />
          <input type="hidden" name="sendToInpi" value="1" />
          <Button type="submit" size="sm">
            <Landmark className="mr-1 size-4" /> {action.label}
          </Button>
        </form>
      );
    default:
      return null;
  }
}

const OK_MSG: Record<string, string> = {
  statuts: 'Statuts générés et ajoutés au dossier.',
  valide: 'Dossier validé en interne.',
  depot: 'Formalité transmise à l’INPI.',
};

const STOP_MSG: Record<string, string> = {
  done: 'Toutes les étapes automatisables ont été exécutées.',
  needs_input: 'À vous de jouer : complétez les informations et les pièces du dossier.',
  needs_signature: 'Prêt à signer : renseignez le signataire pour lancer la signature.',
  waiting_signature: 'Signature en cours — en attente du signataire.',
  needs_inpi_confirm: 'Prêt à déposer : confirmez le dépôt à l’INPI (action définitive).',
  needs_admin: 'En attente de validation par un administrateur du cabinet.',
  blocked: 'Étape bloquée — vérifiez le dossier.',
  error: 'Une étape a échoué — réessayez ou vérifiez le dossier.',
};

export default async function OrchestratorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) redirect('/auth/login');

  const { data: dossier } = await supabase
    .from('dossiers')
    .select('id, organization_id')
    .eq('id', id)
    .maybeSingle();
  if (!dossier) notFound();

  let pipeline: Pipeline | null = null;
  let fetchError: string | null = null;
  try {
    const res = await fetch(`${VPS_BACKEND_URL}/api/dossiers/${id}/pipeline`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(dossier.organization_id
          ? { 'x-organization-id': dossier.organization_id }
          : {}),
      },
      cache: 'no-store',
    });
    if (res.ok) pipeline = (await res.json()) as Pipeline;
    else fetchError = `http_${res.status}`;
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'network_error';
  }

  const okFlag = typeof sp.ok === 'string' ? sp.ok : null;
  const errorCode = typeof sp.error === 'string' ? sp.error : null;
  const autoCount = typeof sp.auto === 'string' ? parseInt(sp.auto, 10) || 0 : null;
  const stoppedCode = typeof sp.stopped === 'string' ? sp.stopped : null;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/dossiers" className="hover:text-foreground">
          Dossiers
        </Link>
        <span>›</span>
        <Link href={`/dossiers/${id}`} className="hover:text-foreground font-mono text-xs">
          {pipeline?.reference ?? id.slice(0, 8)}
        </Link>
        <span>›</span>
        <span className="text-foreground">Orchestrateur</span>
      </nav>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Orchestrateur de formalité
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {pipeline?.society.denomination || 'Dossier'} ·{' '}
            {pipeline?.typeFormalite ?? '—'} · une flotte d’agents automatise chaque étape.
          </p>
        </div>
      </div>

      {okFlag && OK_MSG[okFlag] && (
        <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 className="size-4 shrink-0" />
          {OK_MSG[okFlag]}
        </div>
      )}
      {errorCode && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          Action impossible : <span className="font-mono text-xs">{errorCode}</span>
        </div>
      )}
      {fetchError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Impossible de charger la pipeline (<span className="font-mono text-xs">{fetchError}</span>).
        </div>
      )}
      {stoppedCode && (
        <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            <strong>Auto-pilote : </strong>
            {autoCount ? `${autoCount} étape${autoCount > 1 ? 's' : ''} exécutée${autoCount > 1 ? 's' : ''} automatiquement. ` : ''}
            {STOP_MSG[stoppedCode] ?? ''}
          </span>
        </div>
      )}

      {pipeline && (
        <>
          {/* Barre de progression globale */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {pipeline.progress.complete
                    ? 'Formalité complète 🎉'
                    : pipeline.next
                      ? `Prochaine étape — ${pipeline.next.agent}`
                      : 'En cours'}
                </span>
                <span className="text-muted-foreground">
                  {pipeline.progress.done}/{pipeline.progress.total} étapes ·{' '}
                  {pipeline.progress.percent}%
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    pipeline.progress.complete ? 'bg-green-500' : 'bg-primary',
                  )}
                  style={{ width: `${pipeline.progress.percent}%` }}
                />
              </div>

              {!pipeline.progress.complete && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <form action={autoPilot}>
                    <input type="hidden" name="dossierId" value={id} />
                    <Button type="submit" size="sm">
                      <Sparkles className="mr-1 size-4" /> Lancer l’auto-pilote
                    </Button>
                  </form>
                  <span className="text-xs text-muted-foreground">
                    L’IA enchaîne les étapes automatisables et s’arrête dès qu’une décision
                    vous revient (signature, dépôt).
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline des agents */}
          <Card>
            <CardContent className="pt-6">
              {pipeline.steps.map((step, i) => (
                <StepNode
                  key={step.key}
                  step={step}
                  dossierId={id}
                  isAdmin={pipeline!.isAdmin}
                  isLast={i === pipeline!.steps.length - 1}
                />
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
