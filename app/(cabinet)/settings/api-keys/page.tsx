import { AlertTriangle, KeyRound, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createApiKey, revokeApiKey } from '@/lib/server-actions/api-keys';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clés API</h1>
        <p className="text-sm text-muted-foreground">
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
        </CardHeader>
        <CardContent>
          <form action={action} className="flex flex-wrap gap-3">
            <Input
              name="name"
              required
              placeholder="Nom (ex: Intégration Zapier)"
              className="min-w-56 flex-1"
            />
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
            <KeyRound className="size-4 text-muted-foreground" aria-hidden="true" />
            Clés actives
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!keys?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucune clé créée pour le moment.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Préfixe</TableHead>
                  <TableHead>Créée le</TableHead>
                  <TableHead>Dernière utilisation</TableHead>
                  <TableHead className="text-right">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {k.prefix}…
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(k.created_at)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {k.last_used_at ? `Utilisée ${formatDate(k.last_used_at)}` : 'Jamais utilisée'}
                    </TableCell>
                    <TableCell className="text-right">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
