import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { updateDossier } from '@/lib/server-actions/dossiers';

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
    <div className="app-content with-bg">
      <div style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 12 }}>
        <Link href={`/dossiers/${id}`} style={{ color: 'var(--ink-500)' }}>← Retour au dossier</Link>
      </div>

      <div className="page-head">
        <div>
          <h1>Modifier le dossier</h1>
          <p>Métadonnées de pilotage. Le contenu INPI s&apos;édite via <a href={`/app.html?route=nouveau&type=${dossier.forme_juridique || dossier.type_formalite}&d=${id}`} style={{ color: 'var(--accent-ink)' }}>le wizard</a>.</p>
        </div>
      </div>

      <form action={action} style={{ maxWidth: 640 }}>
        <div className="app-card" style={{ padding: 24, display: 'grid', gap: 14 }}>
          <Field label="Client lié">
            <select name="client_id" defaultValue={dossier.client_id || ''} style={selectStyle}>
              <option value="">— Aucun —</option>
              {(clients ?? []).map((c) => <option key={c.id} value={c.id}>{c.denomination}</option>)}
            </select>
          </Field>
          <Field label="Priorité">
            <select name="priority" defaultValue={dossier.priority || 'normal'} style={selectStyle}>
              <option value="low">Basse</option>
              <option value="normal">Normale</option>
              <option value="high">Haute</option>
              <option value="urgent">Urgente</option>
            </select>
          </Field>
          <Field label="Échéance interne">
            <input type="date" name="internal_due_date" defaultValue={dossier.internal_due_date || ''} style={inputStyle} />
          </Field>
          <Field label="Assigné à">
            <select name="assigned_to" defaultValue={dossier.assigned_to || ''} style={selectStyle}>
              <option value="">— Aucun —</option>
              {(memberships ?? []).map((m: any) => {
                const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
                return <option key={m.user_id} value={m.user_id}>{p?.first_name} {p?.last_name}</option>;
              })}
            </select>
          </Field>
          <Field label="Tags (séparés par virgule)">
            <input name="tags" defaultValue={(dossier.tags || []).join(', ')} placeholder="urgent, vip" style={inputStyle} />
          </Field>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <Link href={`/dossiers/${id}`} className="btn btn-ghost">Annuler</Link>
          <button type="submit" className="btn btn-accent">Enregistrer</button>
        </div>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid var(--ink-200)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' };
const selectStyle: React.CSSProperties = { ...inputStyle, background: 'white' };
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><label className="auth-label" style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>{label}</label>{children}</div>);
}
