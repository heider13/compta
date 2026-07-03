import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, EmptyState, ErrorNote } from '@/components/admin/bits';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

interface AuditRow {
  id: string;
  created_at: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  organization_id: string | null;
  metadata: Record<string, unknown> | null;
  organizations: { name: string } | null;
}

interface AuditProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface SearchParams {
  org?: string;
  user?: string;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('audit_logs')
    .select(
      'id, created_at, user_id, action, resource_type, resource_id, organization_id, metadata, organizations(name)',
    )
    .order('created_at', { ascending: false })
    .limit(100);

  if (sp.org) query = query.eq('organization_id', sp.org);
  if (sp.user) query = query.eq('user_id', sp.user);

  const { data, error } = await query;
  const rows = (data ?? []) as unknown as AuditRow[];

  // Lookup profiles séparément
  const userIds = Array.from(
    new Set(rows.map((r) => r.user_id).filter((id): id is string => !!id)),
  );
  const profileById = new Map<string, AuditProfile>();
  if (userIds.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', userIds);
    for (const p of (profs ?? []) as AuditProfile[]) {
      profileById.set(p.id, p);
    }
  }

  return (
    <>
      <PageHeader
        title="Audit logs"
        subtitle={`${rows.length} évènement${rows.length > 1 ? 's' : ''} récent${rows.length > 1 ? 's' : ''}.`}
      />

      {error && <ErrorNote message={error.message} />}

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="min-w-60 space-y-1.5">
          <Label htmlFor="filter-org">Filtrer par organization_id</Label>
          <Input id="filter-org" name="org" defaultValue={sp.org ?? ''} placeholder="UUID" />
        </div>
        <div className="min-w-60 space-y-1.5">
          <Label htmlFor="filter-user">Filtrer par user_id</Label>
          <Input id="filter-user" name="user" defaultValue={sp.user ?? ''} placeholder="UUID" />
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm">
            Filtrer
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/audit">Reset</Link>
          </Button>
        </div>
      </form>

      <Card>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState label="Aucun évènement d'audit." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quand</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Cabinet</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Détails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const prof = r.user_id ? profileById.get(r.user_id) : undefined;
                  const fullName = [prof?.first_name, prof?.last_name]
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        {fullName ||
                          (r.user_id ? (
                            <span className="font-mono text-xs">{r.user_id.slice(0, 8)}</span>
                          ) : (
                            '—'
                          ))}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.organizations?.name ?? '—'}
                      </TableCell>
                      <TableCell className="font-medium">{r.action}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.resource_type ?? '—'}
                        {r.resource_id && (
                          <span className="ml-1 font-mono text-[10px]">
                            {r.resource_id.slice(0, 8)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.metadata ? (
                          <details>
                            <summary className="cursor-pointer text-xs font-medium text-primary">
                              Voir
                            </summary>
                            <pre className="mt-1 max-h-48 max-w-64 overflow-auto rounded-md bg-muted p-2 text-[10px]">
                              {JSON.stringify(r.metadata, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          '—'
                        )}
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
