import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { prepareNewDossier } from '@/lib/server-actions/dossiers';

const FORMALITY_OPTIONS = [
  { group: 'Création', items: [
    { id: 'AE', label: 'Auto-entreprise' },
    { id: 'SASU', label: 'SASU' },
    { id: 'SAS', label: 'SAS' },
    { id: 'EURL', label: 'EURL' },
    { id: 'SARL', label: 'SARL' },
    { id: 'SCI', label: 'SCI' },
    { id: 'HOLDING', label: 'Holding' },
  ]},
  { group: 'Modification', items: [{ id: 'MODIFICATION', label: 'Modification' }] },
  { group: 'Cessation',    items: [{ id: 'RADIATION', label: 'Cessation / radiation' }] },
  { group: 'Conformité',   items: [
    { id: 'BE', label: 'Bénéficiaires effectifs' },
    { id: 'COMPTES', label: 'Dépôt comptes annuels' },
  ]},
];

export default async function NewDossierPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from('clients')
    .select('id, denomination, siren, forme_juridique')
    .is('archived_at', null)
    .order('denomination', { ascending: true });

  return (
    <div className="app-content with-bg">
      <div className="page-head">
        <div>
          <h1>Nouveau dossier</h1>
          <p>Choisis un client et un type de formalité. Le wizard détaillé s&apos;ouvrira ensuite.</p>
        </div>
      </div>

      <form action={prepareNewDossier} style={{ maxWidth: 720 }}>
        <div className="app-card" style={{ padding: 24, marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, marginBottom: 4 }}>Client</h3>
          <p style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 14 }}>
            Vous pouvez choisir un client existant ou <Link href="/clients/new" style={{ color: 'var(--accent-ink)' }}>en créer un nouveau</Link>.
          </p>
          <select name="client_id" defaultValue="" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--ink-200)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: 'white' }}>
            <option value="">— Sans client lié (vous pourrez l&apos;associer plus tard) —</option>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.denomination}{c.siren ? ` (${c.siren})` : ''}{c.forme_juridique ? ` · ${c.forme_juridique}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="app-card" style={{ padding: 24, marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Type de formalité</h3>
          <div style={{ display: 'grid', gap: 14 }}>
            {FORMALITY_OPTIONS.map((g) => (
              <div key={g.group}>
                <div style={{ fontSize: 11, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 8 }}>{g.group}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                  {g.items.map((it) => (
                    <label key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px solid var(--ink-200)', borderRadius: 8, cursor: 'pointer', fontSize: 14, background: 'white' }}>
                      <input type="radio" name="type" value={it.id} required style={{ accentColor: 'var(--accent)' }} />
                      <span>{it.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Link href="/dossiers" className="btn btn-ghost">Annuler</Link>
          <button type="submit" className="btn btn-accent btn-lg">
            Démarrer le wizard →
          </button>
        </div>
      </form>
    </div>
  );
}
