/* eslint-disable */
// Admin dossier detail — full page with observations thread + action buttons

const AdminDossierDetail = ({ dossierId, setRoute }) => {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [newObs, setNewObs] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(async () => {
    try {
      const d = await window.adminFetch(`/api/admin/dossiers/${dossierId}`);
      setData(d);
      setError(null);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [dossierId]);

  React.useEffect(() => { refresh(); }, [refresh]);

  if (loading) return <div className="app-content"><p>Chargement…</p></div>;
  if (error || !data) return <div className="app-content"><p style={{ color: '#b42318' }}>{error || 'Introuvable'}</p></div>;

  const d = data.dossier;
  const obs = data.observations || [];
  const docs = data.documents || [];
  const author = d.profiles ? `${d.profiles.first_name || ''} ${d.profiles.last_name || ''}`.trim() : '';
  const canValidate = d.statut === 'AWAITING_VALIDATION';

  const downloadDoc = async (path) => {
    const { data: u, error } = await window.supabaseClient.storage.from('dossier-docs').createSignedUrl(path, 300);
    if (error) return alert('Erreur : ' + error.message);
    window.open(u.signedUrl, '_blank');
  };

  const addObs = async () => {
    if (!newObs.trim()) return;
    setBusy(true);
    try {
      await window.adminFetch(`/api/dossiers/${dossierId}/observations`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newObs.trim() }),
      });
      setNewObs('');
      await refresh();
    } catch (e) { alert(e.message); }
    finally { setBusy(false); }
  };

  const requestAmendment = async () => {
    if (!newObs.trim()) return alert('Écris un message expliquant ce qui doit être corrigé.');
    if (!confirm('Renvoyer ce dossier au client pour correction ?')) return;
    setBusy(true);
    try {
      await window.adminFetch(`/api/admin/dossiers/${dossierId}/request-amendment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newObs.trim() }),
      });
      setNewObs('');
      await refresh();
    } catch (e) { alert(e.message); }
    finally { setBusy(false); }
  };

  const validate = async (sendToInpi) => {
    const verb = sendToInpi ? "valider ET envoyer à l'INPI" : 'valider en interne (sans envoi INPI)';
    if (!confirm(`Confirmer : ${verb} ?`)) return;
    setBusy(true);
    try {
      const r = await window.adminFetch(`/api/admin/dossiers/${dossierId}/validate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendToInpi }),
      });
      if (r.inpiError) alert("Validé en interne. INPI a refusé : " + r.inpiError);
      else if (r.inpi) alert('Envoyé à INPI ! ID : ' + r.inpi.id);
      else alert('Validé en interne.');
      await refresh();
    } catch (e) { alert(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="app-content with-bg">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, color: 'var(--ink-500)' }}>
        <button onClick={() => setRoute('queue')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-500)' }}>← Retour</button>
        <span>/</span>
        <span className="mono">{d.reference}</span>
      </div>

      <div className="page-head">
        <div>
          <h1 style={{ margin: 0 }}>{d.client_name}</h1>
          <p style={{ marginTop: 2 }}>
            {({ CREATION: 'Création AE', MODIFICATION: 'Modification', RADIATION: 'Radiation' })[d.type_formalite] || d.type_formalite}
            {' · '}<span className="mono">{d.reference}</span>
            {' · '}Soumis par {author || 'inconnu'}
          </p>
        </div>
        <window.StatusPill statut={d.statut} />
      </div>

      <div className="detail-grid">
        <div style={{ display: 'grid', gap: 20 }}>
          {/* Métadonnées INPI */}
          <div className="app-card">
            <div className="app-card-head"><h3>Données INPI saisies</h3></div>
            <div style={{ padding: 16 }}>
              <details style={{ fontSize: 12 }}>
                <summary style={{ cursor: 'pointer', color: 'var(--ink-600)', marginBottom: 8 }}>Voir le payload JSON complet</summary>
                <pre style={{ background: 'var(--ink-50)', padding: 12, borderRadius: 8, fontSize: 11, overflow: 'auto', maxHeight: 400 }}>
                  {JSON.stringify(d.inpi_content, null, 2)}
                </pre>
              </details>
            </div>
          </div>

          {/* Documents */}
          <div className="app-card">
            <div className="app-card-head"><h3>Pièces jointes ({docs.length})</h3></div>
            <div style={{ padding: 16, display: 'grid', gap: 10 }}>
              {docs.length === 0 && <p style={{ color: 'var(--ink-500)', fontSize: 13, padding: 12 }}>Aucune pièce uploadée.</p>}
              {docs.map(doc => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--ink-150)', borderRadius: 8 }}>
                  {window.I && <window.I.Doc size={18} style={{ color: 'var(--ink-500)' }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{doc.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>
                      {doc.size_bytes ? (doc.size_bytes / 1024).toFixed(0) + ' Ko · ' : ''}
                      {doc.doc_type ? doc.doc_type + ' · ' : ''}
                      {window.fmtDate ? window.fmtDate(doc.created_at) : doc.created_at}
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => downloadDoc(doc.file_path)}>Voir</button>
                </div>
              ))}
            </div>
          </div>

          {/* Observations */}
          <div className="app-card">
            <div className="app-card-head"><h3>Observations ({obs.length})</h3></div>
            <div style={{ padding: 18, display: 'grid', gap: 12 }}>
              {obs.length === 0 && <p style={{ color: 'var(--ink-500)', fontSize: 13 }}>Aucune observation.</p>}
              {obs.map(o => (
                <div key={o.id} style={{
                  padding: 12, borderRadius: 10,
                  background: o.author_role === 'admin' ? '#FEF3C7' : 'var(--ink-50)',
                  borderLeft: `3px solid ${o.author_role === 'admin' ? '#F59E0B' : 'var(--accent)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12, color: 'var(--ink-500)' }}>
                    <strong>{o.author_role === 'admin' ? 'Toi (admin)' : (author || 'Client')}</strong>
                    <span className="mono">{new Date(o.created_at).toLocaleString('fr-FR')}</span>
                  </div>
                  <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{o.message}</div>
                </div>
              ))}
              <div>
                <textarea value={newObs} onChange={e => setNewObs(e.target.value)} placeholder="Message pour le client…" rows={3}
                  style={{ width: '100%', padding: 10, border: '1px solid var(--ink-200)', borderRadius: 8, fontFamily: 'inherit', fontSize: 13, resize: 'vertical' }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={addObs} disabled={busy || !newObs.trim()}>Envoyer comme commentaire</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside style={{ display: 'grid', gap: 20 }}>
          <div className="app-card">
            <div className="app-card-head"><h3>Actions</h3></div>
            <div style={{ padding: 18, display: 'grid', gap: 10 }}>
              {canValidate ? (
                <>
                  <button className="btn btn-accent btn-lg" onClick={() => validate(true)} disabled={busy} style={{ background: 'var(--accent-ink)' }}>
                    Valider + envoyer à l'INPI
                  </button>
                  <button className="btn btn-accent btn-lg" onClick={() => validate(false)} disabled={busy}>
                    Valider sans envoi INPI
                  </button>
                  <button className="btn btn-ghost btn-lg" onClick={requestAmendment} disabled={busy}
                          style={{ border: '1px solid #F59E0B', color: '#92400E' }}>
                    Demander correction
                  </button>
                  <p style={{ fontSize: 11, color: 'var(--ink-500)', margin: 0, marginTop: 6 }}>
                    Pour "Demander correction" : écris d'abord un message dans le bloc Observations.
                  </p>
                </>
              ) : (
                <p style={{ color: 'var(--ink-500)', fontSize: 13, margin: 0 }}>
                  Aucune action requise. Statut actuel : <strong>{d.statut}</strong>
                </p>
              )}
            </div>
          </div>

          <div className="app-card">
            <div className="app-card-head"><h3>Informations</h3></div>
            <div>
              <DetailRow label="Type" value={d.type_formalite} />
              <DetailRow label="Référence" value={<span className="mono">{d.reference}</span>} />
              {d.siren && <DetailRow label="SIREN" value={<span className="mono">{d.siren}</span>} />}
              {d.inpi_reference && <DetailRow label="ID INPI" value={<span className="mono">{d.inpi_reference}</span>} />}
              <DetailRow label="Créé le" value={new Date(d.created_at).toLocaleDateString('fr-FR')} />
              <DetailRow label="Mis à jour" value={new Date(d.updated_at).toLocaleDateString('fr-FR')} last />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

const DetailRow = ({ label, value, last }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 22px', borderBottom: last ? 'none' : '1px solid var(--ink-100)',
    fontSize: 13, gap: 12,
  }}>
    <span style={{ color: 'var(--ink-500)' }}>{label}</span>
    <span style={{ color: 'var(--ink-900)', fontWeight: 500, textAlign: 'right' }}>{value}</span>
  </div>
);

window.AdminDossierDetail = AdminDossierDetail;
