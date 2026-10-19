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
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PageHeader, PageShell } from '@/components/cabinet/PageHeader';

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

  const isDemo = status?.env === 'demo';

  return (
    <PageShell className="max-w-4xl">
      <PageHeader
        eyebrow="Réglages · Intégration"
        title="Connexion INPI"
        description="Reliez votre compte du Guichet unique pour déposer vos formalités au registre."
      />

      {/* État de la connexion */}
      <Card className="gap-0 py-0">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg border bg-background shadow-xs">
            <Lock className="size-4 text-muted-foreground" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="label-mono">Guichet unique INPI</p>
            <p className="flex items-center gap-2 text-sm font-medium">
              {isReconfig ? (
                <>
                  <span className="live-dot size-1.5 text-success" aria-hidden="true" />
                  Compte connecté
                </>
              ) : (
                <>
                  <span className="inline-block size-1.5 rounded-full bg-warning" aria-hidden="true" />
                  Non connecté
                </>
              )}
            </p>
            {isReconfig && status?.username && (
              <p className="truncate font-mono text-xs text-muted-foreground">{status.username}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
            <span className="label-mono">Environnement</span>
            {isReconfig ? (
              <Badge
                variant="outline"
                className={
                  isDemo
                    ? 'border-warning/40 bg-warning/10 font-mono text-[11px] text-warning'
                    : 'border-success/30 bg-success/10 font-mono text-[11px] text-success'
                }
              >
                {isDemo ? 'démo · bac à sable' : 'production'}
              </Badge>
            ) : (
              <Badge variant="outline" className="font-mono text-[11px] text-muted-foreground">
                non défini
              </Badge>
            )}
          </div>
        </CardContent>
        {!isReconfig ? (
          <div className="flex items-start gap-3 border-t border-warning/40 bg-warning/10 px-5 py-3 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            <p>
              <span className="font-medium">Configuration requise.</span>{' '}
              <span className="text-muted-foreground">
                Tant que vos identifiants INPI ne sont pas renseignés, vous ne pouvez pas déposer de
                formalité depuis Legaly AI.
              </span>
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-3 border-t bg-muted/40 px-5 py-3 text-xs text-muted-foreground">
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" />
            <p>
              Compte INPI connecté{isDemo ? ' (environnement bac à sable)' : ''}. Vous pouvez mettre
              à jour les identifiants ci-dessous.
            </p>
          </div>
        )}
      </Card>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {errorMessage}
        </div>
      )}

      {/* Identifiants */}
      <Card className="gap-0 py-0">
        <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4">
          <CardTitle className="text-sm">Identifiants du Guichet unique</CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            Vos identifiants du Guichet Unique sont nécessaires pour déposer les formalités au
            registre. Ils sont chiffrés et stockés dans votre cabinet uniquement — jamais partagés.
          </CardDescription>
        </CardHeader>

        <form action={saveInpiCredentials}>
          <input type="hidden" name="next" value={next} />

          <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
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
                className="font-mono"
              />
            </div>

            <div className="min-w-0 space-y-1.5">
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

            <div className="min-w-0 space-y-1.5 sm:col-span-2">
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
          </CardContent>

          <CardFooter className="flex-wrap justify-between gap-3 border-t bg-muted/40 px-5 py-3 [.border-t]:pt-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href={next}>
                <ArrowLeft className="size-4" />
                Annuler
              </Link>
            </Button>
            <Button type="submit" size="sm">
              {isReconfig ? 'Mettre à jour' : 'Connecter mon compte INPI'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <p className="text-xs leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">
          Vous n&apos;avez pas encore de compte INPI ?
        </span>{' '}
        Créez-le gratuitement sur{' '}
        <a
          href="https://procedures.inpi.fr/?/"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-0.5 font-mono font-medium text-primary hover:underline"
        >
          procedures.inpi.fr
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>{' '}
        puis revenez ici saisir vos identifiants.
      </p>
    </PageShell>
  );
}
