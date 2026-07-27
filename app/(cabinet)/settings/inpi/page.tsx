import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ExternalLink, Lock, TriangleAlert } from 'lucide-react';
import {
  getInpiCredentialsStatus,
  saveInpiCredentials,
} from '@/lib/server-actions/inpi-credentials';
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
import { Separator } from '@/components/ui/separator';

export const dynamic = 'force-dynamic';

const ERROR_LABELS: Record<string, string> = {
  missing_fields: 'Identifiant et mot de passe sont obligatoires.',
  no_org: 'Aucun cabinet rattaché à votre compte.',
  forbidden: 'Seul un propriétaire ou administrateur du cabinet peut modifier ces identifiants.',
};

export default async function InpiSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const status = await getInpiCredentialsStatus();
  const next = sp.next && sp.next.startsWith('/') ? sp.next : '/dashboard';
  const errorKey = sp.e ?? '';
  const errorMessage = ERROR_LABELS[errorKey] ?? (errorKey ? decodeURIComponent(errorKey) : null);

  const isReconfig = status?.configured ?? false;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1>Connexion INPI</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reliez votre compte du Guichet Unique pour déposer vos formalités au registre.
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="size-4" />
            Tableau de bord
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
              <Lock className="size-5" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <CardTitle className="text-base">Connexion à votre compte INPI</CardTitle>
              <CardDescription className="leading-relaxed">
                Vos identifiants du Guichet Unique sont nécessaires pour déposer les
                formalités au registre. Ils sont chiffrés et stockés dans votre cabinet
                uniquement — jamais partagés.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {!isReconfig && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>
                <strong className="font-semibold">Configuration requise.</strong> Tant que
                vos identifiants INPI ne sont pas renseignés, vous ne pouvez pas déposer de
                formalité depuis Legaly AI.
              </p>
            </div>
          )}

          {isReconfig && (
            <div className="flex items-start gap-3 rounded-lg border border-[#957af5]/40 bg-[#ede7ff] px-4 py-3 text-sm text-[#2b1769]">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <p>
                <strong className="font-semibold">Compte INPI connecté</strong>
                {status?.username ? ` — ${status.username}` : ''}
                {status?.env === 'demo' ? ' (environnement bac à sable)' : ''}. Vous pouvez
                mettre à jour les identifiants ci-dessous.
              </p>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {errorMessage}
            </div>
          )}

          <form action={saveInpiCredentials} className="space-y-5">
            <input type="hidden" name="next" value={next} />

            <div className="space-y-1.5">
              <Label htmlFor="inpi_username">
                Identifiant INPI (email) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="inpi_username"
                name="inpi_username"
                type="email"
                required
                autoComplete="username"
                defaultValue={status?.username ?? ''}
                placeholder="vous@cabinet.fr"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inpi_password">
                Mot de passe INPI <span className="text-destructive">*</span>
              </Label>
              <Input
                id="inpi_password"
                name="inpi_password"
                type="password"
                required
                autoComplete="current-password"
                placeholder={isReconfig ? 'Laissez identique pour conserver' : '••••••••'}
              />
              <p className="text-xs text-muted-foreground">
                Le mot de passe est chiffré côté serveur avant stockage.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inpi_env">Environnement</Label>
              {/* Select natif : le formulaire est une Server Action (POST FormData). */}
              <select
                id="inpi_env"
                name="inpi_env"
                defaultValue={status?.env ?? 'prod'}
                className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="prod">Production (procedures-bis.inpi.fr)</option>
                <option value="demo">Bac à sable / démo (procedures-demo.inpi.fr)</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-1">
              <Button variant="ghost" size="sm" asChild>
                <Link href={next}>
                  <ArrowLeft className="size-4" />
                  Annuler
                </Link>
              </Button>
              <Button type="submit" size="lg" className="min-w-52">
                {isReconfig ? 'Mettre à jour' : 'Connecter mon compte INPI'}
              </Button>
            </div>
          </form>

          <Separator />

          <p className="text-xs leading-relaxed text-muted-foreground">
            <strong className="font-medium text-foreground">
              Vous n&apos;avez pas encore de compte INPI ?
            </strong>{' '}
            Créez-le gratuitement sur{' '}
            <a
              href="https://procedures.inpi.fr/?/"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline"
            >
              procedures.inpi.fr
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>{' '}
            puis revenez ici saisir vos identifiants.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
