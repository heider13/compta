import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/cabinet/StatusBadge';
import { formatDateFr, FORMES_JURIDIQUES } from '@/lib/types';
import { PageHeader, EmptyState, ErrorNote, nativeFieldClass } from '@/components/admin/bits';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

interface DossierRow {
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

const STATUSES = [
  'DRAFT',
  'AWAITING_VALIDATION',
  'INTERNAL_AMENDMENT_PENDING',
  'VALIDATED_INTERNAL',
  'RECEIVED',
  'VALIDATION_PENDING',
  'AMENDMENT_PENDING',
  'PAYMENT_PENDING',
  'SIGNATURE_PENDING',
  'VALIDATED',
  'REJECTED',
];

const TYPES = ['CREATION', 'MODIFICATION', 'RADIATION'];

interface SearchParams {
  statut?: string;
  type?: string;
  forme?: string;
}

export default async function AdminDossiersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('dossiers')
    .select(
      'id, reference, client_name, type_formalite, forme_juridique, statut, created_at, updated_at, organizations(name)',
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (sp.statut) query = query.eq('statut', sp.statut);
  if (sp.type) query = query.eq('type_formalite', sp.type);
  if (sp.forme) query = query.eq('forme_juridique', sp.forme);

  const { data, error } = await query;
  const rows = (data ?? []) as unknown as DossierRow[];

  return (
    <>
      <PageHeader
        title="Tous les dossiers"
        subtitle={`${rows.length} résultat${rows.length > 1 ? 's' : ''} — tous cabinets.`}
      />

      {error && <ErrorNote message={error.message} />}

      <form method="get" className="flex flex-wrap items-end gap-3">
        <Filter name="statut" label="Statut" current={sp.statut} options={STATUSES} />
        <Filter name="type" label="Type" current={sp.type} options={TYPES} />
        <Filter
          name="forme"
          label="Forme juridique"
          current={sp.forme}
          options={[...FORMES_JURIDIQUES]}
        />
        <div className="flex gap-2">
          <Button type="submit" size="sm">
            Appliquer
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/dossiers">Réinitialiser</Link>
          </Button>
        </div>
      </form>

      <Card>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState label="Aucun dossier ne correspond." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Cabinet</TableHead>
                  <TableHead>Forme</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Créé</TableHead>
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
    </>
  );
}

function Filter({
  name,
  label,
  current,
  options,
}: {
  name: string;
  label: string;
  current?: string;
  options: string[];
}) {
  return (
    <div className="min-w-44 space-y-1.5">
      <Label htmlFor={`filter-${name}`}>{label}</Label>
      {/* Select natif : formulaire GET classique. */}
      <select id={`filter-${name}`} name={name} defaultValue={current ?? ''} className={nativeFieldClass}>
        <option value="">— Tous —</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
