import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const TABS = [
  { id: 'profile',       label: 'Mon profil',              icon: '👤' },
  { id: 'billing',       label: 'Mes factures',            icon: '🧾', href: '/billing' },
  { id: 'payment',       label: 'Moyens de paiement',      icon: '💳', href: '/billing' },
  { id: 'history',       label: 'Historique transactions', icon: '⇄',  href: '/billing' },
  { id: 'notifications', label: 'Notifications',           icon: '🔔', soon: true },
];

async function updateProfile(formData: FormData) {
  'use server';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('profiles').update({
    first_name: String(formData.get('first_name') || '').trim() || null,
    last_name: String(formData.get('last_name') || '').trim() || null,
  }).eq('id', user.id);
  revalidatePath('/profile');
  redirect('/profile?saved=1');
}

async function updatePassword(formData: FormData) {
  'use server';
  const password = String(formData.get('new_password') || '');
  const confirm = String(formData.get('confirm_password') || '');
  if (password.length < 8) redirect('/profile?e=' + encodeURIComponent('Mot de passe trop court (8 caractères min).'));
  if (password !== confirm) redirect('/profile?e=' + encodeURIComponent('Les mots de passe ne correspondent pas.'));
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect('/profile?e=' + encodeURIComponent(error.message));
  redirect('/profile?saved=1');
}

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ saved?: string; e?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single();

  return (
    <div className="app-content with-bg">
      <div className="page-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', fontWeight: 600 }}>
            {(profile?.first_name?.[0] || '?') + (profile?.last_name?.[0] || '')}
          </div>
          <h1 style={{ margin: 0 }}>Mon <span style={{ fontWeight: 400 }}>profil</span></h1>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--ink-150)', marginBottom: 28, overflowX: 'auto' }}>
        {TABS.map((t) => {
          const isActive = t.id === 'profile';
          const inner = (
            <span style={{
              padding: '12px 18px',
              fontSize: 13,
              fontWeight: 500,
              color: isActive ? 'var(--accent-ink)' : 'var(--ink-600)',
              borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              cursor: t.soon ? 'not-allowed' : 'pointer',
              opacity: t.soon ? 0.5 : 1,
            }}>
              <span aria-hidden="true">{t.icon}</span>
              {t.label}
              {t.soon && <span className="pill" style={{ fontSize: 9, padding: '1px 6px', background: 'var(--ink-100)', color: 'var(--ink-600)' }}>bientôt</span>}
            </span>
          );
          if (t.soon) return <span key={t.id}>{inner}</span>;
          if (t.href) return <Link key={t.id} href={t.href} style={{ textDecoration: 'none' }}>{inner}</Link>;
          return <Link key={t.id} href="/profile" style={{ textDecoration: 'none' }}>{inner}</Link>;
        })}
      </div>

      {sp.saved && <div style={{ background: '#D1FAE5', color: '#065F46', padding: 12, marginBottom: 16, borderRadius: 8, fontSize: 13 }}>Modifications enregistrées.</div>}
      {sp.e && <div style={{ color: '#b42318', padding: 12, marginBottom: 16, fontSize: 13, background: '#FEE2E2', borderRadius: 8 }}>{sp.e}</div>}

      {/* 2-col layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }} className="profile-grid">
        {/* Profil */}
        <form action={updateProfile} className="app-card" style={{ padding: 28 }}>
          <h3 style={{ fontSize: 15, marginBottom: 18 }}>Informations personnelles</h3>
          <Field label="Prénom">
            <input name="first_name" defaultValue={profile?.first_name ?? ''} style={inputStyle} />
          </Field>
          <Field label="Nom">
            <input name="last_name" defaultValue={profile?.last_name ?? ''} style={inputStyle} />
          </Field>
          <Field label="Adresse email">
            <input value={user.email ?? ''} disabled style={{ ...inputStyle, background: 'var(--ink-50)', color: 'var(--ink-500)' }} />
          </Field>
          <button type="submit" className="btn btn-accent" style={{ marginTop: 8 }}>Mettre à jour</button>
        </form>

        {/* Mot de passe */}
        <form action={updatePassword} className="app-card" style={{ padding: 28, height: 'fit-content' }}>
          <h3 style={{ fontSize: 15, marginBottom: 18 }}>Mot de passe</h3>
          <Field label="Nouveau mot de passe">
            <input name="new_password" type="password" minLength={8} required style={inputStyle} placeholder="••••••••" />
          </Field>
          <Field label="Confirmer le nouveau mot de passe">
            <input name="confirm_password" type="password" minLength={8} required style={inputStyle} placeholder="••••••••" />
          </Field>
          <button type="submit" className="btn btn-accent" style={{ marginTop: 8 }}>Mettre à jour</button>
        </form>
      </div>

      <style>{`
        @media (max-width: 880px) {
          .profile-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  border: '1px solid var(--ink-200)',
  borderRadius: 10,
  background: 'var(--ink-50)',
  fontSize: 14,
  fontFamily: 'inherit',
  marginBottom: 14,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="auth-label" style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 500, color: 'var(--ink-700)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}
