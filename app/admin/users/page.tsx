import { createClient } from '@/lib/supabase/server';
import { formatDateFr } from '@/lib/types';
import { changeUserRoleForm } from '@/lib/server-actions/admin';
import { PageHeader, EmptyState, ErrorNote, nativeFieldClass } from '@/components/admin/bits';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

interface ProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  created_at: string;
}

export default async function AdminUsersPage() {
  const supabase = await createClient();

  // Lecture via la table profiles (créée pour chaque auth.user).
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  const profiles = (data ?? []) as ProfileRow[];

  // Comptage memberships par user (séparément — pas de FK directe profiles → memberships)
  const membershipCountByUser = new Map<string, number>();
  if (profiles.length > 0) {
    const { data: ms } = await supabase
      .from('memberships')
      .select('user_id')
      .in(
        'user_id',
        profiles.map((p) => p.id),
      );
    for (const m of (ms ?? []) as { user_id: string }[]) {
      membershipCountByUser.set(
        m.user_id,
        (membershipCountByUser.get(m.user_id) ?? 0) + 1,
      );
    }
  }

  // Récupération des emails via auth admin si possible — sinon on n'affiche
  // que l'UUID. listUsers requires service_role, donc on tente best-effort.
  const emailById = new Map<string, string>();
  try {
    const { data: list } = await supabase.auth.admin.listUsers({ perPage: 200 });
    for (const u of list?.users ?? []) {
      if (u?.id && u.email) emailById.set(u.id, u.email);
    }
  } catch {
    // pas de service_role : on continue sans
  }

  return (
    <>
      <PageHeader
        title="Utilisateurs"
        subtitle={`${profiles.length} utilisateur${profiles.length > 1 ? 's' : ''} sur la plateforme.`}
      />

      {error && <ErrorNote message={error.message} />}

      {emailById.size === 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          Note : les emails ne sont pas affichés car le serveur tourne sans clé{' '}
          <code className="rounded bg-amber-100 px-1 font-mono">service_role</code>.
          Configurez-la pour activer la recherche par email.
        </div>
      )}

      <Card>
        <CardContent>
          {profiles.length === 0 ? (
            <EmptyState label="Aucun utilisateur." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle actuel</TableHead>
                  <TableHead className="text-right">Cabinets</TableHead>
                  <TableHead>Inscrit le</TableHead>
                  <TableHead>Changer le rôle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => {
                  const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ');
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {fullName || <span className="font-mono text-xs">{p.id.slice(0, 8)}</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {emailById.get(p.id) ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.role === 'admin' ? 'default' : 'secondary'}>
                          {p.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {membershipCountByUser.get(p.id) ?? 0}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {formatDateFr(p.created_at)}
                      </TableCell>
                      <TableCell>
                        <form action={changeUserRoleForm} className="flex items-center gap-1.5">
                          <input type="hidden" name="userId" value={p.id} />
                          {/* Select natif : Server Action FormData. */}
                          <select
                            name="role"
                            defaultValue={p.role}
                            className={cn(nativeFieldClass, 'h-8 w-28 text-xs')}
                          >
                            <option value="client">client</option>
                            <option value="admin">admin</option>
                          </select>
                          <Button type="submit" variant="outline" size="sm">
                            OK
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
