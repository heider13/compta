import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScanLine, FileSignature, Clock } from 'lucide-react';

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

const HIGHLIGHTS = [
  { icon: ScanLine, text: 'Scannez une pièce d’identité : la liasse INPI se remplit toute seule.' },
  { icon: FileSignature, text: 'Statuts générés en .docx, signature électronique avancée intégrée.' },
  { icon: Clock, text: '15 à 20 minutes gagnées par dossier, dès le premier jour.' },
];

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ e?: string; info?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Panneau gauche — marque */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_500px_400px_at_80%_10%,rgba(117,81,232,0.25),transparent_60%),radial-gradient(ellipse_400px_300px_at_10%_90%,rgba(149,122,245,0.15),transparent_60%)]"
        />
        <Link href="/" className="relative flex items-center no-underline" aria-label="Legaly AI">
          <Logo size={32} onDark textClassName="text-xl" />
        </Link>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white">
            Votre cabinet,
            <br />
            en pilote automatique.
          </h2>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm leading-relaxed text-sidebar-foreground">
                <Icon className="mt-0.5 size-4 shrink-0 text-sidebar-primary" aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-sidebar-foreground/60">
          30 jours d&apos;essai gratuit — sans carte bancaire.
        </p>
      </aside>

      {/* Panneau droit — formulaire */}
      <section className="flex items-center justify-center bg-muted/40 p-6">
        <Card className="w-full max-w-md border-border/60 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <Link href="/" className="mx-auto mb-2 flex items-center no-underline lg:hidden" aria-label="Legaly AI">
              <Logo size={28} textClassName="text-lg" />
            </Link>
            <CardTitle className="text-2xl">Créez votre cabinet</CardTitle>
            <CardDescription>Démarrez avec 30 jours d&apos;essai gratuit. Sans CB.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={signUp} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="first_name">Prénom</Label>
                  <Input id="first_name" name="first_name" required autoFocus placeholder="Jean" autoComplete="given-name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="last_name">Nom</Label>
                  <Input id="last_name" name="last_name" required placeholder="Dupont" autoComplete="family-name" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cabinet_name">
                  Nom du cabinet <span className="font-normal text-muted-foreground">(optionnel)</span>
                </Label>
                <Input id="cabinet_name" name="cabinet_name" placeholder="Cabinet Dupont & Associés" autoComplete="organization" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email professionnel</Label>
                <Input id="email" name="email" type="email" required placeholder="vous@cabinet.fr" autoComplete="email" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  placeholder="Au moins 8 caractères"
                  autoComplete="new-password"
                />
                <p className="text-xs text-muted-foreground">8 caractères min · 1 majuscule · 1 chiffre</p>
              </div>

              <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
                <input type="checkbox" required className="mt-0.5 accent-primary" />
                <span>
                  J&apos;accepte les{' '}
                  <a href="#" className="font-medium text-primary hover:underline">
                    CGU
                  </a>{' '}
                  et la{' '}
                  <a href="#" className="font-medium text-primary hover:underline">
                    politique de confidentialité
                  </a>
                  .
                </span>
              </label>

              {sp.e && (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {sp.e}
                </div>
              )}
              {sp.info && (
                <div
                  role="status"
                  className="rounded-md border border-green-600/30 bg-green-600/10 px-3 py-2 text-sm text-green-700"
                >
                  {sp.info}
                </div>
              )}

              <Button type="submit" className="w-full" size="lg">
                Créer mon cabinet
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Déjà un cabinet ?{' '}
              <Link href="/auth/login" className="font-medium text-primary hover:underline">
                Se connecter
              </Link>
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
