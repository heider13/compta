import { AlertTriangle, Plus, Webhook as WebhookIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createWebhook, deleteWebhook, toggleWebhook } from '@/lib/server-actions/api-keys';
import { formatDate } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader, PageShell } from '@/components/cabinet/PageHeader';
import { EmptyState } from '@/components/cabinet/EmptyState';

const EVENTS = [
  'dossier.created',
  'dossier.submitted',
  'dossier.amendment_requested',
  'dossier.validated_internal',
  'dossier.sent_to_inpi',
  'dossier.status_changed',
  'dossier.signed',
  'client.created',
];

export default async function WebhooksPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: webhooks } = await supabase
    .from('webhooks')
    .select('*')
    .order('created_at', { ascending: false });

  async function action(formData: FormData) {
    'use server';
    const r = await createWebhook(formData);
    const { redirect } = await import('next/navigation');
    if (r.error) redirect(`/settings/webhooks?e=${encodeURIComponent(r.error)}`);
    redirect('/settings/webhooks');
  }

  return (
    <PageShell className="max-w-4xl">
      <PageHeader
        eyebrow="Réglages · Développeurs"
        title="Webhooks"
        description="Recevez les événements de Legaly AI sur vos endpoints."
      />

      {/* Signature */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card px-5 py-3 shadow-xs">
        <span className="label-mono">Signature</span>
        <code className="font-mono text-xs">HMAC-SHA256</code>
        <span className="text-xs text-muted-foreground">via l&apos;en-tête</span>
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">X-Legaly-Signature</code>
      </div>

      {sp.e && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          {sp.e}
        </div>
      )}

      {/* Nouveau webhook */}
      <Card className="gap-0 py-0">
        <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4">
          <CardTitle className="text-sm">Nouveau webhook</CardTitle>
          <CardDescription className="text-xs">
            Renseignez une URL et choisissez les événements à recevoir.
          </CardDescription>
        </CardHeader>
        <form action={action}>
          <CardContent className="space-y-5 p-5">
            <div className="space-y-1.5">
              <Label htmlFor="webhook_url">URL de l&apos;endpoint</Label>
              <Input
                id="webhook_url"
                name="url"
                type="url"
                required
                placeholder="https://votre-app.com/webhooks/legaly"
                className="font-mono"
              />
            </div>
            <fieldset className="space-y-2">
              <legend className="label-mono mb-2">Événements</legend>
              {/* Checkboxes natives : le form est une Server Action (POST FormData). */}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {EVENTS.map((e) => (
                  <label
                    key={e}
                    className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/50 has-[:checked]:border-brand-border has-[:checked]:bg-brand-soft has-[:checked]:text-brand-soft-foreground"
                  >
                    <input
                      type="checkbox"
                      name="events"
                      value={e}
                      className="size-4 accent-primary"
                    />
                    <span className="truncate font-mono text-xs">{e}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </CardContent>
          <CardFooter className="flex-wrap justify-between gap-3 border-t bg-muted/40 px-5 py-3 [.border-t]:pt-3">
            <p className="font-mono text-[11px] text-muted-foreground">POST · application/json</p>
            <Button type="submit" size="sm">
              <Plus className="size-4" />
              Créer
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Webhooks configurés */}
      <Card className="gap-0 py-0">
        <CardHeader className="flex flex-row items-center justify-between gap-2 border-b px-5 py-4 [.border-b]:pb-4">
          <div className="min-w-0 space-y-1">
            <CardTitle className="flex items-center gap-2 text-sm">
              <WebhookIcon className="size-4 text-muted-foreground" aria-hidden="true" />
              Webhooks configurés
            </CardTitle>
            <CardDescription className="text-xs">Vos endpoints et leur état de livraison.</CardDescription>
          </div>
          <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
            {webhooks?.length ?? 0}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {!webhooks?.length ? (
            <EmptyState
              icon={WebhookIcon}
              title="Aucun webhook"
              description="Ajoutez un endpoint ci-dessus pour recevoir les événements."
            />
          ) : (
            <ul className="divide-y">
              {webhooks.map((w) => (
                <li key={w.id} className="space-y-2 px-5 py-4 transition-colors hover:bg-muted/50">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2.5">
                      {w.active ? (
                        <span className="live-dot size-1.5 shrink-0 text-success" aria-hidden="true" />
                      ) : (
                        <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/40" aria-hidden="true" />
                      )}
                      <span className="break-all font-mono text-sm">{w.url}</span>
                    </span>
                    <div className="flex shrink-0 gap-2">
                      <form action={async () => { 'use server'; await toggleWebhook(w.id, !w.active); }}>
                        <Button type="submit" variant="outline" size="sm">
                          {w.active ? 'Désactiver' : 'Activer'}
                        </Button>
                      </form>
                      <form action={async () => { 'use server'; await deleteWebhook(w.id); }}>
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          Supprimer
                        </Button>
                      </form>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-4 text-xs text-muted-foreground">
                    <Badge
                      variant="outline"
                      className={
                        w.active
                          ? 'border-success/30 bg-success/10 font-normal text-success'
                          : 'font-normal text-muted-foreground'
                      }
                    >
                      {w.active ? 'Actif' : 'Inactif'}
                    </Badge>
                    {(w.events || []).map((ev: string) => (
                      <code key={ev} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                        {ev}
                      </code>
                    ))}
                    {w.last_triggered_at && (
                      <span className="font-mono text-[11px]">· Dernier : {formatDate(w.last_triggered_at)}</span>
                    )}
                    {w.failure_count > 0 && (
                      <span className="font-mono text-[11px] font-medium text-destructive">
                        · {w.failure_count} échec(s)
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
