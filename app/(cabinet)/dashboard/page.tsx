import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FolderOpen,
  Plus,
  Users,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getInpiCredentialsStatus } from '@/lib/server-actions/inpi-credentials';
import { formatDate, formatRelative, typeFormaliteLabel } from '@/lib/utils/format';
import { StatusBadge } from '@/components/cabinet/StatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

const IN_PROGRESS_STATUSES = [
  'DRAFT',
  'AWAITING_VALIDATION',
  'INTERNAL_AMENDMENT_PENDING',
  'RECEIVED',
  'VALIDATION_PENDING',
];

interface RecentDossier {
  id: string;
  reference: string | null;
  client_name: string;
  type_formalite: string;
  statut: string;
  updated_at: string | null;
  created_at: string | null;
}

interface TaskRow {
  id: string;
  title: string;
  due_date: string | null;
  assigned_to: string | null;
  dossier_id: string;
  done: boolean;
  dossiers: { id: string; reference: string | null; client_name: string } | null;
}

function startOfCurrentMonthIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export default async function CabinetDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Profil pour l'accueil "Bienvenue {prénom}"
  let firstName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name')
      .eq('id', user.id)
      .maybeSingle();
    firstName =
      (profile?.first_name as string | null | undefined) ??
      ((user.user_metadata?.first_name as string | undefined) ?? null);
  }

  const monthStart = startOfCurrentMonthIso();

  // KPI counts (count: 'exact', head: true) — pas de payload
  const [awaitingValidationRes, inProgressRes, clientsRes, validatedMonthRes] =
    await Promise.all([
      supabase
        .from('dossiers')
        .select('id', { count: 'exact', head: true })
        .eq('statut', 'AWAITING_VALIDATION'),
      supabase
        .from('dossiers')
        .select('id', { count: 'exact', head: true })
        .in('statut', IN_PROGRESS_STATUSES),
      supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .is('archived_at', null),
      supabase
        .from('dossiers')
        .select('id', { count: 'exact', head: true })
        .eq('statut', 'VALIDATED')
        .gte('updated_at', monthStart),
    ]);

  const kpis = [
    {
      label: 'Dossiers à valider',
      value: awaitingValidationRes.count ?? 0,
      hint: 'En attente de votre validation',
      icon: ClipboardCheck,
      href: '/dossiers',
      iconClass: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'En cours',
      value: inProgressRes.count ?? 0,
      hint: 'Tous statuts actifs',
      icon: FolderOpen,
      href: '/dossiers',
      iconClass: 'text-primary bg-accent',
    },
    {
      label: 'Clients',
      value: clientsRes.count ?? 0,
      hint: 'Entreprises gérées',
      icon: Users,
      href: '/clients',
      iconClass: 'text-muted-foreground bg-muted',
    },
    {
      label: 'Validés ce mois',
      value: validatedMonthRes.count ?? 0,
      hint: 'Formalités acceptées INPI',
      icon: CheckCircle2,
      href: null,
      iconClass: 'text-green-600 bg-green-50',
    },
  ];

  // Dossiers récents (5 derniers)
  const { data: recentData } = await supabase
    .from('dossiers')
    .select('id, reference, client_name, type_formalite, statut, updated_at, created_at')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(5);

  const recentDossiers = (recentData ?? []) as RecentDossier[];

  // Tâches à traiter
  let tasksQuery = supabase
    .from('dossier_tasks')
    .select('id, title, due_date, assigned_to, dossier_id, done, dossiers(id, reference, client_name)')
    .eq('done', false)
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(5);

  if (user) {
    // assigned_to = moi OU non assignée
    tasksQuery = tasksQuery.or(`assigned_to.eq.${user.id},assigned_to.is.null`);
  }

  const { data: tasksData } = await tasksQuery;
  const tasks = (tasksData ?? []) as unknown as TaskRow[];

  const greetingName = firstName ?? '';
  const inpiStatus = await getInpiCredentialsStatus();
  const inpiNotConfigured = !inpiStatus || !inpiStatus.configured;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      {inpiNotConfigured && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex flex-wrap items-center gap-4 py-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-amber-400/80 text-amber-950">
              <AlertTriangle className="size-5" />
            </span>
            <div className="min-w-56 flex-1">
              <p className="text-sm font-semibold text-amber-900">
                Connectez votre compte INPI pour démarrer
              </p>
              <p className="text-sm text-amber-800/80">
                Vos identifiants du Guichet Unique sont nécessaires pour déposer les
                formalités au registre.
              </p>
            </div>
            <Button asChild size="sm" className="shrink-0">
              <Link href="/settings/inpi?next=/dashboard">
                Configurer maintenant
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">
            Bienvenue{greetingName ? ` ${greetingName}` : ''}. Voici l&apos;activité de
            votre cabinet.
          </p>
        </div>
        <Button asChild>
          <Link href="/dossiers/new">
            <Plus className="size-4" />
            Nouveau dossier
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
        {kpis.map((kpi) => {
          const inner = (
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="flex items-start justify-between gap-3 pt-5">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-3xl font-semibold tracking-tight">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.hint}</p>
                </div>
                <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${kpi.iconClass}`}>
                  <kpi.icon className="size-5" />
                </span>
              </CardContent>
            </Card>
          );
          return kpi.href ? (
            <Link key={kpi.label} href={kpi.href} className="block">
              {inner}
            </Link>
          ) : (
            <div key={kpi.label}>{inner}</div>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Dossiers récents */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Dossiers récents</CardTitle>
              <CardDescription>Les 5 dernières formalités mises à jour</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dossiers">
                Voir tout
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentDossiers.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Aucun dossier pour l&apos;instant.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Référence</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="hidden md:table-cell">Type</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Maj</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentDossiers.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        <Link href={`/dossiers/${d.id}`} className="hover:underline">
                          {d.reference ?? '—'}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-40 truncate font-medium">
                        <Link href={`/dossiers/${d.id}`} className="hover:underline">
                          {d.client_name}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {typeFormaliteLabel(d.type_formalite)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge statut={d.statut} />
                      </TableCell>
                      <TableCell className="hidden text-right text-xs text-muted-foreground sm:table-cell">
                        {formatRelative(d.updated_at ?? d.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Tâches à traiter */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Tâches à traiter</CardTitle>
              <CardDescription>Les vôtres et les non assignées</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/tasks">
                Voir tout
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {tasks.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Aucune tâche à traiter. Bon travail !
              </p>
            ) : (
              tasks.map((t) => {
                const dossier = t.dossiers;
                return (
                  <Link
                    key={t.id}
                    href={dossier ? `/dossiers/${dossier.id}` : '/tasks'}
                    className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted"
                  >
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-border" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{t.title}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-2">
                        {dossier && (
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {dossier.reference ?? dossier.client_name}
                          </span>
                        )}
                        {t.due_date && (
                          <Badge
                            variant="outline"
                            className="gap-1 border-amber-200 bg-amber-50 px-1.5 py-0 text-[10px] text-amber-700"
                          >
                            <CalendarClock className="size-3" />
                            {formatDate(t.due_date)}
                          </Badge>
                        )}
                      </span>
                    </span>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
