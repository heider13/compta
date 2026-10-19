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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { StatCard, StatStrip } from '@/components/cabinet/dashboard/StatCard';
import { PageHeader, PageShell } from '@/components/cabinet/PageHeader';
import { EmptyState } from '@/components/cabinet/EmptyState';
import { BarChart } from '@/components/cabinet/dashboard/BarChart';
import { FormalityAgent } from '@/components/cabinet/dashboard/FormalityAgent';

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

  const monthStart = startOfCurrentMonthIso();

  // Tâches à traiter (assigned_to = moi OU non assignée)
  let tasksQuery = supabase
    .from('dossier_tasks')
    .select('id, title, due_date, assigned_to, dossier_id, done, dossiers(id, reference, client_name)')
    .eq('done', false)
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(5);
  if (user) tasksQuery = tasksQuery.or(`assigned_to.eq.${user.id},assigned_to.is.null`);

  // Toutes les lectures en parallèle : profil, compteurs (count head : pas de payload),
  // dossiers récents, tâches et statut INPI
  const [
    profileRes,
    recentRes,
    tasksRes,
    inpiStatus,
    awaitingValidationRes,
    inProgressRes,
    clientsRes,
    validatedMonthRes,
    creationRes,
    modificationRes,
    radiationRes,
    validatedTotalRes,
  ] = await Promise.all([
    user ? supabase.from('profiles').select('first_name').eq('id', user.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase
      .from('dossiers')
      .select('id, reference, client_name, type_formalite, statut, updated_at, created_at')
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(5),
    tasksQuery,
    getInpiCredentialsStatus(),
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

  // Profil pour l'accueil "Bonjour {prénom}"
  const firstName =
    ((profileRes.data as { first_name?: string | null } | null)?.first_name ?? null) ??
    ((user?.user_metadata?.first_name as string | undefined) ?? null);
  const awaitingValidation = awaitingValidationRes.count ?? 0;
  const inProgress = inProgressRes.count ?? 0;
  const clientsCount = clientsRes.count ?? 0;
  const validatedMonth = validatedMonthRes.count ?? 0;
  const validatedTotal = validatedTotalRes.count ?? 0;

  const kpis = [
    { label: 'À valider', value: awaitingValidation, hint: 'Attendent votre validation', icon: ClipboardCheck, href: '/dossiers', highlight: true },
    { label: 'En cours', value: inProgress, hint: 'Tous statuts actifs', icon: FolderOpen, href: '/dossiers' },
    { label: 'Clients', value: clientsCount, hint: 'Entreprises suivies', icon: Users, href: '/clients' },
    { label: 'Validés ce mois', value: validatedMonth, hint: "Acceptés par l'INPI", icon: CheckCircle2, href: null },
  ];

  // Répartition des formalités par type (données réelles)
  const formaliteBars = [
    { label: 'Création', value: creationRes.count ?? 0, colorClass: 'bg-chart-1' },
    { label: 'Modification', value: modificationRes.count ?? 0, colorClass: 'bg-chart-2' },
    { label: 'Radiation', value: radiationRes.count ?? 0, colorClass: 'bg-chart-4' },
  ];

  // Avancement : validés vs en cours (données réelles)
  const avancementTotal = validatedTotal + inProgress;
  const avancementPct =
    avancementTotal > 0 ? Math.round((validatedTotal / avancementTotal) * 100) : 0;

  const recentDossiers = (recentRes.data ?? []) as RecentDossier[];
  const tasks = (tasksRes.data ?? []) as unknown as TaskRow[];

  const greetingName = firstName ?? '';
  const inpiNotConfigured = !inpiStatus || !inpiStatus.configured;

  return (
    <PageShell>
      <PageHeader
        eyebrow={todayLabel()}
        title={`Bonjour${greetingName ? ` ${greetingName}` : ''}`}
        description="Décrivez une opération à l'agent, ou reprenez un dossier là où vous l'avez laissé."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/dossiers">
                <FolderOpen className="size-4" />
                Formalités
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/dossiers/new">
                <Plus className="size-4" />
                Nouvelle formalité
              </Link>
            </Button>
          </>
        }
      />

      {inpiNotConfigured && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3">
          <AlertTriangle className="size-4 shrink-0 text-warning" />
          <p className="min-w-56 flex-1 text-sm">
            <span className="font-medium">Connectez votre compte INPI</span>
            <span className="text-muted-foreground"> : vos identifiants du Guichet unique sont nécessaires pour déposer les formalités.</span>
          </p>
          <Button asChild size="sm" variant="outline" className="shrink-0 bg-background">
            <Link href="/settings/inpi?next=/dashboard">
              Configurer
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      )}

      <StatStrip>
        {kpis.map((kpi) => (
          <StatCard key={kpi.label} {...kpi} />
        ))}
      </StatStrip>

      <FormalityAgent />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Dossiers récents */}
        <Card className="min-w-0 gap-0 py-0 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2 border-b px-5 py-4 [.border-b]:pb-4">
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-sm">Dossiers récents</CardTitle>
              <CardDescription className="text-xs">Dernières formalités mises à jour</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
              <Link href="/dossiers">
                Tout voir
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentDossiers.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="Aucun dossier pour l'instant"
                description="Décrivez votre première opération à l'agent ci-dessus."
              />
            ) : (
              <ul className="divide-y">
                {recentDossiers.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/dossiers/${d.id}`}
                      className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-md border bg-background text-[11px] font-semibold text-muted-foreground">
                        {d.client_name.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{d.client_name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {typeFormaliteLabel(d.type_formalite)}
                          {d.reference && <span className="font-mono"> · {d.reference}</span>}
                        </span>
                      </span>
                      <StatusBadge statut={d.statut} />
                      <span className="hidden w-20 shrink-0 text-right font-mono text-[11px] text-muted-foreground sm:block">
                        {formatRelative(d.updated_at ?? d.created_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="grid min-w-0 content-start gap-6">
          {/* Tâches */}
          <Card className="min-w-0 gap-0 py-0">
            <CardHeader className="flex flex-row items-center justify-between gap-2 border-b px-5 py-4 [.border-b]:pb-4">
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-sm">Tâches</CardTitle>
                <CardDescription className="text-xs">Les vôtres et les non assignées</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
                <Link href="/tasks">
                  Tout voir
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-2">
              {tasks.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="Rien à traiter" description="Aucune tâche en attente." compact />
              ) : (
                tasks.map((t) => {
                  const dossier = t.dossiers;
                  return (
                    <Link
                      key={t.id}
                      href={dossier ? `/dossiers/${dossier.id}` : '/tasks'}
                      className="flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <span className="mt-0.5 size-4 shrink-0 rounded-full border-2 border-muted-foreground/30" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{t.title}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
                          {dossier && <span className="truncate">{dossier.reference ?? dossier.client_name}</span>}
                          {t.due_date && (
                            <span className="inline-flex items-center gap-1 text-warning">
                              <CalendarClock className="size-3" />
                              {formatDate(t.due_date)}
                            </span>
                          )}
                        </span>
                      </span>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Activité */}
          <Card className="min-w-0 gap-0 py-0">
            <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4">
              <CardTitle className="text-sm">Activité du cabinet</CardTitle>
              <CardDescription className="text-xs">Tous dossiers confondus</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <div className="space-y-2">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-muted-foreground">Taux de validation</span>
                  <span className="font-mono font-semibold tabular-nums">{avancementPct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={avancementPct} aria-valuemin={0} aria-valuemax={100} aria-label="Taux de validation">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-chart-2" style={{ width: `${avancementPct}%` }} />
                </div>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {validatedTotal} validés · {inProgress} en cours
                </p>
              </div>
              <BarChart items={formaliteBars} />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
