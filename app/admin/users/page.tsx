import { createClient } from '@/lib/supabase/server';
import { formatDateFr } from '@/lib/types';
import { changeUserRoleForm } from '@/lib/server-actions/admin';

export const dynamic = 'force-dynamic';

interface ProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  created_at: string;
}

const GRID = '1.4fr 1fr 120px 100px 130px 160px';

export default async function AdminUsersPage() {
  const supabase = await createClient();

  // Lecture via la table profiles (créée pour chaque auth.user).
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  const profiles = (data ?? []) as ProfileRow[];

  // Comptage memberships par user (séparément — pas de FK directe profiles → memberships)
  const membershipCountByUser = new Map<string, number>();
  if (profiles.length > 0) {
    const { data: ms } = await supabase
      .from('memberships')
      .select('user_id')
      .in(
        'user_id',
        profiles.map((p) => p.id),
      );
    for (const m of (ms ?? []) as { user_id: string }[]) {
      membershipCountByUser.set(
        m.user_id,
        (membershipCountByUser.get(m.user_id) ?? 0) + 1,
      );
    }
  }

  // Récupération des emails via auth admin si possible — sinon on n'affiche
  // que l'UUID. listUsers requires service_role, donc on tente best-effort.
  const emailById = new Map<string, string>();
  try {
    const { data: list } = await supabase.auth.admin.listUsers({ perPage: 200 });
    for (const u of list?.users ?? []) {
      if (u?.id && u.email) emailById.set(u.id, u.email);
    }
  } catch {
    // pas de service_role : on continue sans
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Utilisateurs</h1>
          <p>
            {profiles.length} utilisateur{profiles.length > 1 ? 's' : ''} sur la
            plateforme.
          </p>
        </div>
      </div>

      {error && (
        <div className="form-error" style={{ marginBottom: 16 }}>
          {error.message}
        </div>
      )}

      {emailById.size === 0 && (
        <div
          style={{
            padding: 12,
            marginBottom: 12,
            background: '#FEF3C7',
            borderRadius: 8,
            fontSize: 12,
            color: '#92400E',
          }}
        >
          Note : les emails ne sont pas affichés car le serveur tourne sans
          clé <code>service_role</code>. Configurez-la pour activer la
          recherche par email.
        </div>
      )}

      <div className="app-card">
        <div className="app-table-head" style={{ gridTemplateColumns: GRID }}>
          <span>Nom</span>
          <span>Email</span>
          <span>Rôle actuel</span>
          <span>Cabinets</span>
          <span>Inscrit le</span>
          <span>Changer le rôle</span>
        </div>
        {profiles.length === 0 ? (
          <div
            style={{
              padding: 48,
              textAlign: 'center',
              color: 'var(--ink-500)',
              fontSize: 14,
            }}
          >
            Aucun utilisateur.
          </div>
        ) : (
          profiles.map((p) => {
            const fullName = [p.first_name, p.last_name]
              .filter(Boolean)
              .join(' ');
            return (
              <div
                key={p.id}
                className="app-table-row"
                style={{ gridTemplateColumns: GRID }}
              >
                <span style={{ fontWeight: 500, fontSize: 13 }}>
                  {fullName || (
                    <span className="mono">{p.id.slice(0, 8)}</span>
                  )}
                </span>
                <span style={{ fontSize: 13, color: 'var(--ink-600)' }}>
                  {emailById.get(p.id) ?? '—'}
                </span>
                <span>
                  <span
                    className={`pill ${
                      p.role === 'admin' ? 'violet' : 'gray'
                    }`}
                    style={{ fontSize: 11 }}
                  >
                    {p.role}
                  </span>
                </span>
                <span className="mono" style={{ fontSize: 12 }}>
                  {membershipCountByUser.get(p.id) ?? 0}
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 11, color: 'var(--ink-500)' }}
                >
                  {formatDateFr(p.created_at)}
                </span>
                <form
                  action={changeUserRoleForm}
                  style={{ display: 'flex', gap: 6 }}
                >
                  <input type="hidden" name="userId" value={p.id} />
                  <select
                    name="role"
                    defaultValue={p.role}
                    style={{
                      padding: '6px 8px',
                      border: '1px solid var(--ink-200)',
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  >
                    <option value="client">client</option>
                    <option value="admin">admin</option>
                  </select>
                  <button
                    type="submit"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '6px 10px', fontSize: 12 }}
                  >
                    OK
                  </button>
                </form>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
