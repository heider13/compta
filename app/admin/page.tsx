import Link from 'next/link';
import { ArrowRight, Building2, ClipboardCheck, FileCheck2, Wrench } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/cabinet/StatusBadge';
import { formatDateFr } from '@/lib/types';
import { PageHeader, EmptyState } from '@/components/admin/bits';
import { Button } from '@/components/ui/button';
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

const INPI_STATUSES = [
  'RECEIVED',
  'VALIDATION_PENDING',
  'VALIDATED',
  'AMENDMENT_PENDING',
];

interface RecentDossierRow {
  id: string;
  reference: string | null;
  client_name: string;
  type_formalite: string;
  statut: string;
  created_at: string;
  updated_at: string | null;
  organizations: { name: string } | null;
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    { count: cabinetsCount },
    { count: awaitingCount },
    { count: amendmentCount },
    { count: inpiCount },
    { data: recent },
  ] = await Promise.all([
    supabase.from('organizations').select('id', { count: 'exact', head: true }),
    supabase
      .from('dossiers')
      .select('id', { count: 'exact', head: true })
      .eq('statut', 'AWAITING_VALIDATION'),
    supabase
      .from('dossiers')
      .select('id', { count: 'exact', head: true })
      .eq('statut', 'INTERNAL_AMENDMENT_PENDING'),
    supabase
      .from('dossiers')
      .select('id', { count: 'exact', head: true })
      .in('statut', INPI_STATUSES),
    supabase
      .from('dossiers')
      .select(
        'id, reference, client_name, type_formalite, statut, created_at, updated_at, organizations(name)',
      )
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const recentRows = (recent ?? []) as unknown as RecentDossierRow[];

  const kpis = [
    {
      label: 'Cabinets actifs',
      value: cabinetsCount ?? 0,
      icon: Building2,
      href: '/admin/cabinets',
      iconClass: 'text-primary bg-accent',
    },
    {
      label: 'Dossiers à valider',
      value: awaitingCount ?? 0,
      icon: ClipboardCheck,
      href: '/admin/queue',
      iconClass: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'En correction',
      value: amendmentCount ?? 0,
      icon: Wrench,
      href: '/admin/queue',
      iconClass: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Formalités déposées',
      value: inpiCount ?? 0,
      icon: FileCheck2,
      href: '/admin/dossiers',
      iconClass: 'text-green-600 bg-green-50',
    },
  ];

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        subtitle="Activité globale de la plateforme — tous cabinets confondus."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Link key={kpi.label} href={kpi.href} className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardContent className="flex items-start justify-between gap-3 pt-5">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-3xl font-semibold tracking-tight">{kpi.value}</p>
                </div>
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-lg ${kpi.iconClass}`}
                >
                  <kpi.icon className="size-5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Activité récente</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/dossiers">
              Voir tout
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentRows.length === 0 ? (
            <EmptyState label="Aucun dossier pour l'instant." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Cabinet</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Mis à jour</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRows.map((d) => (
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
                    <TableCell>{d.type_formalite}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatDateFr(d.updated_at ?? d.created_at)}
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
