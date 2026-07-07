import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { updateDossier } from '@/lib/server-actions/dossiers';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Select natif stylé : le formulaire poste via Server Action (FormData).
const selectClass =
  'border-input flex h-10 w-full cursor-pointer rounded-md border bg-card px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

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
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <nav>
        <Link
          href={`/dossiers/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Retour au dossier
        </Link>
      </nav>

      <div>
        <h1>Modifier le dossier</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Métadonnées de pilotage. Le contenu INPI s&apos;édite via{' '}
          <a
            href={`/app.html?route=nouveau&type=${dossier.forme_juridique || dossier.type_formalite}&d=${id}`}
            className="font-medium text-primary hover:underline"
          >
            le wizard
          </a>
          .
        </p>
      </div>

      <form action={action} className="space-y-6">
        <Card>
          <CardContent className="grid gap-4 pt-6">
            <div className="min-w-0 space-y-1.5">
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
        </Card>
        <div className="flex justify-end gap-2.5">
          <Button asChild variant="ghost">
            <Link href={`/dossiers/${id}`}>Annuler</Link>
          </Button>
          <Button type="submit">Enregistrer</Button>
        </div>
      </form>
    </div>
  );
}
