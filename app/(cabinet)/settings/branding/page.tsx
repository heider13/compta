import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { updateBranding } from '@/lib/server-actions/branding';
import type { WhiteLabelConfig } from '@/lib/white-label';
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
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Marque blanche</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Personnalisez l&apos;apparence de l&apos;espace pour vos clients.
        </p>
      </header>

      {sp.saved && (
        <div className="mb-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
          Préférences enregistrées.
        </div>
      )}
      {sp.e && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {sp.e}
        </div>
      )}

      <form action={action}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identité du cabinet</CardTitle>
            <CardDescription>
              Ces réglages s&apos;appliquent à l&apos;espace client et aux emails envoyés en votre nom.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="company_name">Nom du cabinet (affiché)</Label>
              <Input id="company_name" name="company_name" defaultValue={cfg.company_name || org?.name || ''} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="logo_url">URL du logo (PNG/SVG, 64×64 conseillé)</Label>
              <Input id="logo_url" name="logo_url" type="url" defaultValue={cfg.logo_url || ''} placeholder="https://…" />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
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
                    className="font-mono"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
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

            <div className="space-y-1.5">
              <Label htmlFor="custom_domain">Domaine personnalisé (optionnel)</Label>
              <Input
                id="custom_domain"
                name="custom_domain"
                defaultValue={cfg.custom_domain || ''}
                placeholder="formalites.mon-cabinet.fr"
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
              />
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 flex justify-end">
          <Button type="submit">Enregistrer</Button>
        </div>
      </form>
    </div>
  );
}
