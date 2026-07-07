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
import { StatCard } from '@/components/cabinet/dashboard/StatCard';

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

  const stats = [
    {
      label: 'Entreprises gérées',
      value: clients.length,
      hint: 'Clients actifs',
      icon: Users,
      href: null,
      tileClass: 'text-primary bg-[#ede7ff]',
    },
    {
      label: 'Ajoutées ce mois',
      value: addedThisMonth,
      hint: 'Nouveaux clients',
      icon: CalendarPlus,
      href: null,
      tileClass: 'text-[#7551e8] bg-[#f3f1fa]',
    },
    {
      label: 'Formes juridiques',
      value: distinctFormes,
      hint: 'Types représentés',
      icon: Building2,
      href: null,
      tileClass: 'text-[#ff887b] bg-[#fff3f1]',
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1>Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {clients.length}{' '}
            {clients.length > 1 ? 'entreprises gérées' : 'entreprise gérée'}
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/clients/new">
            <Plus className="size-4" />
            Nouveau client
          </Link>
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          Erreur de chargement : {error.message}
        </div>
      )}

      {/* Stat row */}
      {clients.length > 0 && (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
          {stats.map((s) => (
            <div key={s.label} className="min-w-0">
              <StatCard
                label={s.label}
                value={s.value}
                hint={s.hint}
                icon={s.icon}
                href={s.href}
                tileClass={s.tileClass}
              />
            </div>
          ))}
        </div>
      )}

      {/* Liste des clients */}
      <Card className="py-0">
        <CardContent className="px-0">
          {clients.length === 0 && !error ? (
            <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
              <div className="grid size-12 place-items-center rounded-full bg-accent text-primary">
                <Building2 className="size-6" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">Aucun client pour l&apos;instant</p>
                <p className="text-sm text-muted-foreground">
                  Commencez par enregistrer votre première entreprise.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href="/clients/new">
                  <Plus className="size-4" />
                  Nouveau client
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14" />
                  <TableHead>Dénomination</TableHead>
                  <TableHead>SIREN</TableHead>
                  <TableHead>Forme</TableHead>
                  <TableHead>Ajouté le</TableHead>
                  <TableHead className="w-24 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow
                    key={c.id}
                    className="group relative transition-colors hover:bg-[#f5f3fb]"
                  >
                    <TableCell className="pl-4">
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-accent text-xs font-semibold text-primary">
                          {getInitials(c.denomination)}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="max-w-64 font-medium">
                      <Link
                        href={`/clients/${c.id}`}
                        className="block truncate after:absolute after:inset-0"
                      >
                        {c.denomination}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatSiren(c.siren)}
                    </TableCell>
                    <TableCell>
                      {c.forme_juridique ? (
                        <Badge variant="secondary">{c.forme_juridique}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateFr(c.created_at)}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <ArrowRight
                        className="ml-auto size-4 text-primary opacity-0 transition-opacity group-hover:opacity-100"
                        aria-hidden="true"
                      />
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
