import { createClient } from '@/lib/supabase/server';
import { createWebhook, deleteWebhook, toggleWebhook } from '@/lib/server-actions/api-keys';
import { formatDate } from '@/lib/utils/format';

const EVENTS = [
  'dossier.created',
  'dossier.submitted',
  'dossier.amendment_requested',
  'dossier.validated_internal',
  'dossier.sent_to_inpi',
  'dossier.status_changed',
  'dossier.signed',
  'client.created',
];

export default async function WebhooksPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: webhooks } = await supabase
    .from('webhooks')
    .select('*')
    .order('created_at', { ascending: false });

  async function action(formData: FormData) {
    'use server';
    const r = await createWebhook(formData);
    const { redirect } = await import('next/navigation');
    if (r.error) redirect(`/settings/webhooks?e=${encodeURIComponent(r.error)}`);
    redirect('/settings/webhooks');
  }

  return (
    <div className="app-content with-bg">
      <div className="page-head">
        <div>
          <h1>Webhooks</h1>
          <p>Recevez les événements de Compta sur vos endpoints. Signés HMAC-SHA256 via <span className="mono">X-Compta-Signature</span>.</p>
        </div>
      </div>

      {sp.e && <div style={{ color: '#b42318', padding: 12, marginBottom: 16, fontSize: 13 }}>{sp.e}</div>}

      <div className="app-card" style={{ padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, marginBottom: 12 }}>Nouveau webhook</h3>
        <form action={action}>
          <input name="url" type="url" required placeholder="https://votre-app.com/webhooks/compta" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--ink-200)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', marginBottom: 12 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginBottom: 14 }}>
            {EVENTS.map((e) => (
              <label key={e} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid var(--ink-200)', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" name="events" value={e} style={{ accentColor: 'var(--accent)' }} />
                <span className="mono">{e}</span>
              </label>
            ))}
          </div>
          <button type="submit" className="btn btn-accent">Créer</button>
        </form>
      </div>

      <div className="app-card">
        <div className="app-card-head"><h3>Webhooks configurés</h3></div>
        {!webhooks?.length && <p style={{ padding: 24, color: 'var(--ink-500)', fontSize: 13, textAlign: 'center', margin: 0 }}>Aucun webhook.</p>}
        {webhooks?.map((w) => (
          <div key={w.id} style={{ padding: '14px 18px', borderTop: '1px solid var(--ink-100)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span className="mono" style={{ fontSize: 13, color: 'var(--ink-900)' }}>{w.url}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <form action={async () => { 'use server'; await toggleWebhook(w.id, !w.active); }}>
                  <button type="submit" className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>{w.active ? 'Désactiver' : 'Activer'}</button>
                </form>
                <form action={async () => { 'use server'; await deleteWebhook(w.id); }}>
                  <button type="submit" className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: '#b42318' }}>Supprimer</button>
                </form>
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>
              <span className={`pill ${w.active ? 'green' : 'gray'}`} style={{ fontSize: 10, marginRight: 8 }}>{w.active ? 'Actif' : 'Inactif'}</span>
              {(w.events || []).join(' · ')}
              {w.last_triggered_at && ` · Dernier : ${formatDate(w.last_triggered_at)}`}
              {w.failure_count > 0 && ` · ${w.failure_count} échec(s)`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
