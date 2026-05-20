import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prepareNewDossier } from '@/lib/server-actions/dossiers';
import { getInpiCredentialsStatus } from '@/lib/server-actions/inpi-credentials';

const FORMALITY_GROUPS = [
  { group: 'Création', items: [
    { id: 'AE', label: 'Auto-entreprise' },
    { id: 'SASU', label: 'SASU' },
    { id: 'SAS', label: 'SAS' },
    { id: 'EURL', label: 'EURL' },
    { id: 'SARL', label: 'SARL' },
    { id: 'SCI', label: 'SCI' },
    { id: 'HOLDING', label: 'Holding' },
  ]},
  { group: 'Modification', items: [{ id: 'MODIFICATION', label: 'Modification' }] },
  { group: 'Cessation',    items: [{ id: 'RADIATION', label: 'Cessation / radiation' }] },
  { group: 'Conformité',   items: [
    { id: 'BE', label: 'Bénéficiaires effectifs' },
    { id: 'COMPTES', label: 'Dépôt comptes annuels' },
  ]},
];

export default async function NewDossierPage() {
  // Garde : impossible de lancer une formalité tant que les identifiants
  // INPI du cabinet ne sont pas configurés (sinon le backend renverra 403).
  const inpi = await getInpiCredentialsStatus();
  if (!inpi || !inpi.configured) {
    redirect('/settings/inpi?next=/dossiers/new');
  }

  const supabase = await createClient();
  const { data: clients } = await supabase
    .from('clients')
    .select('id, denomination, siren, forme_juridique')
    .is('archived_at', null)
    .order('denomination', { ascending: true });

  const { data: { user } } = await supabase.auth.getUser();
  const { data: m } = user ? await supabase
    .from('memberships')
    .select('organization_id, organizations(name)')
    .eq('user_id', user.id)
    .limit(1)
    .single() : { data: null };

  const { data: members } = m ? await supabase
    .from('memberships')
    .select('user_id, profiles!inner(first_name, last_name)')
    .eq('organization_id', m.organization_id) : { data: null };

  return (
    <div className="app-content with-bg">
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link href="/dashboard" style={{ color: 'var(--ink-500)' }}>🏠</Link>
        <span>›</span>
        <span style={{ color: 'var(--ink-900)' }}>Nouvelle formalité</span>
      </div>

      {/* Card centrée */}
      <form
        action={prepareNewDossier}
        className="card-elev"
        style={{
          maxWidth: 720,
          margin: '20px auto 32px',
          padding: '40px 44px',
          borderRadius: 18,
          background: 'white',
          textAlign: 'center',
        }}
      >
        <div style={{ width: 72, height: 72, margin: '0 auto 18px', display: 'grid', placeItems: 'center', background: 'var(--accent-soft)', borderRadius: '50%' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 400, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
          Organisez votre <strong style={{ fontWeight: 600 }}>opération</strong>
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-500)', margin: '0 0 28px' }}>
          Choisissez le client, le type de formalité et le collaborateur en charge.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, textAlign: 'left', marginBottom: 18 }}>
          <div>
            <label className="auth-label" style={labelStyle}>Société cliente</label>
            <select name="client_id" defaultValue="" style={selectStyle}>
              <option value="">Sélectionnez la société</option>
              {(clients ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.denomination}{c.siren ? ` · ${c.siren}` : ''}
                </option>
              ))}
            </select>
            <Link href="/clients/new" style={{ display: 'inline-block', marginTop: 6, fontSize: 12, color: 'var(--accent-ink)', textDecoration: 'none' }}>
              + Ajouter une société
            </Link>
          </div>
          <div>
            <label className="auth-label" style={labelStyle}>Collaborateur en charge</label>
            <select name="assigned_to" defaultValue={user?.id ?? ''} style={selectStyle}>
              <option value="">— Sélectionner —</option>
              {(members ?? []).map((mem: { user_id: string; profiles: { first_name: string | null; last_name: string | null } | { first_name: string | null; last_name: string | null }[] }) => {
                const p = Array.isArray(mem.profiles) ? mem.profiles[0] : mem.profiles;
                const name = `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim() || mem.user_id.slice(0, 6);
                return <option key={mem.user_id} value={mem.user_id}>{name}{mem.user_id === user?.id ? ' (vous)' : ''}</option>;
              })}
            </select>
          </div>
        </div>

        <div style={{ textAlign: 'left', marginBottom: 24 }}>
          <label className="auth-label" style={labelStyle}>Type de formalité</label>
          <div style={{ display: 'grid', gap: 12 }}>
            {FORMALITY_GROUPS.map((g) => (
              <details key={g.group} open={g.group === 'Création'} style={{ border: '1px solid var(--ink-200)', borderRadius: 10, padding: '10px 14px', background: 'var(--ink-50)' }}>
                <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--ink-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {g.group} ({g.items.length})
                </summary>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 6, marginTop: 10 }}>
                  {g.items.map((it) => (
                    <label key={it.id} style={radioLabelStyle}>
                      <input type="radio" name="type" value={it.id} required style={{ accentColor: 'var(--accent)' }} />
                      <span>{it.label}</span>
                    </label>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-accent btn-lg"
          style={{ width: '100%', justifyContent: 'center', fontSize: 15, padding: '14px 24px' }}
        >
          Commencer →
        </button>
      </form>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--ink-700)',
  marginBottom: 6,
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  border: '1px solid var(--ink-200)',
  borderRadius: 10,
  background: 'var(--ink-50)',
  fontSize: 14,
  fontFamily: 'inherit',
  cursor: 'pointer',
};

const radioLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  background: 'white',
  border: '1px solid var(--ink-200)',
  borderRadius: 8,
  fontSize: 13,
  cursor: 'pointer',
};
