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
import { StatCard } from '@/components/cabinet/dashboard/StatCard';
import { BarChart } from '@/components/cabinet/dashboard/BarChart';
import { Donut } from '@/components/cabinet/dashboard/Donut';
import { InsightsCard } from '@/components/cabinet/dashboard/InsightsCard';

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

function todayLabel(): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date());
  } catch {
    return '';
  }
}

export default async function CabinetDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Profil pour l'accueil "Bonjour {prénom}"
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

  // KPI counts + répartition par type (count: 'exact', head: true) — pas de payload
  const [
    awaitingValidationRes,
    inProgressRes,
    clientsRes,
    validatedMonthRes,
    creationRes,
    modificationRes,
    radiationRes,
    validatedTotalRes,
  ] = await Promise.all([
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
    supabase
      .from('dossiers')
      .select('id', { count: 'exact', head: true })
      .eq('type_formalite', 'CREATION'),
    supabase
      .from('dossiers')
      .select('id', { count: 'exact', head: true })
      .eq('type_formalite', 'MODIFICATION'),
    supabase
      .from('dossiers')
      .select('id', { count: 'exact', head: true })
      .eq('type_formalite', 'RADIATION'),
    supabase
      .from('dossiers')
      .select('id', { count: 'exact', head: true })
      .eq('statut', 'VALIDATED'),
  ]);

  const awaitingValidation = awaitingValidationRes.count ?? 0;
  const inProgress = inProgressRes.count ?? 0;
  const clientsCount = clientsRes.count ?? 0;
  const validatedMonth = validatedMonthRes.count ?? 0;
  const validatedTotal = validatedTotalRes.count ?? 0;

  const kpis = [
    {
      label: 'Dossiers à valider',
      value: awaitingValidation,
      hint: 'En attente de votre validation',
      icon: ClipboardCheck,
      href: '/dossiers',
      tileClass: 'text-[#ff887b] bg-[#fff3f1]',
    },
    {
      label: 'En cours',
      value: inProgress,
      hint: 'Tous statuts actifs',
      icon: FolderOpen,
      href: '/dossiers',
      tileClass: 'text-primary bg-[#ede7ff]',
    },
    {
      label: 'Clients',
      value: clientsCount,
      hint: 'Entreprises gérées',
      icon: Users,
      href: '/clients',
      tileClass: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Validés ce mois',
      value: validatedMonth,
      hint: 'Formalités acceptées INPI',
      icon: CheckCircle2,
      href: null,
      tileClass: 'text-[#7551e8] bg-[#f3f1fa]',
    },
  ];

  // Répartition des formalités par type (données réelles)
  const formaliteBars = [
    { label: 'Création', value: creationRes.count ?? 0, colorClass: 'bg-[#5b36d6]' },
    { label: 'Modification', value: modificationRes.count ?? 0, colorClass: 'bg-[#957af5]' },
    { label: 'Radiation', value: radiationRes.count ?? 0, colorClass: 'bg-[#ff887b]' },
  ];

  // Avancement : validés vs en cours (données réelles)
  const avancementTotal = validatedTotal + inProgress;
  const avancementPct =
    avancementTotal > 0 ? Math.round((validatedTotal / avancementTotal) * 100) : 0;

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
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1>Bonjour {greetingName ? `${greetingName} ` : ''}👋</h1>
          <p className="mt-1 text-sm text-muted-foreground first-letter:uppercase">
            {todayLabel()} · Voici l&apos;activité de votre cabinet.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/dossiers/new">
            <Plus className="size-4" />
            Nouveau dossier
          </Link>
        </Button>
      </div>

      {/* Bandeau INPI */}
      {inpiNotConfigured && (
        <Card className="gap-0 border-amber-300 bg-amber-50 py-0">
          <CardContent className="flex flex-wrap items-center gap-4 p-4">
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

      {/* KPI row */}
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="min-w-0">
            <StatCard
              label={kpi.label}
              value={kpi.value}
              hint={kpi.hint}
              icon={kpi.icon}
              href={kpi.href}
              tileClass={kpi.tileClass}
            />
          </div>
        ))}
      </div>

      {/* Bento grid */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Répartition des formalités */}
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Répartition des formalités</CardTitle>
            <CardDescription>Par type, tous dossiers confondus</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart items={formaliteBars} />
          </CardContent>
        </Card>

        {/* Donut — Avancement */}
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Avancement</CardTitle>
            <CardDescription>Validés vs en cours</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Donut
              value={validatedTotal}
              total={avancementTotal}
              centerText={`${avancementPct}%`}
              centerSub="validés"
            />
            <div className="flex items-center justify-center gap-5 text-sm">
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#5b36d6]" />
                <span className="text-muted-foreground">Validés</span>
                <span className="font-semibold tabular-nums">{validatedTotal}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#ede7ff]" />
                <span className="text-muted-foreground">En cours</span>
                <span className="font-semibold tabular-nums">{inProgress}</span>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Insights IA */}
        <div className="min-w-0">
          <InsightsCard awaitingValidation={awaitingValidation} inProgress={inProgress} />
        </div>

        {/* Dossiers récents */}
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="min-w-0">
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
              <ul className="divide-y divide-border">
                {recentDossiers.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/dossiers/${d.id}`}
                      className="flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-[#f5f3fb]"
                    >
                      <span className="hidden shrink-0 font-mono text-xs text-muted-foreground sm:block sm:w-24">
                        {d.reference ?? '—'}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-foreground">
                          {d.client_name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {typeFormaliteLabel(d.type_formalite)}
                        </span>
                      </span>
                      <span className="shrink-0">
                        <StatusBadge statut={d.statut} />
                      </span>
                      <span className="hidden shrink-0 text-right text-xs text-muted-foreground sm:block sm:w-20">
                        {formatRelative(d.updated_at ?? d.created_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Tâches à traiter */}
        <Card className="min-w-0">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="min-w-0">
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
                Aucune tâche. Bon travail !
              </p>
            ) : (
              tasks.map((t) => {
                const dossier = t.dossiers;
                return (
                  <Link
                    key={t.id}
                    href={dossier ? `/dossiers/${dossier.id}` : '/tasks'}
                    className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-[#f5f3fb]"
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
