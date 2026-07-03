import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Zap, Building2 } from 'lucide-react';

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
      .select('organization_id, role, organizations(siren)')
      .eq('user_id', userId)
      .limit(1);
    const m = memberships?.[0] as any;
    if (m && !m.organizations?.siren) {
      return redirect('/onboarding');
    }
  }
  return redirect('/dashboard');
}

const REASSURANCE = [
  { icon: Building2, text: 'Connecté au Guichet Unique INPI — dépôt direct de vos formalités.' },
  { icon: Zap, text: '90 % des champs préremplis : OCR pièce d’identité + lecture SIREN.' },
  { icon: ShieldCheck, text: 'RGPD, hébergement France, chiffrement des identifiants INPI.' },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Panneau gauche — marque */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_500px_400px_at_80%_10%,rgba(117,81,232,0.25),transparent_60%),radial-gradient(ellipse_400px_300px_at_10%_90%,rgba(149,122,245,0.15),transparent_60%)]"
        />
        <Link href="/" className="relative flex items-center gap-2.5 text-white no-underline">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-lg font-bold text-white">
            C
          </span>
          <span className="text-xl font-semibold tracking-tight">compta</span>
        </Link>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white">
            Toutes vos formalités.
            <br />
            Un seul outil.
          </h2>
          <ul className="mt-8 space-y-4">
            {REASSURANCE.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm leading-relaxed text-sidebar-foreground">
                <Icon className="mt-0.5 size-4 shrink-0 text-sidebar-primary" aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-sidebar-foreground/60">
          © {new Date().getFullYear()} Compta — plateforme de formalités pour cabinets.
        </p>
      </aside>

      {/* Panneau droit — formulaire */}
      <section className="flex items-center justify-center bg-muted/40 p-6">
        <Card className="w-full max-w-md border-border/60 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <Link href="/" className="mx-auto mb-2 flex items-center gap-2 no-underline lg:hidden">
              <span className="grid size-8 place-items-center rounded-lg bg-primary text-base font-bold text-white">
                C
              </span>
              <span className="text-lg font-semibold text-foreground">compta</span>
            </Link>
            <CardTitle className="text-2xl">Content de vous revoir</CardTitle>
            <CardDescription>Connectez-vous à votre cabinet.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={signIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder="vous@cabinet.fr"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Mot de passe</Label>
                  <a href="#" className="text-xs font-medium text-primary hover:underline">
                    Oublié ?
                  </a>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </div>

              {sp.e && (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {sp.e}
                </div>
              )}

              <Button type="submit" className="w-full" size="lg">
                Se connecter
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Pas encore de cabinet ?{' '}
              <Link href="/auth/signup" className="font-medium text-primary hover:underline">
                Créer un compte
              </Link>
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
