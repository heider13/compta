import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CabinetSidebar } from '@/components/cabinet/CabinetSidebar';
import { TopBar } from '@/components/cabinet/TopBar';
import { getInitials } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface MembershipRow {
  organization_id: string;
  role: string;
  organizations: {
    id: string;
    name: string;
    slug: string;
    plan: string | null;
  } | null;
}

export default async function CabinetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login.html');
  }

  // Récupère les memberships pour identifier l'org courante
  const { data: memberships } = await supabase
    .from('memberships')
    .select('organization_id, role, organizations(id, name, slug, plan)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true });

  const rows = (memberships ?? []) as unknown as MembershipRow[];
  const currentMembership = rows[0] ?? null;
  const currentOrg = currentMembership?.organizations ?? null;

  if (!currentOrg) {
    // L'utilisateur est connecté mais n'appartient à aucun cabinet.
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ink-50)', padding: 28 }}>
        <div
          className="app-card app-card-pad"
          style={{ maxWidth: 560, margin: '64px auto' }}
        >
          <h2 style={{ marginBottom: 8 }}>Aucun cabinet</h2>
          <p style={{ marginBottom: 16 }}>
            Votre compte n&apos;est encore rattaché à aucun cabinet. Contactez
            l&apos;administrateur de votre organisation pour recevoir une invitation,
            ou créez votre propre cabinet.
          </p>
          <Link href="/" className="btn btn-ghost">
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  const userLabel =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email ??
    'Utilisateur';

  return (
    <div className="app-shell">
      <CabinetSidebar
        orgName={currentOrg.name}
        userLabel={userLabel}
        userInitials={getInitials(userLabel)}
      />
      <main className="app-main">
        <TopBar
          userLabel={userLabel}
          userEmail={user.email ?? ''}
          userInitials={getInitials(userLabel)}
          plan={currentOrg.plan}
        />
        {children}
      </main>
    </div>
  );
}
