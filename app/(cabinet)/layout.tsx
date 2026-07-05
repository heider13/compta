import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CabinetSidebar } from '@/components/cabinet/CabinetSidebar';
import { TopBar } from '@/components/cabinet/TopBar';
import { FloatingAssistant } from '@/components/cabinet/FloatingAssistant';
import { getInitials } from '@/lib/types';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
    redirect('/auth/login');
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
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Aucun cabinet</CardTitle>
            <CardDescription>
              Votre compte n&apos;est encore rattaché à aucun cabinet. Contactez
              l&apos;administrateur de votre organisation pour recevoir une invitation,
              ou créez votre propre cabinet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/">Retour à l&apos;accueil</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userLabel =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email ??
    'Utilisateur';

  return (
    <SidebarProvider>
      <CabinetSidebar
        orgName={currentOrg.name}
        userLabel={userLabel}
        userInitials={getInitials(userLabel)}
      />
      <SidebarInset>
        <TopBar
          userLabel={userLabel}
          userEmail={user.email ?? ''}
          userInitials={getInitials(userLabel)}
          plan={currentOrg.plan}
        />
        <div className="app-shell flex-1">{children}</div>
      </SidebarInset>
      <FloatingAssistant />
    </SidebarProvider>
  );
}
