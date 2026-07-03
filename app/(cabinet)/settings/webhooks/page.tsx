import { Plus, Webhook as WebhookIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createWebhook, deleteWebhook, toggleWebhook } from '@/lib/server-actions/api-keys';
import { formatDate } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';

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
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Webhooks</h1>
        <p className="text-sm text-muted-foreground">
          Recevez les événements de Compta sur vos endpoints. Signés HMAC-SHA256 via{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            X-Compta-Signature
          </code>
          .
        </p>
      </div>

      {sp.e && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {sp.e}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nouveau webhook</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            <Input
              name="url"
              type="url"
              required
              placeholder="https://votre-app.com/webhooks/compta"
            />
            {/* Checkboxes natives : le form est une Server Action (POST FormData). */}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {EVENTS.map((e) => (
                <label
                  key={e}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/50 has-[:checked]:border-primary/50 has-[:checked]:bg-accent/50"
                >
                  <input
                    type="checkbox"
                    name="events"
                    value={e}
                    className="size-4 accent-[var(--primary)]"
                  />
                  <span className="font-mono text-xs">{e}</span>
                </label>
              ))}
            </div>
            <Button type="submit">
              <Plus className="size-4" />
              Créer
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <WebhookIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            Webhooks configurés
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!webhooks?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucun webhook.</p>
          ) : (
            <div className="divide-y">
              {webhooks.map((w) => (
                <div key={w.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="break-all font-mono text-sm">{w.url}</span>
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
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <Badge
                      variant="secondary"
                      className={
                        w.active
                          ? 'bg-green-100 font-normal text-green-800'
                          : 'bg-muted font-normal text-muted-foreground'
                      }
                    >
                      {w.active ? 'Actif' : 'Inactif'}
                    </Badge>
                    <span className="font-mono">{(w.events || []).join(' · ')}</span>
                    {w.last_triggered_at && <span>· Dernier : {formatDate(w.last_triggered_at)}</span>}
                    {w.failure_count > 0 && (
                      <span className="font-medium text-destructive">
                        · {w.failure_count} échec(s)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
