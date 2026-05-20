import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils/format';
import { getInitials } from '@/lib/types';

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
  tone: 'red' | 'amber' | 'blue' | 'gray';
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
    { key: 'overdue', title: 'En retard', tone: 'red', items: overdue },
    { key: 'today', title: "Aujourd'hui", tone: 'amber', items: todayList },
    { key: 'upcoming', title: 'À venir', tone: 'blue', items: upcoming },
    { key: 'done', title: 'Terminées', tone: 'gray', items: done },
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

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Tâches</h1>
          <p>
            {activeCount} {activeCount > 1 ? 'tâches actives' : 'tâche active'} sur{' '}
            {tasks.length}
          </p>
        </div>
      </div>

      {error && (
        <div className="form-error" style={{ marginBottom: 16 }}>
          Erreur de chargement : {error.message}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {groups.map((group) => {
          if (group.items.length === 0) return null;
          return (
            <section key={group.key} className="app-card">
              <div className="app-card-head">
                <h3
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span className={`pill ${group.tone}`}>
                    <span className="dot" />
                    {group.title}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--ink-500)',
                      fontWeight: 400,
                    }}
                  >
                    {group.items.length}
                  </span>
                </h3>
              </div>

              <div>
                {group.items.map((t) => {
                  const profile = t.assigned_to
                    ? profilesMap.get(t.assigned_to)
                    : undefined;
                  const who = profileDisplay(profile);
                  const dossier = t.dossiers;
                  const isOverdue = group.key === 'overdue';
                  return (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        padding: '14px 22px',
                        borderBottom: '1px solid var(--ink-100)',
                      }}
                    >
                      <form action={toggleTaskAction}>
                        <input type="hidden" name="id" value={t.id} />
                        <input
                          type="hidden"
                          name="next"
                          value={(!t.done).toString()}
                        />
                        <button
                          type="submit"
                          aria-label={
                            t.done ? 'Rouvrir la tâche' : 'Marquer comme faite'
                          }
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 6,
                            border: '1.5px solid var(--ink-300)',
                            background: t.done ? 'var(--accent)' : 'white',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'grid',
                            placeItems: 'center',
                            color: 'white',
                            fontSize: 13,
                            lineHeight: 1,
                          }}
                        >
                          {t.done ? '✓' : ''}
                        </button>
                      </form>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: t.done ? 'var(--ink-500)' : 'var(--ink-900)',
                            textDecoration: t.done ? 'line-through' : 'none',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {t.title}
                        </div>
                        {dossier && (
                          <Link
                            href={`/dossiers/${dossier.id}`}
                            style={{
                              fontSize: 12,
                              color: 'var(--ink-500)',
                              display: 'inline-flex',
                              gap: 6,
                              marginTop: 2,
                            }}
                          >
                            <span className="mono">
                              {dossier.reference ?? '—'}
                            </span>
                            <span>· {dossier.client_name}</span>
                          </Link>
                        )}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                        title={who.label}
                      >
                        <span className="avatar avatar-sm">{who.initials}</span>
                      </div>

                      <div style={{ minWidth: 90, textAlign: 'right' }}>
                        {t.due_date ? (
                          <span
                            className={`pill ${
                              isOverdue
                                ? 'red'
                                : group.key === 'today'
                                  ? 'amber'
                                  : 'gray'
                            }`}
                            style={{ fontSize: 11 }}
                          >
                            {formatDate(t.due_date)}
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 12,
                              color: 'var(--ink-400)',
                            }}
                          >
                            —
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {tasks.length === 0 && !error && (
          <div
            className="app-card app-card-pad"
            style={{
              textAlign: 'center',
              padding: '64px 22px',
              color: 'var(--ink-500)',
            }}
          >
            <p style={{ marginBottom: 8 }}>
              Aucune tâche pour l&apos;instant.
            </p>
            <p style={{ fontSize: 13 }}>
              Les tâches sont créées depuis un dossier.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
