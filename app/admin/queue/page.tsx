import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/cabinet/StatusBadge';
import { formatDateFr } from '@/lib/types';
import { PageHeader, EmptyState, ErrorNote } from '@/components/admin/bits';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

interface QueueRow {
  id: string;
  reference: string | null;
  client_name: string;
  type_formalite: string;
  forme_juridique: string | null;
  statut: string;
  created_at: string;
  updated_at: string | null;
  organizations: { name: string } | null;
}

export default async function AdminQueuePage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('dossiers')
    .select(
      'id, reference, client_name, type_formalite, forme_juridique, statut, created_at, updated_at, organizations(name)',
    )
    .in('statut', ['AWAITING_VALIDATION', 'INTERNAL_AMENDMENT_PENDING'])
    .order('created_at', { ascending: true });

  const rows = (data ?? []) as unknown as QueueRow[];
  const awaiting = rows.filter((r) => r.statut === 'AWAITING_VALIDATION');
  const amendment = rows.filter((r) => r.statut === 'INTERNAL_AMENDMENT_PENDING');

  return (
    <>
      <PageHeader
        title="À valider"
        subtitle={`${awaiting.length} dossier${awaiting.length > 1 ? 's' : ''} en attente · ${amendment.length} en correction.`}
      />

      {error && <ErrorNote message={error.message} />}

      <QueueSection
        title={`En attente de validation (${awaiting.length})`}
        rows={awaiting}
        emptyLabel="Aucun dossier en attente."
      />

      <QueueSection
        title={`En correction (${amendment.length})`}
        rows={amendment}
        emptyLabel="Aucun dossier en correction."
      />
    </>
  );
}

function QueueSection({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: QueueRow[];
  emptyLabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState label={emptyLabel} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Cabinet</TableHead>
                <TableHead>Forme</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Soumis</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    <Link href={`/admin/dossiers/${d.id}`} className="hover:underline">
                      {d.reference ?? d.id.slice(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/admin/dossiers/${d.id}`} className="hover:underline">
                      {d.client_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {d.organizations?.name ?? '—'}
                  </TableCell>
                  <TableCell className="text-xs">{d.forme_juridique ?? '—'}</TableCell>
                  <TableCell>{d.type_formalite}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {formatDateFr(d.created_at)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge statut={d.statut} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
