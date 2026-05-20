import { createClient } from '@/lib/supabase/server';
import { createApiKey, revokeApiKey } from '@/lib/server-actions/api-keys';
import { formatDate } from '@/lib/utils/format';

export default async function ApiKeysPage({ searchParams }: { searchParams: Promise<{ token?: string; prefix?: string; e?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: keys } = await supabase
    .from('api_keys')
    .select('*')
    .order('created_at', { ascending: false });

  async function action(formData: FormData) {
    'use server';
    const r = await createApiKey(formData);
    const { redirect } = await import('next/navigation');
    if (r.error) redirect(`/settings/api-keys?e=${encodeURIComponent(r.error)}`);
    redirect(`/settings/api-keys?token=${encodeURIComponent(r.token!)}&prefix=${encodeURIComponent(r.prefix!)}`);
  }

  return (
    <div className="app-content with-bg">
      <div className="page-head">
        <div>
          <h1>Clés API</h1>
          <p>Pour intégrer Compta dans vos outils internes ou ceux de vos partenaires. Base URL : <span className="mono">https://vps-84ac2579.vps.ovh.net/v1/</span></p>
        </div>
      </div>

      {sp.token && (
        <div className="app-card" style={{ padding: 18, marginBottom: 16, background: '#FEF3C7', border: '1px solid #F59E0B' }}>
          <h3 style={{ fontSize: 14, margin: 0, color: '#92400E' }}>⚠ Copiez votre clé maintenant — elle ne sera plus jamais affichée</h3>
          <code style={{ display: 'block', padding: 12, marginTop: 12, background: 'white', borderRadius: 8, fontSize: 13, fontFamily: 'monospace', wordBreak: 'break-all' }}>{sp.token}</code>
        </div>
      )}

      {sp.e && <div style={{ color: '#b42318', padding: 12, marginBottom: 16, fontSize: 13 }}>{sp.e}</div>}

      <div className="app-card" style={{ padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, marginBottom: 12 }}>Nouvelle clé</h3>
        <form action={action} style={{ display: 'flex', gap: 10 }}>
          <input name="name" required placeholder="Nom (ex: Intégration Zapier)" style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--ink-200)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }} />
          <button type="submit" className="btn btn-accent">Créer</button>
        </form>
      </div>

      <div className="app-card">
        <div className="app-card-head"><h3>Clés actives</h3></div>
        {!keys?.length && <p style={{ padding: 24, color: 'var(--ink-500)', fontSize: 13, textAlign: 'center', margin: 0 }}>Aucune clé créée pour le moment.</p>}
        {keys?.map((k) => (
          <div key={k.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 80px', padding: '12px 18px', alignItems: 'center', gap: 12, borderTop: '1px solid var(--ink-100)', fontSize: 13 }}>
            <span style={{ fontWeight: 500 }}>{k.name}</span>
            <span className="mono" style={{ fontSize: 12, color: 'var(--ink-500)' }}>{k.prefix}…</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>{formatDate(k.created_at)}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>{k.last_used_at ? `Utilisée ${formatDate(k.last_used_at)}` : 'Jamais utilisée'}</span>
            {k.revoked_at ? <span className="pill red" style={{ fontSize: 10 }}>Révoquée</span> : (
              <form action={async () => { 'use server'; await revokeApiKey(k.id); }}>
                <button type="submit" className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: '#b42318' }}>Révoquer</button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
