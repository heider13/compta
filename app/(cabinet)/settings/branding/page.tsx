import { redirect } from 'next/navigation';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { updateBranding } from '@/lib/server-actions/branding';
import type { WhiteLabelConfig } from '@/lib/white-label';
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
import { PageHeader, PageShell } from '@/components/cabinet/PageHeader';

export default async function BrandingPage({ searchParams }: { searchParams: Promise<{ saved?: string; e?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: m } = await supabase
    .from('memberships')
    .select('organization_id, organizations(name, white_label_config)')
    .eq('user_id', user.id)
    .limit(1)
    .single();
  const org = m?.organizations as { name?: string; white_label_config?: WhiteLabelConfig } | undefined;
  const cfg: WhiteLabelConfig = org?.white_label_config || {};

  async function action(formData: FormData) {
    'use server';
    const r = await updateBranding(formData);
    redirect(r.error ? `/settings/branding?e=${encodeURIComponent(r.error)}` : '/settings/branding?saved=1');
  }

  return (
    <PageShell className="max-w-4xl">
      <PageHeader
        eyebrow="Réglages · Apparence"
        title="Marque blanche"
        description="Personnalisez l'apparence de l'espace pour vos clients."
      />

      {sp.saved && (
        <div className="flex items-center gap-2.5 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm">
          <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
          Préférences enregistrées.
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

      <form action={action}>
        <Card className="gap-0 py-0">
          <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4">
            <CardTitle className="text-sm">Identité du cabinet</CardTitle>
            <CardDescription className="text-xs">
              Ces réglages s&apos;appliquent à l&apos;espace client et aux emails envoyés en votre nom.
            </CardDescription>
          </CardHeader>

          <CardContent className="divide-y p-0">
            {/* Identité visuelle */}
            <section className="grid gap-4 p-5 md:grid-cols-[200px_1fr] md:gap-8">
              <div className="space-y-1">
                <h2 className="text-sm font-medium">Identité</h2>
                <p className="text-xs text-muted-foreground">Nom et logo affichés à vos clients.</p>
              </div>
              <div className="min-w-0 space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="company_name">Nom du cabinet (affiché)</Label>
                  <Input id="company_name" name="company_name" defaultValue={cfg.company_name || org?.name || ''} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="logo_url">URL du logo (PNG/SVG, 64×64 conseillé)</Label>
                  <Input
                    id="logo_url"
                    name="logo_url"
                    type="url"
                    defaultValue={cfg.logo_url || ''}
                    placeholder="https://…"
                    className="font-mono"
                  />
                </div>
              </div>
            </section>

            {/* Couleurs */}
            <section className="grid gap-4 p-5 md:grid-cols-[200px_1fr] md:gap-8">
              <div className="space-y-1">
                <h2 className="text-sm font-medium">Couleurs</h2>
                <p className="text-xs text-muted-foreground">Valeurs hexadécimales.</p>
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="min-w-0 space-y-1.5">
                  <Label htmlFor="primary_color_picker">Couleur principale</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="primary_color_picker"
                      name="primary_color"
                      type="color"
                      defaultValue={cfg.primary_color || '#5B36D6'}
                      className="border-input size-9 shrink-0 cursor-pointer rounded-md border p-0.5"
                    />
                    <Input
                      name="primary_color"
                      defaultValue={cfg.primary_color || '#5B36D6'}
                      placeholder="#5B36D6"
                      aria-label="Couleur principale (hexadécimal)"
                      className="font-mono"
                    />
                  </div>
                </div>
                <div className="min-w-0 space-y-1.5">
                  <Label htmlFor="secondary_color">Couleur secondaire (soft)</Label>
                  <Input
                    id="secondary_color"
                    name="secondary_color"
                    defaultValue={cfg.secondary_color || ''}
                    placeholder="#ECE6FF"
                    className="font-mono"
                  />
                </div>
              </div>
            </section>

            {/* Domaine et emails */}
            <section className="grid gap-4 p-5 md:grid-cols-[200px_1fr] md:gap-8">
              <div className="space-y-1">
                <h2 className="text-sm font-medium">Domaine et emails</h2>
                <p className="text-xs text-muted-foreground">Adresse de l&apos;espace client et expéditeur des notifications.</p>
              </div>
              <div className="min-w-0 space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="custom_domain">Domaine personnalisé (optionnel)</Label>
                  <Input
                    id="custom_domain"
                    name="custom_domain"
                    defaultValue={cfg.custom_domain || ''}
                    placeholder="formalites.mon-cabinet.fr"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Configurez un CNAME vers{' '}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">compta-navy.vercel.app</code> et
                    ajoutez le domaine dans Vercel.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="custom_email_from">Email d&apos;envoi (notifications client)</Label>
                  <Input
                    id="custom_email_from"
                    name="custom_email_from"
                    defaultValue={cfg.custom_email_from || ''}
                    placeholder="Cabinet Dupont <contact@mon-cabinet.fr>"
                    className="font-mono"
                  />
                </div>
              </div>
            </section>
          </CardContent>

          <CardFooter className="flex-wrap justify-between gap-3 border-t bg-muted/40 px-5 py-3 [.border-t]:pt-3">
            <p className="text-xs text-muted-foreground">Appliqué à l&apos;espace client dès l&apos;enregistrement.</p>
            <Button type="submit" size="sm">Enregistrer</Button>
          </CardFooter>
        </Card>
      </form>
    </PageShell>
  );
}
