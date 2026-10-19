import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { updateDossier } from '@/lib/server-actions/dossiers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, PageShell } from '@/components/cabinet/PageHeader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Select natif stylé : le formulaire poste via Server Action (FormData).
const selectClass =
  'border-input flex h-9 w-full cursor-pointer rounded-md border bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

export default async function EditDossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: dossier } = await supabase.from('dossiers').select('*').eq('id', id).single();
  if (!dossier) notFound();
  const { data: clients } = await supabase.from('clients').select('id, denomination').is('archived_at', null).order('denomination');
  const { data: memberships } = await supabase.from('memberships').select('user_id, profiles!inner(first_name, last_name)').eq('organization_id', dossier.organization_id);

  async function action(formData: FormData) {
    'use server';
    await updateDossier(id, {
      client_id: formData.get('client_id') || null,
      priority: formData.get('priority') || 'normal',
      internal_due_date: formData.get('internal_due_date') || null,
      assigned_to: formData.get('assigned_to') || null,
      tags: String(formData.get('tags') || '').split(',').map((t) => t.trim()).filter(Boolean),
    });
    redirect(`/dossiers/${id}`);
  }

  return (
    <PageShell className="max-w-3xl">
      <PageHeader
        eyebrow={
          <Link href={`/dossiers/${id}`} className="inline-flex items-center gap-1.5 text-inherit no-underline hover:text-foreground">
            <ArrowLeft className="size-3" />
            Retour au dossier
            {dossier.reference && <span className="normal-case tracking-normal">· {dossier.reference}</span>}
          </Link>
        }
        title="Modifier le dossier"
        description={
          <>
            Métadonnées de pilotage. Le contenu INPI s&apos;édite via{' '}
            <a
              href={`/app.html?route=nouveau&type=${dossier.forme_juridique || dossier.type_formalite}&d=${id}`}
              className="font-medium text-primary hover:underline"
            >
              le wizard
            </a>
            .
          </>
        }
      />

      <form action={action}>
        <Card className="gap-0 py-0">
          <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4">
            <CardTitle className="text-sm">Pilotage</CardTitle>
            <CardDescription className="text-xs">{dossier.client_name}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5 sm:col-span-2">
              <Label htmlFor="client_id">Client lié</Label>
              <select id="client_id" name="client_id" defaultValue={dossier.client_id || ''} className={selectClass}>
                <option value="">— Aucun —</option>
                {(clients ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.denomination}</option>
                ))}
              </select>
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="priority">Priorité</Label>
              <select id="priority" name="priority" defaultValue={dossier.priority || 'normal'} className={selectClass}>
                <option value="low">Basse</option>
                <option value="normal">Normale</option>
                <option value="high">Haute</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="internal_due_date">Échéance interne</Label>
              <Input
                id="internal_due_date"
                type="date"
                name="internal_due_date"
                defaultValue={dossier.internal_due_date || ''}
                className="font-mono tabular-nums"
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="assigned_to">Assigné à</Label>
              <select id="assigned_to" name="assigned_to" defaultValue={dossier.assigned_to || ''} className={selectClass}>
                <option value="">— Aucun —</option>
                {(memberships ?? []).map((m: any) => {
                  const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
                  return (
                    <option key={m.user_id} value={m.user_id}>
                      {p?.first_name} {p?.last_name}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="tags">Tags (séparés par virgule)</Label>
              <Input id="tags" name="tags" defaultValue={(dossier.tags || []).join(', ')} placeholder="urgent, vip" />
            </div>
          </CardContent>
          <div className="flex justify-end gap-2 border-t bg-muted/40 px-5 py-4">
            <Button asChild variant="ghost">
              <Link href={`/dossiers/${id}`}>Annuler</Link>
            </Button>
            <Button type="submit">Enregistrer</Button>
          </div>
        </Card>
      </form>
    </PageShell>
  );
}
