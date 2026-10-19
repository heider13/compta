import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { AlertTriangle, CalendarClock, Check, CheckCircle2, ClipboardList, ListTodo } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils/format';
import { getInitials } from '@/lib/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard, StatStrip } from '@/components/cabinet/dashboard/StatCard';
import { PageHeader, PageShell } from '@/components/cabinet/PageHeader';
import { EmptyState } from '@/components/cabinet/EmptyState';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  done: boolean;
  done_at: string | null;
  assigned_to: string | null;
  dossier_id: string;
  created_at: string;
  dossiers: { id: string; reference: string | null; client_name: string } | null;
}

interface ProfileLite {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

type TaskGroupKey = 'overdue' | 'today' | 'upcoming' | 'done';

interface TaskGroup {
  key: TaskGroupKey;
  title: string;
  badgeClass: string;
  items: TaskRow[];
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function groupTasks(tasks: TaskRow[]): TaskGroup[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue: TaskRow[] = [];
  const todayList: TaskRow[] = [];
  const upcoming: TaskRow[] = [];
  const done: TaskRow[] = [];

  for (const t of tasks) {
    if (t.done) {
      done.push(t);
      continue;
    }
    if (!t.due_date) {
      upcoming.push(t);
      continue;
    }
    const due = new Date(t.due_date);
    due.setHours(0, 0, 0, 0);
    if (due.getTime() < today.getTime()) {
      overdue.push(t);
    } else if (isSameDay(due, today)) {
      todayList.push(t);
    } else {
      upcoming.push(t);
    }
  }

  return [
    { key: 'overdue', title: 'En retard', badgeClass: 'bg-warning', items: overdue },
    { key: 'today', title: "Aujourd'hui", badgeClass: 'bg-primary', items: todayList },
    { key: 'upcoming', title: 'À venir', badgeClass: 'bg-chart-2', items: upcoming },
    { key: 'done', title: 'Terminées', badgeClass: 'bg-muted-foreground/40', items: done },
  ];
}

// ─── Server Action : toggle done ──────────────────────────
async function toggleTaskAction(formData: FormData) {
  'use server';
  const id = formData.get('id');
  const next = formData.get('next');
  if (typeof id !== 'string' || typeof next !== 'string') return;
  const supabase = await createClient();
  const done = next === 'true';
  await supabase
    .from('dossier_tasks')
    .update({
      done,
      done_at: done ? new Date().toISOString() : null,
    })
    .eq('id', id);
  revalidatePath('/tasks');
  revalidatePath('/');
}

function profileDisplay(p: ProfileLite | undefined): {
  label: string;
  initials: string;
} {
  if (!p) return { label: 'Non assignée', initials: '?' };
  const fn = (p.first_name ?? '').trim();
  const ln = (p.last_name ?? '').trim();
  const full = [fn, ln].filter(Boolean).join(' ');
  return {
    label: full || 'Membre',
    initials: getInitials(full || fn || ln || '?'),
  };
}

export default async function TasksPage() {
  const supabase = await createClient();

  const { data: tasksData, error } = await supabase
    .from('dossier_tasks')
    .select(
      'id, title, description, due_date, done, done_at, assigned_to, dossier_id, created_at, dossiers(id, reference, client_name)',
    )
    .order('done', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(500);

  const tasks = (tasksData ?? []) as unknown as TaskRow[];

  // Récupère les profils des assignés (en batch)
  const assigneeIds = Array.from(
    new Set(tasks.map((t) => t.assigned_to).filter((x): x is string => !!x)),
  );

  const profilesMap = new Map<string, ProfileLite>();
  if (assigneeIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', assigneeIds);
    for (const p of (profiles ?? []) as ProfileLite[]) {
      profilesMap.set(p.id, p);
    }
  }

  const groups = groupTasks(tasks);
  const activeCount = tasks.filter((t) => !t.done).length;
  const overdueCount = groups.find((g) => g.key === 'overdue')?.items.length ?? 0;
  const doneCount = groups.find((g) => g.key === 'done')?.items.length ?? 0;
  const todayCount = groups.find((g) => g.key === 'today')?.items.length ?? 0;

  const stats = [
    {
      label: 'À faire',
      value: activeCount,
      hint: 'Tâches actives',
      icon: ListTodo,
    },
    {
      label: 'En retard',
      value: overdueCount,
      hint: 'À traiter en priorité',
      icon: AlertTriangle,
      highlight: true,
    },
    {
      label: "Aujourd'hui",
      value: todayCount,
      hint: 'Échéance du jour',
      icon: CalendarClock,
    },
    {
      label: 'Terminées',
      value: doneCount,
      hint: 'Tâches clôturées',
      icon: CheckCircle2,
    },
  ];

  return (
    <PageShell>
      <PageHeader
        eyebrow="Pilotage"
        title="Tâches"
        description={
          <>
            <span className="font-mono tabular-nums">{activeCount}</span>{' '}
            {activeCount > 1 ? 'tâches à traiter' : 'tâche à traiter'}
            {tasks.length > 0 ? (
              <>
                {' · '}
                <span className="font-mono tabular-nums">{tasks.length}</span> au total
              </>
            ) : null}
          </>
        }
      />

      <StatStrip>
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </StatStrip>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          Erreur de chargement : {error.message}
        </div>
      )}

      <div className="space-y-6">
        {groups.map((group) => {
          if (group.items.length === 0) return null;
          return (
            <Card key={group.key} className="gap-0 py-0">
              <CardHeader className="border-b px-5 py-3 [.border-b]:pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <span className={cn('size-2 rounded-full', group.badgeClass)} aria-hidden="true" />
                  {group.title}
                  <span className="rounded-md border bg-muted px-1.5 font-mono text-[11px] font-normal tabular-nums text-muted-foreground">
                    {group.items.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y p-0">
                {group.items.map((t) => {
                  const profile = t.assigned_to ? profilesMap.get(t.assigned_to) : undefined;
                  const who = profileDisplay(profile);
                  const dossier = t.dossiers;
                  const isOverdue = group.key === 'overdue';
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
                    >
                      {/* Toggle done — Server Action, bouton-case custom */}
                      <form action={toggleTaskAction} className="shrink-0">
                        <input type="hidden" name="id" value={t.id} />
                        <input type="hidden" name="next" value={(!t.done).toString()} />
                        <button
                          type="submit"
                          aria-label={t.done ? 'Rouvrir la tâche' : 'Marquer comme faite'}
                          className={cn(
                            'grid size-5 cursor-pointer place-items-center rounded-full border-[1.5px] transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                            t.done
                              ? 'border-success bg-success text-background'
                              : 'border-muted-foreground/30 bg-background hover:border-primary',
                          )}
                        >
                          {t.done && <Check className="size-3" strokeWidth={3} />}
                        </button>
                      </form>

                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'truncate text-sm',
                            t.done ? 'text-muted-foreground line-through' : 'font-medium',
                          )}
                        >
                          {t.title}
                        </p>
                        {dossier && (
                          <Link
                            href={`/dossiers/${dossier.id}`}
                            className="mt-0.5 inline-flex max-w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <span className="shrink-0 font-mono">{dossier.reference ?? '—'}</span>
                            <span className="truncate">· {dossier.client_name}</span>
                          </Link>
                        )}
                      </div>

                      <Avatar className="size-7 shrink-0" title={who.label}>
                        <AvatarFallback className="border bg-background text-[10px] font-semibold text-muted-foreground">
                          {who.initials}
                        </AvatarFallback>
                      </Avatar>

                      <div className="w-20 shrink-0 text-right sm:w-24">
                        {t.due_date ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              'font-mono text-[11px] tabular-nums',
                              isOverdue
                                ? 'border-warning/40 bg-warning/10 text-warning'
                                : group.key === 'today'
                                  ? 'border-brand-border bg-brand-soft text-brand-soft-foreground'
                                  : 'text-muted-foreground',
                            )}
                          >
                            {formatDate(t.due_date)}
                          </Badge>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground/60">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}

        {tasks.length === 0 && !error && (
          <Card className="py-0">
            <EmptyState
              icon={ClipboardList}
              title="Aucune tâche pour l'instant."
              description="Les tâches sont créées depuis un dossier."
            />
          </Card>
        )}
      </div>
    </PageShell>
  );
}
