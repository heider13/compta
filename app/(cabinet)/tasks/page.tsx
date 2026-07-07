import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { AlertTriangle, Check, CheckCircle2, ClipboardList, ListTodo } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils/format';
import { getInitials } from '@/lib/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/cabinet/dashboard/StatCard';
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
    { key: 'overdue', title: 'En retard', badgeClass: 'border-amber-300 bg-amber-50 text-amber-800', items: overdue },
    { key: 'today', title: "Aujourd'hui", badgeClass: 'border-primary/30 bg-[#ede7ff] text-primary', items: todayList },
    { key: 'upcoming', title: 'À venir', badgeClass: 'border-[#957af5]/40 bg-[#f3f1fa] text-[#5b36d6]', items: upcoming },
    { key: 'done', title: 'Terminées', badgeClass: 'border-border bg-muted text-muted-foreground', items: done },
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

  const stats = [
    {
      label: 'À faire',
      value: activeCount,
      hint: 'Tâches actives',
      icon: ListTodo,
      tileClass: 'text-primary bg-[#ede7ff]',
    },
    {
      label: 'En retard',
      value: overdueCount,
      hint: 'À traiter en priorité',
      icon: AlertTriangle,
      tileClass: 'text-[#ff887b] bg-[#fff3f1]',
    },
    {
      label: 'Terminées',
      value: doneCount,
      hint: 'Tâches clôturées',
      icon: CheckCircle2,
      tileClass: 'text-[#7551e8] bg-[#f3f1fa]',
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1>Tâches</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeCount} {activeCount > 1 ? 'tâches à traiter' : 'tâche à traiter'}
            {tasks.length > 0 ? ` · ${tasks.length} au total` : ''}
          </p>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0">
            <StatCard
              label={stat.label}
              value={stat.value}
              hint={stat.hint}
              icon={stat.icon}
              tileClass={stat.tileClass}
            />
          </div>
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          Erreur de chargement : {error.message}
        </div>
      )}

      <div className="space-y-5">
        {groups.map((group) => {
          if (group.items.length === 0) return null;
          return (
            <Card key={group.key}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2.5 text-base">
                  <Badge variant="outline" className={group.badgeClass}>
                    {group.title}
                  </Badge>
                  <span className="text-xs font-normal text-muted-foreground">
                    {group.items.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border p-0">
                {group.items.map((t) => {
                  const profile = t.assigned_to ? profilesMap.get(t.assigned_to) : undefined;
                  const who = profileDisplay(profile);
                  const dossier = t.dossiers;
                  const isOverdue = group.key === 'overdue';
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[#f5f3fb]"
                    >
                      {/* Toggle done — Server Action, bouton-case custom */}
                      <form action={toggleTaskAction} className="shrink-0">
                        <input type="hidden" name="id" value={t.id} />
                        <input type="hidden" name="next" value={(!t.done).toString()} />
                        <button
                          type="submit"
                          aria-label={t.done ? 'Rouvrir la tâche' : 'Marquer comme faite'}
                          className={cn(
                            'grid size-5 cursor-pointer place-items-center rounded-md border-[1.5px] transition-colors',
                            t.done
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-input bg-background hover:border-primary',
                          )}
                        >
                          {t.done && <Check className="size-3.5" strokeWidth={3} />}
                        </button>
                      </form>

                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'truncate text-sm font-medium',
                            t.done && 'text-muted-foreground line-through',
                          )}
                        >
                          {t.title}
                        </p>
                        {dossier && (
                          <Link
                            href={`/dossiers/${dossier.id}`}
                            className="mt-0.5 inline-flex gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <span className="font-mono">{dossier.reference ?? '—'}</span>
                            <span>· {dossier.client_name}</span>
                          </Link>
                        )}
                      </div>

                      <Avatar className="size-7 shrink-0" title={who.label}>
                        <AvatarFallback className="bg-accent text-[11px] font-semibold text-accent-foreground">
                          {who.initials}
                        </AvatarFallback>
                      </Avatar>

                      <div className="w-24 shrink-0 text-right">
                        {t.due_date ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[11px]',
                              isOverdue
                                ? 'border-amber-300 bg-amber-50 text-amber-800'
                                : group.key === 'today'
                                  ? 'border-primary/30 bg-[#ede7ff] text-primary'
                                  : 'border-border bg-muted text-muted-foreground',
                            )}
                          >
                            {formatDate(t.due_date)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">—</span>
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
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
              <ClipboardList className="size-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">Aucune tâche pour l&apos;instant.</p>
              <p className="text-sm text-muted-foreground">
                Les tâches sont créées depuis un dossier.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
