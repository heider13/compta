import { AlertTriangle, KeyRound, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createApiKey, revokeApiKey } from '@/lib/server-actions/api-keys';
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

export default async function ApiKeysPage({ searchParams }: { searchParams: Promise<{ token?: string; prefix?: string; e?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: keys } = await supabase
    .from('api_keys')
    .select('*')
    .order('created_at', { ascending: false });

  async function action(formData: FormData) {
    'use server';
    const r = await createApiKey(formData);
    const { redirect } = await import('next/navigation');
    if (r.error) redirect(`/settings/api-keys?e=${encodeURIComponent(r.error)}`);
    redirect(`/settings/api-keys?token=${encodeURIComponent(r.token!)}&prefix=${encodeURIComponent(r.prefix!)}`);
  }

  const baseUrl = `${process.env.NEXT_PUBLIC_VPS_BACKEND_URL ?? 'https://0dao73k.cserverhost.cloud'}/v1/`;
  const activeCount = (keys ?? []).filter((k) => !k.revoked_at).length;

  return (
    <PageShell className="max-w-4xl">
      <PageHeader
        eyebrow="Réglages · Développeurs"
        title="Clés API"
        description="Pour intégrer Legaly AI dans vos outils internes ou ceux de vos partenaires."
      />

      {/* Point d'accès */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card px-5 py-3 shadow-xs">
        <span className="label-mono">Base URL</span>
        <code className="min-w-0 flex-1 break-all font-mono text-xs">{baseUrl}</code>
        <Badge variant="outline" className="font-mono text-[11px] font-normal text-muted-foreground">
          REST · v1
        </Badge>
      </div>

      {sp.token && (
        <Card className="gap-0 border-warning/40 py-0">
          <CardHeader className="border-b border-warning/40 bg-warning/10 px-5 py-3 [.border-b]:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden="true" />
              Copiez votre clé maintenant — elle ne sera plus jamais affichée
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-5">
            <span className="label-mono">Clé secrète{sp.prefix ? ` · ${sp.prefix}` : ''}</span>
            <code className="block break-all rounded-md border bg-muted/40 px-4 py-3 font-mono text-sm select-all">
              {sp.token}
            </code>
          </CardContent>
        </Card>
      )}

      {sp.e && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          {sp.e}
        </div>
      )}

      {/* Nouvelle clé */}
      <Card className="gap-0 py-0">
        <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4">
          <CardTitle className="text-sm">Nouvelle clé</CardTitle>
          <CardDescription className="text-xs">
            Générez une clé pour authentifier vos appels à l&apos;API.
          </CardDescription>
        </CardHeader>
        <form action={action}>
          <CardContent className="space-y-1.5 p-5">
            <Label htmlFor="api_key_name">Nom de la clé</Label>
            <Input
              id="api_key_name"
              name="name"
              required
              placeholder="Nom (ex: Intégration Zapier)"
            />
          </CardContent>
          <CardFooter className="flex-wrap justify-between gap-3 border-t bg-muted/40 px-5 py-3 [.border-t]:pt-3">
            <p className="text-xs text-muted-foreground">La clé complète n&apos;est affichée qu&apos;une seule fois.</p>
            <Button type="submit" size="sm">
              <Plus className="size-4" />
              Créer
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Clés existantes */}
      <Card className="gap-0 py-0">
        <CardHeader className="flex flex-row items-center justify-between gap-2 border-b px-5 py-4 [.border-b]:pb-4">
          <div className="min-w-0 space-y-1">
            <CardTitle className="flex items-center gap-2 text-sm">
              <KeyRound className="size-4 text-muted-foreground" aria-hidden="true" />
              Clés actives
            </CardTitle>
            <CardDescription className="text-xs">Vos clés existantes et leur dernière utilisation.</CardDescription>
          </div>
          <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
            {activeCount}/{keys?.length ?? 0}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {!keys?.length ? (
            <EmptyState
              icon={KeyRound}
              title="Aucune clé créée pour le moment"
              description="Créez une première clé ci-dessus pour appeler l'API."
            />
          ) : (
            <ul className="divide-y">
              {keys.map((k) => (
                <li
                  key={k.id}
                  className="flex flex-wrap items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
                >
                  <span className="flex size-4 shrink-0 items-center justify-center" aria-hidden="true">
                    {k.revoked_at ? (
                      <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                    ) : (
                      <span className="live-dot size-1.5 text-success" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{k.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-muted-foreground">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-foreground">{k.prefix}…</span>
                      <span>Créée {formatDate(k.created_at)}</span>
                      <span>
                        · {k.last_used_at ? `Utilisée ${formatDate(k.last_used_at)}` : 'Jamais utilisée'}
                      </span>
                    </p>
                  </div>
                  <div className="shrink-0">
                    {k.revoked_at ? (
                      <Badge variant="outline" className="border-destructive/30 bg-destructive/10 font-normal text-destructive">
                        Révoquée
                      </Badge>
                    ) : (
                      <form action={async () => { 'use server'; await revokeApiKey(k.id); }}>
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          Révoquer
                        </Button>
                      </form>
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
