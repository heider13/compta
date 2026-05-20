import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function signIn(formData: FormData) {
  'use server';
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  if (!email || !password) return redirect('/auth/login?e=missing_fields');

  const supabase = await createClient();
  const { error, data } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return redirect(`/auth/login?e=${encodeURIComponent(error.message)}`);

  // Récupère le user + memberships pour décider du redirect
  const userId = data.user?.id;
  if (userId) {
    const { data: memberships } = await supabase
      .from('memberships')
      .select('organization_id, role, organizations(siren, inpi_username)')
      .eq('user_id', userId)
      .limit(1);
    const m = memberships?.[0] as any;
    if (m && (!m.organizations?.siren || !m.organizations?.inpi_username)) {
      return redirect('/onboarding');
    }
  }
  return redirect('/dashboard');
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const sp = await searchParams;
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--ink-50)' }}>
      <div className="card-elev" style={{ width: '100%', maxWidth: 440, padding: 40, borderRadius: 20 }}>
        <Link href="/" className="logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 32, textDecoration: 'none' }}>
          <span className="logo-mark">C</span>
          <span style={{ fontSize: 22 }}>compta</span>
        </Link>
        <h1 style={{ fontSize: 24, textAlign: 'center', marginBottom: 6 }}>Content de vous revoir</h1>
        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--ink-500)', marginBottom: 28 }}>
          Connectez-vous à votre cabinet.
        </p>

        <form action={signIn}>
          <div style={{ marginBottom: 14 }}>
            <label className="auth-label">Email</label>
            <input
              name="email"
              type="email"
              required
              autoFocus
              placeholder="vous@cabinet.fr"
              style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--ink-200)', borderRadius: 10, fontSize: 15, fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="auth-label">Mot de passe</label>
              <a href="#" style={{ fontSize: 12, color: 'var(--accent-ink)', fontWeight: 500 }}>Oublié ?</a>
            </div>
            <input
              name="password"
              type="password"
              required
              placeholder="••••••••"
              style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--ink-200)', borderRadius: 10, fontSize: 15, fontFamily: 'inherit' }}
            />
          </div>
          {sp.e && (
            <div style={{ color: '#b42318', fontSize: 13, marginTop: 10 }}>{sp.e}</div>
          )}
          <button type="submit" className="btn btn-accent btn-lg" style={{ width: '100%', marginTop: 20, justifyContent: 'center' }}>
            Se connecter
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-500)', marginTop: 24 }}>
          Pas encore de cabinet ?{' '}
          <Link href="/auth/signup" style={{ color: 'var(--accent-ink)', fontWeight: 500 }}>
            Créer un compte
          </Link>
        </div>
      </div>
    </main>
  );
}
