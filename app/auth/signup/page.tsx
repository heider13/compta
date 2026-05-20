import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function signUp(formData: FormData) {
  'use server';
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const firstName = String(formData.get('first_name') || '').trim();
  const lastName = String(formData.get('last_name') || '').trim();
  const cabinetName = String(formData.get('cabinet_name') || '').trim();

  if (!email || !password || !firstName || !lastName) {
    return redirect('/auth/signup?e=missing_fields');
  }

  const supabase = await createClient();
  const { error, data } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        cabinet_name: cabinetName || `${firstName} Cabinet`,
      },
    },
  });
  if (error) return redirect(`/auth/signup?e=${encodeURIComponent(error.message)}`);

  if (!data.session) {
    // Confirmation email requise — auto sign-in
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) {
      return redirect(`/auth/signup?info=${encodeURIComponent('Compte créé. Vérifiez votre email pour confirmer puis connectez-vous.')}`);
    }
  }
  return redirect('/onboarding');
}

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ e?: string; info?: string }> }) {
  const sp = await searchParams;
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--ink-50)' }}>
      <div className="card-elev" style={{ width: '100%', maxWidth: 460, padding: 40, borderRadius: 20 }}>
        <Link href="/" className="logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 28, textDecoration: 'none' }}>
          <span className="logo-mark">C</span>
          <span style={{ fontSize: 22 }}>compta</span>
        </Link>
        <h1 style={{ fontSize: 24, textAlign: 'center', marginBottom: 6 }}>Créez votre cabinet</h1>
        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--ink-500)', marginBottom: 24 }}>
          Démarrez avec 30 jours d&apos;essai gratuit. Sans CB.
        </p>

        <form action={signUp}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label className="auth-label">Prénom</label>
              <input
                name="first_name"
                required
                autoFocus
                placeholder="Jean"
                style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--ink-200)', borderRadius: 10, fontSize: 15, fontFamily: 'inherit' }}
              />
            </div>
            <div>
              <label className="auth-label">Nom</label>
              <input
                name="last_name"
                required
                placeholder="Dupont"
                style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--ink-200)', borderRadius: 10, fontSize: 15, fontFamily: 'inherit' }}
              />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="auth-label">Nom du cabinet (optionnel)</label>
            <input
              name="cabinet_name"
              placeholder="Cabinet Dupont & Associés"
              style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--ink-200)', borderRadius: 10, fontSize: 15, fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="auth-label">Email professionnel</label>
            <input
              name="email"
              type="email"
              required
              placeholder="vous@cabinet.fr"
              style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--ink-200)', borderRadius: 10, fontSize: 15, fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ marginBottom: 4 }}>
            <label className="auth-label">Mot de passe</label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="Au moins 8 caractères"
              style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--ink-200)', borderRadius: 10, fontSize: 15, fontFamily: 'inherit' }}
            />
            <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 6 }}>8 caractères min · 1 majuscule · 1 chiffre</div>
          </div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12, color: 'var(--ink-600)', marginTop: 14, cursor: 'pointer' }}>
            <input type="checkbox" required style={{ marginTop: 2, accentColor: 'var(--accent)' }} />
            <span>
              J&apos;accepte les <a href="#" style={{ color: 'var(--accent-ink)' }}>CGU</a> et la{' '}
              <a href="#" style={{ color: 'var(--accent-ink)' }}>politique de confidentialité</a>.
            </span>
          </label>
          {sp.e && <div style={{ color: '#b42318', fontSize: 13, marginTop: 10 }}>{sp.e}</div>}
          {sp.info && <div style={{ color: '#067647', fontSize: 13, marginTop: 10 }}>{sp.info}</div>}
          <button type="submit" className="btn btn-accent btn-lg" style={{ width: '100%', marginTop: 20, justifyContent: 'center' }}>
            Créer mon cabinet
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-500)', marginTop: 24 }}>
          Déjà un cabinet ?{' '}
          <Link href="/auth/login" style={{ color: 'var(--accent-ink)', fontWeight: 500 }}>
            Se connecter
          </Link>
        </div>
      </div>
    </main>
  );
}
