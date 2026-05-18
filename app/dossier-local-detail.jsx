/* eslint-disable */
// Detail view for a local (DB-tracked) dossier with observations thread + workflow actions

const STATUT_FLOW = [
  { id: 'DRAFT',                      label: 'Brouillon',           tone: 'gray'   },
  { id: 'AWAITING_VALIDATION',        label: 'À valider',           tone: 'blue'   },
  { id: 'INTERNAL_AMENDMENT_PENDING', label: 'Correction demandée', tone: 'orange' },
  { id: 'VALIDATED_INTERNAL',         label: 'Validé en interne',   tone: 'green'  },
  { id: 'RECEIVED',                   label: 'Reçu par INPI',       tone: 'blue'   },
  { id: 'VALIDATED',                  label: 'Validé INPI',         tone: 'green'  },
];

const DossierLocalDetail = ({ dossier, setRoute }) => {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [newObs, setNewObs] = React.useState('');
  const [posting, setPosting] = React.useState(false);

  const localId = dossier?.localId || dossier?.id;

  const refresh = React.useCallback(async () => {
    try {
      const d = await window.ComptaAPI.fetchDossierDetail(localId);
      setData(d);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [localId]);

  React.useEffect(() => { refresh(); }, [refresh]);

  if (loading) return <div className="app-content"><p>Chargement…</p></div>;
  if (error || !data) return (
    <div className="app-content">
      <p style={{ color: '#b42318' }}>Erreur : {error || 'introuvable'}</p>
      <button className="btn btn-ghost" onClick={() => setRoute('dossiers')}>Retour</button>
    </div>
  );

  const d = data.dossier;
  const obs = data.observations || [];
  const docs = data.documents || [];
  const canSubmit = ['DRAFT', 'INTERNAL_AMENDMENT_PENDING'].includes(d.statut);

  const onAddObs = async () => {
    if (!newObs.trim()) return;
    setPosting(true);
    try {
      await window.ComptaAPI.addObservation(localId, newObs.trim());
      setNewObs('');
      await refresh();
    } catch (e) { alert('Erreur : ' + e.message); }
    finally { setPosting(false); }
  };

  const onSubmit = async () => {
    if (!confirm('Soumettre ce dossier à l\'admin pour validation ?')) return;
    try {
      await window.ComptaAPI.submitDossier(localId);
      await refresh();
    } catch (e) { alert('Erreur : ' + e.message); }
  };

  const status = STATUT_FLOW.find(s => s.id === d.statut) || { label: d.statut, tone: 'gray' };

  return (
    <div className="app-content with-bg">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, color: 'var(--ink-500)', flexWrap: 'wrap' }}>
        <button onClick={() => setRoute('dossiers')} className="btn-link" style={{ padding: '2px 8px', borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-500)' }}>
          Mes dossiers
        </button>
        <I.ChevRight size={12} />
        <span className="mono" style={{ color: 'var(--ink-900)' }}>{d.reference}</span>
      </div>

      <div className="page-head">
        <div>
          <h1 style={{ margin: 0 }}>{d.client_name}</h1>
          <p style={{ marginTop: 2 }}>{d.type_formalite} · <span className="mono">{d.reference}</span></p>
        </div>
        <StatusPill tone={status.tone} label={status.label} />
      </div>

      <div className="detail-grid">
        <div style={{ display: 'grid', gap: 20 }}>
          {/* Observations thread */}
          <div className="app-card">
            <div className="app-card-head">
              <h3>Observations</h3>
            </div>
            <div style={{ padding: 18, display: 'grid', gap: 12 }}>
              {obs.length === 0 && <p style={{ color: 'var(--ink-500)', fontSize: 13 }}>Aucune observation pour le moment.</p>}
              {obs.map(o => (
                <div key={o.id} style={{
                  padding: 12, borderRadius: 10,
                  background: o.author_role === 'admin' ? '#FEF3C7' : 'var(--ink-50)',
                  borderLeft: `3px solid ${o.author_role === 'admin' ? '#F59E0B' : 'var(--accent)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12, color: 'var(--ink-500)' }}>
                    <span style={{ fontWeight: 500 }}>{o.author_role === 'admin' ? 'Admin' : 'Vous'}</span>
                    <span className="mono">{new Date(o.created_at).toLocaleString('fr-FR')}</span>
                  </div>
                  <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{o.message}</div>
                </div>
              ))}
              <div style={{ marginTop: 8 }}>
                <textarea
                  value={newObs}
                  onChange={e => setNewObs(e.target.value)}
                  placeholder="Écrire une observation, une question…"
                  rows={3}
                  style={{ width: '100%', padding: 10, border: '1px solid var(--ink-200)', borderRadius: 8, fontFamily: 'inherit', fontSize: 13, resize: 'vertical' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button className="btn btn-accent btn-sm" onClick={onAddObs} disabled={posting || !newObs.trim()}>
                    {posting ? 'Envoi…' : 'Envoyer'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="app-card">
            <div className="app-card-head"><h3>Pièces du dossier</h3></div>
            <div style={{ padding: 16, display: 'grid', gap: 10 }}>
              {docs.length === 0 && <p style={{ color: 'var(--ink-500)', fontSize: 13, padding: 12 }}>Aucune pièce téléversée.</p>}
              {docs.map(doc => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--ink-150)', borderRadius: 8 }}>
                  <I.Doc size={18} style={{ color: 'var(--ink-500)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{doc.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>{doc.size_bytes ? (doc.size_bytes / 1024).toFixed(0) + ' Ko · ' : ''}{new Date(doc.created_at).toLocaleDateString('fr-FR')}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={async () => {
                    const url = await window.ComptaAPI.downloadDocumentUrl(doc.file_path);
                    window.open(url, '_blank');
                  }}>Télécharger</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside style={{ display: 'grid', gap: 20 }}>
          <div className="app-card">
            <div className="app-card-head"><h3>Actions</h3></div>
            <div style={{ padding: 18 }}>
              {canSubmit && (
                <button className="btn btn-accent btn-lg" style={{ width: '100%' }} onClick={onSubmit}>
                  Soumettre pour validation
                </button>
              )}
              {!canSubmit && <p style={{ color: 'var(--ink-500)', fontSize: 13, margin: 0 }}>Dossier {status.label.toLowerCase()}. Pas d'action requise pour le moment.</p>}
            </div>
          </div>

          <div className="app-card">
            <div className="app-card-head"><h3>Informations</h3></div>
            <div>
              <DetailRow label="Type" value={d.type_formalite} />
              <DetailRow label="SIREN" value={d.siren || '—'} />
              <DetailRow label="NAF" value={d.naf_code || '—'} />
              {d.inpi_reference && <DetailRow label="Référence INPI" value={<span className="mono">{d.inpi_reference}</span>} />}
              <DetailRow label="Créé le" value={new Date(d.created_at).toLocaleDateString('fr-FR')} last />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

window.DossierLocalDetail = DossierLocalDetail;
