import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { AlertTriangle, ArrowLeftRight, Bell, CheckCircle2, CreditCard, KeyRound, Receipt, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { PageHeader, PageShell } from '@/components/cabinet/PageHeader';

// Navigation par liens (les onglets billing/paiement/historique pointent vers
// /billing) — pas des Tabs Radix : on garde le mécanisme href existant.
const TABS = [
  { id: 'profile', label: 'Mon profil', icon: User },
  { id: 'billing', label: 'Mes factures', icon: Receipt, href: '/billing' },
  { id: 'payment', label: 'Moyens de paiement', icon: CreditCard, href: '/billing' },
  { id: 'history', label: 'Historique transactions', icon: ArrowLeftRight, href: '/billing' },
  { id: 'notifications', label: 'Notifications', icon: Bell, soon: true },
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

  const initials = (profile?.first_name?.[0] || '?') + (profile?.last_name?.[0] || '');

  return (
    <PageShell className="max-w-4xl">
      <PageHeader
        eyebrow="Compte"
        title="Mon profil"
        description="Votre identité au sein du cabinet et la sécurité de votre accès."
        actions={
          <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 shadow-xs">
            <Avatar className="size-8">
              <AvatarFallback className="bg-brand-soft text-xs font-semibold text-brand-soft-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Profil'}
              </p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">{user.email}</p>
            </div>
          </div>
        }
      />

      {/* Navigation du compte par liens — « Mon profil » est l'entrée active ici */}
      <nav aria-label="Rubriques du compte" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="inline-flex gap-0.5 rounded-md border bg-muted p-0.5">
          {TABS.map((t) => {
            const isActive = t.id === 'profile';
            const inner = (
              <span
                className={cn(
                  'inline-flex items-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground',
                  t.soon ? 'cursor-not-allowed opacity-50' : !isActive && 'hover:text-foreground',
                )}
              >
                <t.icon className="size-4" aria-hidden="true" />
                {t.label}
                {t.soon && (
                  <Badge variant="secondary" className="px-1.5 py-0 font-mono text-[9px] uppercase">
                    bientôt
                  </Badge>
                )}
              </span>
            );
            if (t.soon) return <span key={t.id}>{inner}</span>;
            return (
              <Link
                key={t.id}
                href={t.href ?? '/profile'}
                aria-current={isActive ? 'page' : undefined}
                className="rounded-sm no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </nav>

      {sp.saved && (
        <div className="flex items-center gap-2.5 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm">
          <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
          Modifications enregistrées.
        </div>
      )}
      {sp.e && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          {sp.e}
        </div>
      )}

      {/* Informations personnelles */}
      <Card className="gap-0 py-0">
        <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4">
          <CardTitle className="text-sm">Informations personnelles</CardTitle>
          <CardDescription className="text-xs">Votre identité au sein du cabinet.</CardDescription>
        </CardHeader>
        <form action={updateProfile}>
          <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="first_name">Prénom</Label>
              <Input id="first_name" name="first_name" defaultValue={profile?.first_name ?? ''} />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="last_name">Nom</Label>
              <Input id="last_name" name="last_name" defaultValue={profile?.last_name ?? ''} />
            </div>
            <div className="min-w-0 space-y-1.5 sm:col-span-2">
              <Label htmlFor="email">Adresse email</Label>
              <Input id="email" value={user.email ?? ''} disabled className="bg-muted font-mono text-muted-foreground" />
              <p className="text-xs text-muted-foreground">L&apos;adresse de connexion n&apos;est pas modifiable ici.</p>
            </div>
          </CardContent>
          <CardFooter className="flex-wrap justify-between gap-3 border-t bg-muted/40 px-5 py-3 [.border-t]:pt-3">
            <p className="text-xs text-muted-foreground">Visible par les membres du cabinet.</p>
            <Button type="submit" size="sm">Mettre à jour</Button>
          </CardFooter>
        </form>
      </Card>

      {/* Mot de passe */}
      <Card className="gap-0 py-0">
        <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4">
          <CardTitle className="flex items-center gap-2 text-sm">
            <KeyRound className="size-4 text-muted-foreground" aria-hidden="true" />
            Mot de passe
          </CardTitle>
          <CardDescription className="text-xs">Changez le mot de passe de votre compte.</CardDescription>
        </CardHeader>
        <form action={updatePassword}>
          <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="new_password">Nouveau mot de passe</Label>
              <Input
                id="new_password"
                name="new_password"
                type="password"
                minLength={8}
                required
                placeholder="••••••••"
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="confirm_password">Confirmer le nouveau mot de passe</Label>
              <Input
                id="confirm_password"
                name="confirm_password"
                type="password"
                minLength={8}
                required
                placeholder="••••••••"
              />
            </div>
          </CardContent>
          <CardFooter className="flex-wrap justify-between gap-3 border-t bg-muted/40 px-5 py-3 [.border-t]:pt-3">
            <p className="font-mono text-[11px] text-muted-foreground">min. 8 caractères</p>
            <Button type="submit" size="sm">Mettre à jour</Button>
          </CardFooter>
        </form>
      </Card>
    </PageShell>
  );
}
