import Link from 'next/link';
import { Plus, Building2, ArrowRight, Users, CalendarPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import {
  formatDateFr,
  formatSiren,
  getInitials,
  type Client,
} from '@/lib/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatCard, StatStrip } from '@/components/cabinet/StatStrip';
import { PageHeader, PageShell } from '@/components/cabinet/PageHeader';
import { EmptyState } from '@/components/cabinet/EmptyState';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clients')
    .select(
      'id, denomination, siren, forme_juridique, archived_at, source, created_at',
    )
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  const clients = (data ?? []) as Pick<
    Client,
    | 'id'
    | 'denomination'
    | 'siren'
    | 'forme_juridique'
    | 'archived_at'
    | 'source'
    | 'created_at'
  >[];

  // Stats réelles dérivées des clients chargés
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const addedThisMonth = clients.filter((c) => {
    if (!c.created_at) return false;
    const t = new Date(c.created_at).getTime();
    return !Number.isNaN(t) && t >= monthStart;
  }).length;
  const distinctFormes = new Set(
    clients.map((c) => c.forme_juridique).filter(Boolean),
  ).size;
  const withSiren = clients.filter((c) => !!c.siren).length;

  const stats = [
    {
      label: 'Entreprises gérées',
      value: clients.length,
      hint: 'Clients actifs',
      icon: Users,
      href: null,
    },
    {
      label: 'Ajoutées ce mois',
      value: addedThisMonth,
      hint: 'Nouveaux clients',
      icon: CalendarPlus,
      href: null,
    },
    {
      label: 'Formes juridiques',
      value: distinctFormes,
      hint: 'Types représentés',
      icon: Building2,
      href: null,
    },
    {
      label: 'Immatriculées',
      value: withSiren,
      hint: 'Avec un SIREN connu',
      icon: Building2,
      href: null,
    },
  ];

  return (
    <PageShell>
      <PageHeader
        eyebrow="Portefeuille"
        title="Clients"
        description={
          <>
            <span className="font-mono tabular-nums">{clients.length}</span>{' '}
            {clients.length > 1 ? 'entreprises gérées' : 'entreprise gérée'}
          </>
        }
        actions={
          <Button asChild size="sm">
            <Link href="/clients/new">
              <Plus className="size-4" />
              Nouveau client
            </Link>
          </Button>
        }
      />

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          Erreur de chargement : {error.message}
        </div>
      )}

      {clients.length > 0 && (
        <StatStrip>
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </StatStrip>
      )}

      <Card className="gap-0 py-0">
        <CardContent className="p-0">
          {clients.length === 0 && !error ? (
            <EmptyState
              icon={Building2}
              title="Aucun client pour l'instant"
              description="Commencez par enregistrer votre première entreprise à partir de son SIREN."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/clients/new">
                    <Plus className="size-4" />
                    Nouveau client
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14" />
                    <TableHead className="text-xs">Dénomination</TableHead>
                    <TableHead className="text-xs">SIREN</TableHead>
                    <TableHead className="text-xs">Forme</TableHead>
                    <TableHead className="text-xs">Ajouté le</TableHead>
                    <TableHead className="w-12 text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((c) => (
                    <TableRow
                      key={c.id}
                      className="group relative transition-colors hover:bg-muted/50"
                    >
                      <TableCell className="pl-4">
                        <Avatar className="size-8 rounded-md">
                          <AvatarFallback className="rounded-md border bg-background text-[11px] font-semibold text-muted-foreground">
                            {getInitials(c.denomination)}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="max-w-64 font-medium">
                        <Link
                          href={`/clients/${c.id}`}
                          className="block truncate after:absolute after:inset-0 focus-visible:outline-none"
                        >
                          {c.denomination}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                        {formatSiren(c.siren)}
                      </TableCell>
                      <TableCell>
                        {c.forme_juridique ? (
                          <Badge variant="outline" className="font-normal">
                            {c.forme_juridique}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                        {formatDateFr(c.created_at)}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <ArrowRight
                          className="ml-auto size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                          aria-hidden="true"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
