import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatDateFr, formatSiren } from '@/lib/types';
import { PageHeader, EmptyState, ErrorNote } from '@/components/admin/bits';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  siren: string | null;
  plan: string | null;
  created_at: string;
  memberships: { id: string }[] | null;
  dossiers: { id: string }[] | null;
}

export default async function AdminCabinetsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organizations')
    .select(
      'id, name, slug, siren, plan, created_at, memberships(id), dossiers(id)',
    )
    .order('created_at', { ascending: false });

  const rows = (data ?? []) as unknown as OrgRow[];

  return (
    <>
      <PageHeader
        title="Cabinets"
        subtitle={`${rows.length} cabinet${rows.length > 1 ? 's' : ''} inscrits sur la plateforme.`}
      />

      {error && <ErrorNote message={error.message} />}

      <Card>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState label="Aucun cabinet pour l'instant." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>SIREN</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Membres</TableHead>
                  <TableHead className="text-right">Dossiers</TableHead>
                  <TableHead>Inscrit le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">
                      <Link href={`/admin/cabinets/${o.id}`} className="hover:underline">
                        {o.name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {o.slug}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{formatSiren(o.siren)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{o.plan ?? 'cabinet'}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {o.memberships?.length ?? 0}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {o.dossiers?.length ?? 0}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatDateFr(o.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
