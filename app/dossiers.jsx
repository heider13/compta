/* eslint-disable */
// Dossiers list + Dossier detail (with timeline)

const ACTION_STATUSES = ['SIGNATURE_PENDING', 'AMENDMENT_PENDING', 'PAYMENT_PENDING', 'AMENDMENT_SIGNATURE_PENDING', 'AMENDMENT_PAYMENT_PENDING'];

const DossiersList = ({ setRoute, setActiveDossier, userRole }) => {
  const [filter, setFilter] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const [allRows, setAllRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [apiError, setApiError] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Client : seulement ses dossiers locaux (DB).
        // Admin : dossiers locaux + formalités INPI globales du compte mandataire.
        const local = await window.ComptaAPI.fetchLocalDossiers().catch(() => []);
        const inpi = userRole === 'admin'
          ? await window.ComptaAPI.fetchFormalites({ itemsPerPage: 100 }).catch(() => [])
          : [];
        const merged = [...local, ...inpi];
        if (!cancelled) {
          setAllRows(merged);
          setApiError(null);
        }
      } catch (e) {
        if (!cancelled) setApiError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userRole]);

  const FILTERS = React.useMemo(() => ([
    { id: 'all',    label: 'Tous',            count: allRows.length },
    { id: 'active', label: 'En cours',        count: allRows.filter(d => !['VALIDATED', 'REJECTED'].includes(d.statut)).length },
    { id: 'action', label: 'Action requise',  count: allRows.filter(d => ACTION_STATUSES.includes(d.statut)).length },
    { id: 'done',   label: 'Validés',         count: allRows.filter(d => d.statut === 'VALIDATED').length },
  ]), [allRows]);

  let rows = allRows;
  if (filter === 'active') rows = rows.filter(d => !['VALIDATED', 'REJECTED'].includes(d.statut));
  if (filter === 'action') rows = rows.filter(d => ACTION_STATUSES.includes(d.statut));
  if (filter === 'done') rows = rows.filter(d => d.statut === 'VALIDATED');
  if (query) rows = rows.filter(d => (d.client + d.id + d.type).toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="app-content with-bg">
      <div className="page-head">
        <div>
          <h1>Mes dossiers</h1>
          <p>
            {loading ? 'Chargement…' : `${allRows.length} dossiers · ${FILTERS.find(f => f.id === 'action').count} en attente d'action`}
            {apiError && <span style={{ color: '#b42318', marginLeft: 8, fontSize: 12 }}>· données de démo (API: {apiError})</span>}
          </p>
        </div>
        <button className="btn btn-accent" onClick={() => setRoute('nouveau')}>
          <I.Plus size={16} /> Nouveau dossier
        </button>
      </div>

      {/* Filters */}
      <div className="tabs">
        {FILTERS.map(f => (
          <button key={f.id} className={`tab ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>
            {f.label} <span style={{ color: 'var(--ink-400)', fontSize: 12 }}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="app-topbar-search" style={{ width: 360, background: 'white', border: '1px solid var(--ink-150)' }}>
          <I.Search size={14} style={{ color: 'var(--ink-400)' }} />
          <input placeholder="Rechercher par client, ID, type..." value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <button className="btn btn-ghost btn-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
          Filtres
        </button>
        <button className="btn btn-ghost btn-sm">
          <I.ArrowDR size={14} />
          Exporter
        </button>
      </div>

      <div className="app-card">
        <div className="app-table-head" style={{ gridTemplateColumns: '100px 1.4fr 1fr 1.2fr 100px 130px 40px' }}>
          <span>ID</span><span>Client</span><span>Formalité</span><span>NAF</span><span>Date</span><span>Statut</span><span></span>
        </div>
        {rows.length === 0 ? (
          <div style={{ padding: 64, textAlign: 'center', color: 'var(--ink-500)' }}>
            <I.Search size={32} style={{ opacity: 0.4, marginBottom: 12 }} />
            <div style={{ fontSize: 14 }}>
              {allRows.length === 0
                ? "Vous n'avez pas encore de dossier. Cliquez sur \"Nouveau dossier\" pour commencer."
                : 'Aucun dossier ne correspond à votre recherche.'}
            </div>
          </div>
        ) : rows.map(d => (
          <div key={d.id}
               onClick={() => { setActiveDossier(d); setRoute('dossier-detail'); }}
               className="app-table-row"
               style={{ gridTemplateColumns: '100px 1.4fr 1fr 1.2fr 100px 130px 40px' }}>
            <span className="mono" style={{ fontSize: 12, color: 'var(--ink-600)' }}>{d.id}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="avatar avatar-sm">{d.initials}</div>
              <span style={{ fontWeight: 500, fontSize: 14 }}>{d.client}</span>
            </span>
            <span style={{ color: 'var(--ink-700)', fontSize: 13 }}>{d.type}</span>
            <span style={{ color: 'var(--ink-500)', fontSize: 12 }} className="hide-md">{d.naf}</span>
            <span className="mono" style={{ color: 'var(--ink-500)', fontSize: 12 }}>{d.date}</span>
            <StatusPill tone={d.tone} label={d.label} />
            <span style={{ color: 'var(--ink-400)', display: 'flex', justifyContent: 'flex-end' }}>
              <I.ChevRight size={16} />
            </span>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 980px) {
          .hide-md { display: none; }
        }
        @media (max-width: 700px) {
          .app-table-head { display: none; }
          .app-table-row {
            grid-template-columns: 1fr auto !important;
            grid-template-areas:
              "avatar pill"
              "meta meta" !important;
            row-gap: 8px;
          }
          .app-table-row > :nth-child(1) { display: none; }
          .app-table-row > :nth-child(2) { grid-area: avatar; }
          .app-table-row > :nth-child(3) { grid-area: meta; font-size: 12px !important; color: var(--ink-500) !important; }
          .app-table-row > :nth-child(4) { display: none; }
          .app-table-row > :nth-child(5) { display: none; }
          .app-table-row > :nth-child(6) { grid-area: pill; }
          .app-table-row > :nth-child(7) { display: none; }
        }
      `}</style>
    </div>
  );
};

// ─── DETAIL ────────────────────────────────────────────────

const ALL_STATES = [
  { id: 'RECEIVED', label: 'Reçu par le GU', tone: 'blue' },
  { id: 'VALIDATION_PENDING', label: 'En cours de validation', tone: 'blue' },
  { id: 'AMENDMENT_PENDING', label: 'Régularisation demandée', tone: 'orange' },
  { id: 'PAYMENT_PENDING', label: 'En attente de paiement', tone: 'amber' },
  { id: 'SIGNATURE_PENDING', label: 'En attente de signature', tone: 'amber' },
  { id: 'VALIDATED', label: 'Validée — Kbis disponible', tone: 'green' },
  { id: 'REJECTED', label: 'Rejetée', tone: 'red' },
];

const TIMELINE_TEMPLATES = {
  VALIDATION_PENDING: ['RECEIVED', 'VALIDATION_PENDING'],
  AMENDMENT_PENDING: ['RECEIVED', 'VALIDATION_PENDING', 'AMENDMENT_PENDING'],
  SIGNATURE_PENDING: ['RECEIVED', 'SIGNATURE_PENDING'],
  PAYMENT_PENDING: ['RECEIVED', 'VALIDATION_PENDING', 'PAYMENT_PENDING'],
  VALIDATED: ['RECEIVED', 'VALIDATION_PENDING', 'VALIDATED'],
  REJECTED: ['RECEIVED', 'VALIDATION_PENDING', 'REJECTED'],
};

const TIMELINE_DETAILS = {
  RECEIVED: { date: '02 mai 2025 · 09:14', desc: 'Le Guichet Unique INPI a accusé réception de votre dossier.' },
  VALIDATION_PENDING: { date: '02 mai 2025 · 11:02', desc: "Un agent INPI examine la complétude des pièces et les contrôles métier." },
  AMENDMENT_PENDING: { date: '04 mai 2025 · 15:48', desc: "Justificatif de domicile illisible. Compta a re-soumis automatiquement une version corrigée." },
  SIGNATURE_PENDING: { date: '03 mai 2025 · 14:12', desc: 'Signature avancée requise. Vous avez reçu un email avec le lien de signature qualifiée.' },
  PAYMENT_PENDING: { date: '03 mai 2025 · 10:30', desc: 'Frais d\'immatriculation à régler. Paiement automatique configuré.' },
  VALIDATED: { date: '07 mai 2025 · 08:30', desc: 'Votre extrait Kbis est disponible dans l\'onglet Documents.' },
  REJECTED: { date: '07 mai 2025 · 09:20', desc: 'Activité incompatible avec le régime micro. Voir le motif détaillé.' },
};

const DossierDetail = ({ dossier, setRoute }) => {
  if (!dossier) {
    return (
      <div className="app-content">
        <button className="btn btn-ghost btn-sm" onClick={() => setRoute('dossiers')}>
          <I.ChevRight size={14} style={{ transform: 'rotate(180deg)' }} /> Retour
        </button>
        <div style={{ padding: 64, textAlign: 'center', color: 'var(--ink-500)' }}>
          Sélectionnez un dossier pour voir le détail.
        </div>
      </div>
    );
  }

  const states = TIMELINE_TEMPLATES[dossier.statut] || ['RECEIVED'];
  const isAmendment = dossier.statut === 'AMENDMENT_PENDING';
  const isSignature = dossier.statut === 'SIGNATURE_PENDING';
  const isValidated = dossier.statut === 'VALIDATED';

  return (
    <div className="app-content with-bg">
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, color: 'var(--ink-500)', flexWrap: 'wrap' }}>
        <button onClick={() => setRoute('dossiers')} className="btn-link" style={{ padding: '2px 8px', borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-500)' }}>
          Mes dossiers
        </button>
        <I.ChevRight size={12} />
        <span className="mono" style={{ color: 'var(--ink-900)' }}>{dossier.id}</span>
      </div>

      <div className="page-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <div className="avatar avatar-lg">{dossier.initials}</div>
            <div>
              <h1 style={{ margin: 0 }}>{dossier.client}</h1>
              <p style={{ marginTop: 2 }}>{dossier.type} · <span className="mono">{dossier.id}</span></p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isAmendment && (
            <button className="btn btn-accent">
              <I.Doc size={16} /> Téléverser la pièce
            </button>
          )}
          {isSignature && (
            <button className="btn btn-accent">
              <I.DocEdit size={16} /> Signer le dossier
            </button>
          )}
          {isValidated && (
            <button className="btn btn-accent">
              <I.ArrowDR size={16} /> Télécharger le Kbis
            </button>
          )}
          <button className="btn btn-ghost">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></svg>
          </button>
        </div>
      </div>

      <div className="detail-grid">
        <div style={{ display: 'grid', gap: 20 }}>
          {/* Status banner */}
          <div className="app-card" style={{
            background: isAmendment ? '#FFF7ED' : isValidated ? '#F0FDF4' : isSignature ? '#FFFBEB' : 'white',
            border: `1px solid ${isAmendment ? '#FED7AA' : isValidated ? '#BBF7D0' : isSignature ? '#FDE68A' : 'var(--ink-150)'}`,
          }}>
            <div className="app-card-pad" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className="pill" style={{
                width: 48, height: 48, borderRadius: 12,
                background: isAmendment ? '#FED7AA' : isValidated ? '#BBF7D0' : isSignature ? '#FDE68A' : 'var(--ink-100)',
                color: isAmendment ? '#9A3412' : isValidated ? '#166534' : isSignature ? '#854D0E' : 'var(--ink-700)',
                padding: 0, display: 'grid', placeItems: 'center',
              }}>
                {isAmendment ? <I.DocEdit size={22} /> : isValidated ? <I.Check size={22} /> : isSignature ? <I.Lock size={22} /> : <I.Clock size={22} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink-900)' }}>{dossier.label}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-600)', marginTop: 4 }}>
                  {TIMELINE_DETAILS[dossier.statut]?.desc}
                </div>
              </div>
              <span className="mono" style={{ fontSize: 12, color: 'var(--ink-500)' }}>
                Mis à jour {TIMELINE_DETAILS[dossier.statut]?.date}
              </span>
            </div>
          </div>

          {/* Timeline */}
          <div className="app-card">
            <div className="app-card-head"><h3>Suivi INPI</h3></div>
            <div style={{ padding: '28px 24px', position: 'relative' }}>
              {states.map((sid, i) => {
                const s = ALL_STATES.find(x => x.id === sid);
                const isLast = i === states.length - 1;
                const isFinal = i === states.length - 1 && (dossier.statut === sid);
                const isDone = !isLast || dossier.statut === 'VALIDATED';
                const t = TIMELINE_DETAILS[sid];
                return (
                  <div key={sid + i} style={{ display: 'grid', gridTemplateColumns: '36px 1fr', gap: 16, padding: '8px 0', position: 'relative' }}>
                    {!isLast && <div style={{
                      position: 'absolute', left: 17, top: 36, bottom: 0,
                      width: 2, background: isDone ? 'var(--accent)' : 'var(--ink-150)',
                    }} />}
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'white',
                      border: `2px solid ${isDone ? 'var(--accent)' : isFinal ? `var(--status-${s.tone === 'orange' ? 'orange' : s.tone})` : 'var(--ink-200)'}`,
                      display: 'grid', placeItems: 'center',
                      position: 'relative', zIndex: 1,
                    }}>
                      {isDone ? (
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'grid', placeItems: 'center' }}>
                          <I.Check size={12} />
                        </div>
                      ) : (
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 0 4px color-mix(in oklab, var(--accent) 20%, transparent)' }} />
                      )}
                    </div>
                    <div style={{ paddingTop: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-900)' }}>{s.label}</span>
                        {isLast && <StatusPill tone={s.tone} label="EN COURS" />}
                      </div>
                      <div className="mono" style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 4 }}>{t.date}</div>
                      <div style={{ fontSize: 13, color: 'var(--ink-600)', marginTop: 6, maxWidth: 520 }}>{t.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Documents */}
          <div className="app-card">
            <div className="app-card-head">
              <h3>Pièces du dossier</h3>
              <button className="btn btn-link btn-sm">+ Ajouter</button>
            </div>
            <div style={{ padding: 16, display: 'grid', gap: 10 }}>
              <DocRow icon="Doc" name="Pièce d'identité.pdf" size="0.8 Mo" date="02 mai 25" status="ok" />
              <DocRow icon="Doc" name="Justificatif de domicile.pdf" size="1.2 Mo" date="02 mai 25"
                status={isAmendment ? 'error' : 'ok'} />
              {isValidated && <DocRow icon="DocPlus" name="Extrait Kbis.pdf" size="0.4 Mo" date="07 mai 25" status="success" />}
              {isValidated && <DocRow icon="DocPlus" name="Avis SIRENE.pdf" size="0.3 Mo" date="07 mai 25" status="success" />}
            </div>
          </div>
        </div>

        {/* Side: meta */}
        <aside style={{ display: 'grid', gap: 20 }}>
          <div className="app-card">
            <div className="app-card-head"><h3>Informations</h3></div>
            <div style={{ padding: 0 }}>
              <DetailRow label="Type de formalité" value={dossier.type} />
              <DetailRow label="Référence INPI" value={<span className="mono">J00010000{dossier.id.slice(-3)}</span>} />
              {dossier.siren && <DetailRow label="SIREN" value={<span className="mono">{dossier.siren}</span>} />}
              <DetailRow label="Activité (NAF)" value={dossier.naf} />
              <DetailRow label="Nature" value="Libérale" />
              <DetailRow label="Date de dépôt" value={dossier.date} />
              <DetailRow label="Signature" value={isSignature ? 'Avancée RGS' : 'Simple'} last />
            </div>
          </div>

          <div className="app-card">
            <div className="app-card-head"><h3>Paiement</h3></div>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-600)', marginBottom: 8 }}>
                <span>Frais Compta</span>
                <span className="mono">49,00 €</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-600)' }}>
                <span>Frais INPI</span>
                <span className="mono">0,00 €</span>
              </div>
              <div style={{ height: 1, background: 'var(--ink-150)', margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 500 }}>
                <span>Total payé</span>
                <span className="mono" style={{ color: 'var(--accent-ink)' }}>49,00 €</span>
              </div>
              <div style={{ marginTop: 14, fontSize: 12, color: 'var(--ink-500)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <I.Check size={13} style={{ color: 'var(--status-green)' }} />
                Payé par CB · ****4242 · 02/05/25
              </div>
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

const DocRow = ({ icon, name, size, date, status }) => (
  <div className="doc-row">
    <div className="doc-ico">{React.createElement(I[icon], { size: 18 })}</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 500, color: 'var(--ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
      <div className="mono" style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 2 }}>{size} · {date}</div>
    </div>
    {status === 'ok' && <StatusPill tone="gray" label="Transmis" dot={false} />}
    {status === 'success' && <StatusPill tone="green" label="Officiel" />}
    {status === 'error' && <StatusPill tone="red" label="À corriger" />}
    <button className="icon-btn" style={{ width: 32, height: 32 }}>
      <I.ArrowDR size={14} />
    </button>
  </div>
);

window.DossiersList = DossiersList;
window.DossierDetail = DossierDetail;
