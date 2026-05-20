import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { getInitials } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function signOut() {
  'use server';
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/auth/login');
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name, last_name')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard');
  }

  const fullName =
    [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  const userLabel = fullName || user.email || 'Admin';

  return (
    <div className="app-shell">
      <AdminSidebar
        userLabel={userLabel}
        userInitials={getInitials(userLabel)}
        signOutAction={signOut}
      />
      <main className="app-main">
        <header
          className="app-topbar"
          style={{ background: '#FFFFFF', gap: 12 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: 'var(--accent-ink)',
                background: 'var(--accent-soft)',
                padding: '3px 8px',
                borderRadius: 999,
                textTransform: 'uppercase',
              }}
            >
              Back-office
            </span>
            <span style={{ fontSize: 13, color: 'var(--ink-500)' }}>
              Compta SAS · {user.email}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/clients" className="btn btn-ghost btn-sm">
              Vue cabinet →
            </Link>
            <form action={signOut} style={{ margin: 0 }}>
              <button type="submit" className="btn btn-ghost btn-sm">
                Déconnexion
              </button>
            </form>
          </div>
        </header>
        <div className="app-content with-bg">{children}</div>
      </main>
    </div>
  );
}
