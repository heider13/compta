import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Kpi } from '@/components/cabinet/Kpi';
import { StatusPill } from '@/components/cabinet/StatusPill';
import {
  formatDate,
  formatRelative,
  typeFormaliteLabel,
} from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

const IN_PROGRESS_STATUSES = [
  'DRAFT',
  'AWAITING_VALIDATION',
  'INTERNAL_AMENDMENT_PENDING',
  'RECEIVED',
  'VALIDATION_PENDING',
];

const RECENT_GRID = '110px 1fr 130px 140px 110px';

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

interface ProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

function startOfCurrentMonthIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function profileLabel(p: ProfileRow | null | undefined): string {
  if (!p) return '—';
  const fn = (p.first_name ?? '').trim();
  const ln = (p.last_name ?? '').trim();
  if (fn && ln) return `${fn} ${ln[0]}.`;
  if (fn) return fn;
  if (ln) return ln;
  return '—';
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
  const [
    awaitingValidationRes,
    inProgressRes,
    clientsRes,
    validatedMonthRes,
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
  ]);

  const kpiAwaitingValidation = awaitingValidationRes.count ?? 0;
  const kpiInProgress = inProgressRes.count ?? 0;
  const kpiClients = clientsRes.count ?? 0;
  const kpiValidatedMonth = validatedMonthRes.count ?? 0;

  // Dossiers récents (5 derniers)
  const { data: recentData } = await supabase
    .from('dossiers')
    .select(
      'id, reference, client_name, type_formalite, statut, updated_at, created_at',
    )
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(5);

  const recentDossiers = (recentData ?? []) as RecentDossier[];

  // Tâches à traiter
  let tasksQuery = supabase
    .from('dossier_tasks')
    .select(
      'id, title, due_date, assigned_to, dossier_id, done, dossiers(id, reference, client_name)',
    )
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

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Tableau de bord</h1>
          <p>
            Bienvenue{greetingName ? ` ${greetingName}` : ''}. Voici l&apos;activité de
            votre cabinet.
          </p>
        </div>
        <Link href="/dossiers/new" className="btn btn-accent">
          + Nouveau dossier
        </Link>
      </div>

      <div
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          marginBottom: 28,
        }}
      >
        <Kpi
          label="Dossiers à valider"
          value={kpiAwaitingValidation}
          accent="var(--status-blue)"
          href="/dossiers"
          hint="En attente de votre validation"
        />
        <Kpi
          label="En cours"
          value={kpiInProgress}
          accent="var(--accent)"
          href="/dossiers"
          hint="Tous statuts actifs"
        />
        <Kpi
          label="Clients"
          value={kpiClients}
          accent="var(--ink-300)"
          href="/clients"
          hint="Entreprises gérées"
        />
        <Kpi
          label="Validés ce mois"
          value={kpiValidatedMonth}
          accent="var(--status-green)"
          hint="Formalités acceptées INPI"
        />
      </div>

      <div
        style={{
          display: 'grid',
          gap: 20,
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
        }}
      >
        {/* Dossiers récents */}
        <section className="app-card">
          <div className="app-card-head">
            <h3>Dossiers récents</h3>
            <Link href="/dossiers" className="btn btn-link btn-sm">
              Voir tout →
            </Link>
          </div>

          {recentDossiers.length === 0 ? (
            <div
              style={{
                padding: '48px 22px',
                textAlign: 'center',
                color: 'var(--ink-500)',
                fontSize: 14,
              }}
            >
              Aucun dossier pour l&apos;instant.
            </div>
          ) : (
            <div className="app-table">
              <div
                className="app-table-head"
                style={{ gridTemplateColumns: RECENT_GRID }}
              >
                <div>Référence</div>
                <div>Client</div>
                <div>Type</div>
                <div>Statut</div>
                <div style={{ textAlign: 'right' }}>Maj</div>
              </div>
              {recentDossiers.map((d) => (
                <Link
                  key={d.id}
                  href={`/dossiers/${d.id}`}
                  className="app-table-row"
                  style={{
                    gridTemplateColumns: RECENT_GRID,
                    textDecoration: 'none',
                  }}
                >
                  <div
                    className="mono"
                    style={{ fontSize: 12, color: 'var(--ink-600)' }}
                  >
                    {d.reference ?? '—'}
                  </div>
                  <div
                    style={{
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {d.client_name}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-600)' }}>
                    {typeFormaliteLabel(d.type_formalite)}
                  </div>
                  <div>
                    <StatusPill statut={d.statut} />
                  </div>
                  <div
                    style={{
                      textAlign: 'right',
                      fontSize: 12,
                      color: 'var(--ink-500)',
                    }}
                  >
                    {formatRelative(d.updated_at ?? d.created_at)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Tâches à traiter */}
        <section className="app-card">
          <div className="app-card-head">
            <h3>Tâches à traiter</h3>
            <Link href="/tasks" className="btn btn-link btn-sm">
              Voir tout →
            </Link>
          </div>

          {tasks.length === 0 ? (
            <div
              style={{
                padding: '48px 22px',
                textAlign: 'center',
                color: 'var(--ink-500)',
                fontSize: 14,
              }}
            >
              Aucune tâche à traiter. Bon travail !
            </div>
          ) : (
            <div style={{ padding: '6px 4px' }}>
              {tasks.map((t) => {
                const dossier = t.dossiers;
                return (
                  <Link
                    key={t.id}
                    href={
                      dossier ? `/dossiers/${dossier.id}` : '/tasks'
                    }
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      padding: '12px 18px',
                      borderBottom: '1px solid var(--ink-100)',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <input
                      type="checkbox"
                      disabled
                      style={{ marginTop: 3, accentColor: 'var(--accent)' }}
                      aria-label="Tâche à faire"
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          color: 'var(--ink-900)',
                          fontWeight: 500,
                          marginBottom: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t.title}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--ink-500)',
                          display: 'flex',
                          gap: 8,
                          alignItems: 'center',
                          flexWrap: 'wrap',
                        }}
                      >
                        {dossier && (
                          <span className="mono" style={{ fontSize: 11 }}>
                            {dossier.reference ?? dossier.client_name}
                          </span>
                        )}
                        {t.due_date && (
                          <span className="pill amber" style={{ fontSize: 10 }}>
                            {formatDate(t.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
