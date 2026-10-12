import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Connexion / création du compte entrepreneur (sans cabinet), puis retour vers
// la commande en cours (`next`, limité à /espace).

const suivant = (v: FormDataEntryValue | string | null | undefined) => {
  const s = String(v || '');
  return s.startsWith('/espace') && !s.startsWith('//') ? s : '/espace';
};

async function creerCompte(formData: FormData) {
  'use server';
  const next = suivant(formData.get('next'));
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const prenom = String(formData.get('prenom') || '').trim();
  const nom = String(formData.get('nom') || '').trim();
  const retour = (m: string) => redirect(`/espace/connexion?mode=creer&next=${encodeURIComponent(next)}&e=${encodeURIComponent(m)}`);
  if (!email || password.length < 8 || !prenom || !nom) return retour('Renseignez votre prénom, votre nom, votre e-mail et un mot de passe de 8 caractères au moins.');
  const supabase = await createClient();
  const { error, data } = await supabase.auth.signUp({
    email, password,
    options: { data: { first_name: prenom, last_name: nom, compte: 'entrepreneur' } },
  });
  if (error) return retour(error.message);
  if (!data.session) {
    const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
    if (e2) return redirect(`/espace/connexion?next=${encodeURIComponent(next)}&info=${encodeURIComponent('Compte créé : confirmez votre e-mail, puis connectez-vous.')}`);
  }
  redirect(next);
}

async function seConnecter(formData: FormData) {
  'use server';
  const next = suivant(formData.get('next'));
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return redirect(`/espace/connexion?next=${encodeURIComponent(next)}&e=${encodeURIComponent('E-mail ou mot de passe incorrect.')}`);
  redirect(next);
}

export default async function ConnexionEspace({ searchParams }: { searchParams: Promise<{ next?: string; mode?: string; e?: string; info?: string }> }) {
  const sp = await searchParams;
  const next = suivant(sp.next);
  const creer = sp.mode !== 'connexion';
  return (
    <div className="mx-auto max-w-md py-6">
      <Card className="border-[#e4dcff] shadow-[0_20px_50px_rgba(54,31,171,0.08)]">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">{creer ? 'Créez votre espace' : 'Connectez-vous'}</CardTitle>
          <CardDescription>
            {creer ? 'Pour continuer avec l’assistant et suivre votre formalité. Votre conversation est conservée.' : 'Retrouvez vos formalités et l’assistant.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={creer ? creerCompte : seConnecter} className="space-y-4">
            <input type="hidden" name="next" value={next} />
            {creer && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label htmlFor="prenom">Prénom</Label><Input id="prenom" name="prenom" required autoComplete="given-name" /></div>
                <div className="space-y-1.5"><Label htmlFor="nom">Nom</Label><Input id="nom" name="nom" required autoComplete="family-name" /></div>
              </div>
            )}
            <div className="space-y-1.5"><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" required autoComplete="email" /></div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" name="password" type="password" required minLength={8} autoComplete={creer ? 'new-password' : 'current-password'} />
              {creer && <p className="text-xs text-muted-foreground">8 caractères au moins.</p>}
            </div>
            {creer && (
              <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
                <input type="checkbox" required className="mt-0.5 accent-primary" />
                <span>J’accepte les conditions générales de vente et la politique de confidentialité de Legaly.</span>
              </label>
            )}
            {sp.e && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{sp.e}</div>}
            {sp.info && <div role="status" className="rounded-md border border-green-600/30 bg-green-600/10 px-3 py-2 text-sm text-green-700">{sp.info}</div>}
            <Button type="submit" className="w-full" size="lg">{creer ? 'Créer mon espace' : 'Se connecter'}</Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {creer ? 'Déjà un espace ? ' : 'Pas encore d’espace ? '}
            <Link href={`/espace/connexion?mode=${creer ? 'connexion' : 'creer'}&next=${encodeURIComponent(next)}`} className="font-medium text-primary hover:underline">
              {creer ? 'Se connecter' : 'Créer mon espace'}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
