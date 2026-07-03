import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ArrowLeftRight, Bell, CreditCard, Receipt, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

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
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Avatar className="size-10">
          <AvatarFallback className="bg-accent font-semibold text-accent-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <h1 className="text-2xl font-semibold tracking-tight">Mon profil</h1>
      </div>

      {/* Onglets par liens — l'onglet "Mon profil" est le seul actif ici */}
      <nav className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => {
          const isActive = t.id === 'profile';
          const inner = (
            <span
              className={cn(
                '-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground',
                t.soon ? 'cursor-not-allowed opacity-50' : 'hover:text-foreground',
              )}
            >
              <t.icon className="size-4" aria-hidden="true" />
              {t.label}
              {t.soon && (
                <Badge variant="secondary" className="px-1.5 py-0 text-[9px]">
                  bientôt
                </Badge>
              )}
            </span>
          );
          if (t.soon) return <span key={t.id}>{inner}</span>;
          return (
            <Link key={t.id} href={t.href ?? '/profile'} className="no-underline">
              {inner}
            </Link>
          );
        })}
      </nav>

      {sp.saved && (
        <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
          Modifications enregistrées.
        </div>
      )}
      {sp.e && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {sp.e}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Informations personnelles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations personnelles</CardTitle>
            <CardDescription>Votre identité au sein du cabinet.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateProfile} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="first_name">Prénom</Label>
                <Input id="first_name" name="first_name" defaultValue={profile?.first_name ?? ''} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name">Nom</Label>
                <Input id="last_name" name="last_name" defaultValue={profile?.last_name ?? ''} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Adresse email</Label>
                <Input id="email" value={user.email ?? ''} disabled className="bg-muted text-muted-foreground" />
              </div>
              <Button type="submit">Mettre à jour</Button>
            </form>
          </CardContent>
        </Card>

        {/* Mot de passe */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Mot de passe</CardTitle>
            <CardDescription>8 caractères minimum.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updatePassword} className="space-y-4">
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
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
              <Button type="submit">Mettre à jour</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
