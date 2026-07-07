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
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="min-w-0">
        <h1>Clés API</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pour intégrer Compta dans vos outils internes ou ceux de vos partenaires. Base URL :{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            https://vps-84ac2579.vps.ovh.net/v1/
          </code>
        </p>
      </div>

      {sp.token && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="space-y-3 py-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              Copiez votre clé maintenant — elle ne sera plus jamais affichée
            </p>
            <code className="block break-all rounded-lg bg-white px-4 py-3 font-mono text-sm">
              {sp.token}
            </code>
          </CardContent>
        </Card>
      )}

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
          <CardTitle className="text-base">Nouvelle clé</CardTitle>
          <CardDescription>
            Générez une clé pour authentifier vos appels à l&apos;API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-2">
            <Label htmlFor="api_key_name">Nom de la clé</Label>
            <div className="flex flex-wrap gap-3">
              <Input
                id="api_key_name"
                name="name"
                required
                placeholder="Nom (ex: Intégration Zapier)"
                className="min-w-56 flex-1"
              />
              <Button type="submit">
                <Plus className="size-4" />
                Créer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4 text-muted-foreground" aria-hidden="true" />
            Clés actives
          </CardTitle>
          <CardDescription>Vos clés existantes et leur dernière utilisation.</CardDescription>
        </CardHeader>
        <CardContent>
          {!keys?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucune clé créée pour le moment.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {keys.map((k) => (
                <li
                  key={k.id}
                  className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{k.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="font-mono">{k.prefix}…</span>
                      <span>· Créée {formatDate(k.created_at)}</span>
                      <span>
                        · {k.last_used_at ? `Utilisée ${formatDate(k.last_used_at)}` : 'Jamais utilisée'}
                      </span>
                    </p>
                  </div>
                  <div className="shrink-0">
                    {k.revoked_at ? (
                      <Badge variant="secondary" className="bg-red-100 font-normal text-red-800">
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
    </div>
  );
}
