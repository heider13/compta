/* eslint-disable */
// Admin pages: Dashboard, Queue, AllDossiers, InpiList, Clients, ClientDetail, Parametres

const TYPE_LABEL = { CREATION: 'Création AE', MODIFICATION: 'Modification', RADIATION: 'Radiation' };

const ADMIN_STATUS = {
  DRAFT:                       { label: 'Brouillon',           cls: 'gray',   group: 'En cours' },
  AWAITING_VALIDATION:         { label: 'À valider',           cls: 'blue',   group: 'Action requise' },
  INTERNAL_AMENDMENT_PENDING:  { label: 'En correction',       cls: 'orange', group: 'En cours' },
  VALIDATED_INTERNAL:          { label: 'Validé interne',      cls: 'green',  group: 'En cours' },
  RECEIVED:                    { label: 'Reçu INPI',           cls: 'blue',   group: 'À l\'INPI' },
  VALIDATION_PENDING:          { label: 'Validation INPI',     cls: 'blue',   group: 'À l\'INPI' },
  AMENDMENT_PENDING:           { label: 'Régularisation INPI', cls: 'orange', group: 'À l\'INPI' },
  PAYMENT_PENDING:             { label: 'Paiement INPI',       cls: 'amber',  group: 'À l\'INPI' },
  SIGNATURE_PENDING:           { label: 'Signature INPI',      cls: 'amber',  group: 'À l\'INPI' },
  VALIDATED:                   { label: 'Validé INPI',         cls: 'green',  group: 'Terminé' },
  REJECTED:                    { label: 'Rejeté INPI',         cls: 'red',    group: 'Terminé' },
};

function fmtDate(iso, withTime) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (withTime) return d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function initialsFromName(first, last) {
  return ((first || '?').charAt(0) + (last || '').charAt(0)).toUpperCase();
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const StatusPill = ({ statut }) => {
  const s = ADMIN_STATUS[statut] || { label: statut, cls: 'gray' };
  return <span className={`pill ${s.cls}`} style={{ fontSize: 11 }}><span className="dot"></span>{s.label}</span>;
};

// ─── DASHBOARD ───────────────────────────────────────────────────
const AdminDashboard = ({ setRoute, me }) => {
  const [stats, setStats] = React.useState(null);
  const [recent, setRecent] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const [s, d] = await Promise.all([
          window.adminFetch('/api/admin/stats'),
          window.adminFetch('/api/admin/dossiers'),
        ]);
        setStats(s);
        setRecent((d.items || []).slice(0, 5));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="app-content"><p>Chargement…</p></div>;

  const awaiting = stats?.byStatut?.AWAITING_VALIDATION || 0;
  const amendment = stats?.byStatut?.INTERNAL_AMENDMENT_PENDING || 0;
  const validated = (stats?.byStatut?.VALIDATED || 0) + (stats?.byStatut?.VALIDATED_INTERNAL || 0);

  return (
    <div className="app-content with-bg">
      <div className="page-head">
        <div>
          <h1>Tableau de bord</h1>
          <p>Bienvenue {me.first_name}. Voici l'activité de la plateforme.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <KpiCard label="À valider" value={awaiting} action={awaiting > 0 ? () => setRoute('queue') : null} accent="#3B82F6" />
        <KpiCard label="En correction" value={amendment} action={amendment > 0 ? () => setRoute('queue') : null} accent="#F59E0B" />
        <KpiCard label="Total clients" value={stats?.totalClients || 0} action={() => setRoute('clients')} accent="#8B5CF6" />
        <KpiCard label="Total dossiers" value={stats?.totalDossiers || 0} action={() => setRoute('dossiers')} accent="#10B981" />
      </div>

      <div className="detail-grid">
        <div className="app-card">
          <div className="app-card-head"><h3>Activité récente</h3></div>
          <div style={{ padding: 0 }}>
            {recent.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-500)', fontSize: 13 }}>Aucun dossier pour l'instant.</div>}
            {recent.map(d => (
              <RowCompact key={d.id} dossier={d} onClick={() => setRoute('dossiers', { id: d.id })} />
            ))}
          </div>
        </div>

        <aside style={{ display: 'grid', gap: 16 }}>
          <div className="app-card">
            <div className="app-card-head"><h3>Répartition</h3></div>
            <div style={{ padding: 18 }}>
              <BreakdownBars data={stats?.byStatut || {}} labels={ADMIN_STATUS} />
            </div>
          </div>
          <div className="app-card">
            <div className="app-card-head"><h3>Par type</h3></div>
            <div style={{ padding: 18, display: 'grid', gap: 10 }}>
              {Object.entries(stats?.byType || {}).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--ink-700)' }}>{TYPE_LABEL[k] || k}</span>
                  <span className="mono" style={{ fontWeight: 500 }}>{v}</span>
                </div>
              ))}
              {Object.keys(stats?.byType || {}).length === 0 && <span style={{ color: 'var(--ink-500)', fontSize: 13 }}>—</span>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

const KpiCard = ({ label, value, accent, action }) => (
  <div
    onClick={action || (() => {})}
    style={{
      background: 'white', border: '1px solid var(--ink-150)', borderRadius: 12, padding: 18,
      cursor: action ? 'pointer' : 'default', borderLeft: `3px solid ${accent}`,
      transition: 'all .15s', position: 'relative',
    }}
    onMouseEnter={e => { if (action) { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
  >
    <div style={{ fontSize: 11, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: 0.06, fontWeight: 500, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--ink-900)' }}>{value}</div>
  </div>
);

const BreakdownBars = ({ data, labels }) => {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) return <span style={{ color: 'var(--ink-500)', fontSize: 13 }}>Aucune donnée</span>;
  const colors = { gray: '#9CA3AF', blue: '#3B82F6', orange: '#F59E0B', amber: '#F59E0B', green: '#10B981', red: '#EF4444' };
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {Object.entries(data).sort((a, b) => b[1] - a[1]).map(([k, v]) => {
        const cfg = labels[k] || { label: k, cls: 'gray' };
        const pct = Math.round((v / total) * 100);
        return (
          <div key={k}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: 'var(--ink-700)' }}>{cfg.label}</span>
              <span className="mono" style={{ color: 'var(--ink-500)' }}>{v} ({pct}%)</span>
            </div>
            <div style={{ height: 6, background: 'var(--ink-100)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: pct + '%', background: colors[cfg.cls] || '#9CA3AF', transition: 'width .3s' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const RowCompact = ({ dossier, onClick }) => {
  const author = dossier.profiles ? `${dossier.profiles.first_name || ''} ${dossier.profiles.last_name || ''}`.trim() : '';
  return (
    <div onClick={onClick} style={{
      display: 'grid', gridTemplateColumns: '90px 1.4fr 0.8fr 100px 130px',
      padding: '12px 18px', alignItems: 'center', gap: 12, cursor: 'pointer', borderTop: '1px solid var(--ink-100)',
      fontSize: 13,
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--ink-50)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <span className="mono" style={{ color: 'var(--ink-500)', fontSize: 11 }}>{dossier.reference || dossier.id.slice(0, 8)}</span>
      <div>
        <div style={{ fontWeight: 500 }}>{dossier.client_name}</div>
        {author && <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>par {author}</div>}
      </div>
      <span style={{ color: 'var(--ink-700)' }}>{TYPE_LABEL[dossier.type_formalite] || dossier.type_formalite}</span>
      <span className="mono" style={{ color: 'var(--ink-500)', fontSize: 11 }}>{fmtDate(dossier.updated_at || dossier.created_at)}</span>
      <StatusPill statut={dossier.statut} />
    </div>
  );
};

// ─── QUEUE ─────────────────────────────────────────────────────
const AdminQueue = ({ setRoute }) => {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const d = await window.adminFetch('/api/admin/dossiers');
        setItems(d.items || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="app-content"><p>Chargement…</p></div>;
  const awaiting = items.filter(i => i.statut === 'AWAITING_VALIDATION');
  const amendment = items.filter(i => i.statut === 'INTERNAL_AMENDMENT_PENDING');

  return (
    <div className="app-content with-bg">
      <div className="page-head">
        <div>
          <h1>À valider</h1>
          <p>{awaiting.length} dossier{awaiting.length > 1 ? 's' : ''} en attente de ta validation, {amendment.length} en correction.</p>
        </div>
      </div>

      <div className="app-card" style={{ marginBottom: 20 }}>
        <div className="app-card-head"><h3>En attente de validation</h3></div>
        {awaiting.length === 0
          ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-500)' }}>Aucun dossier à valider pour l'instant.</div>
          : awaiting.map(d => <RowCompact key={d.id} dossier={d} onClick={() => setRoute('dossiers', { id: d.id })} />)}
      </div>

      <div className="app-card">
        <div className="app-card-head"><h3>En correction chez le client</h3></div>
        {amendment.length === 0
          ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-500)' }}>Aucun dossier en correction.</div>
          : amendment.map(d => <RowCompact key={d.id} dossier={d} onClick={() => setRoute('dossiers', { id: d.id })} />)}
      </div>
    </div>
  );
};

// ─── ALL DOSSIERS ──────────────────────────────────────────────
const AdminAllDossiers = ({ setRoute }) => {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState('all');
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    (async () => {
      try {
        const d = await window.adminFetch('/api/admin/dossiers');
        setItems(d.items || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="app-content"><p>Chargement…</p></div>;

  const filters = [
    { id: 'all',       label: 'Tous',          count: items.length },
    { id: 'active',    label: 'En cours',      count: items.filter(d => ADMIN_STATUS[d.statut]?.group === 'En cours' || ADMIN_STATUS[d.statut]?.group === 'Action requise').length },
    { id: 'awaiting',  label: 'À valider',     count: items.filter(d => d.statut === 'AWAITING_VALIDATION').length },
    { id: 'inpi',      label: "À l'INPI",      count: items.filter(d => ADMIN_STATUS[d.statut]?.group === "À l'INPI").length },
    { id: 'done',      label: 'Validés',       count: items.filter(d => d.statut === 'VALIDATED').length },
  ];
  let rows = items;
  if (filter === 'active') rows = rows.filter(d => ['En cours', 'Action requise'].includes(ADMIN_STATUS[d.statut]?.group));
  if (filter === 'awaiting') rows = rows.filter(d => d.statut === 'AWAITING_VALIDATION');
  if (filter === 'inpi') rows = rows.filter(d => ADMIN_STATUS[d.statut]?.group === "À l'INPI");
  if (filter === 'done') rows = rows.filter(d => d.statut === 'VALIDATED');
  if (query) {
    const q = query.toLowerCase();
    rows = rows.filter(d => (d.client_name || '').toLowerCase().includes(q) || (d.reference || '').toLowerCase().includes(q));
  }

  return (
    <div className="app-content with-bg">
      <div className="page-head">
        <div>
          <h1>Tous les dossiers</h1>
          <p>{items.length} dossier{items.length > 1 ? 's' : ''} suivis sur la plateforme.</p>
        </div>
      </div>

      <div className="tabs">
        {filters.map(f => (
          <button key={f.id} className={`tab ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>
            {f.label} <span style={{ color: 'var(--ink-400)', fontSize: 12 }}>{f.count}</span>
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="app-topbar-search" style={{ width: 360, background: 'white', border: '1px solid var(--ink-150)' }}>
          {window.I && <window.I.Search size={14} style={{ color: 'var(--ink-400)' }} />}
          <input placeholder="Rechercher par client, référence…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="app-card">
        {rows.length === 0
          ? <div style={{ padding: 64, textAlign: 'center', color: 'var(--ink-500)', fontSize: 14 }}>Aucun dossier ne correspond.</div>
          : rows.map(d => <RowCompact key={d.id} dossier={d} onClick={() => setRoute('dossiers', { id: d.id })} />)}
      </div>
    </div>
  );
};

// ─── INPI LIST (les 66 formalités du compte mandataire) ────────
const AdminInpiList = () => {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    (async () => {
      try {
        const d = await window.adminFetch('/api/formalites?itemsPerPage=200');
        setItems(d.items || []);
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="app-content"><p>Chargement INPI…</p></div>;
  if (error) return <div className="app-content"><p style={{ color: '#b42318' }}>Erreur INPI : {error}</p></div>;

  const rows = query
    ? items.filter(i => (i.companyName || '').toLowerCase().includes(query.toLowerCase()) || (i.liasseNumber || '').toLowerCase().includes(query.toLowerCase()))
    : items;

  return (
    <div className="app-content with-bg">
      <div className="page-head">
        <div>
          <h1>Formalités INPI</h1>
          <p>{items.length} formalités présentes sur ton compte mandataire INPI (lecture seule).</p>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="app-topbar-search" style={{ width: 360, background: 'white', border: '1px solid var(--ink-150)' }}>
          {window.I && <window.I.Search size={14} style={{ color: 'var(--ink-400)' }} />}
          <input placeholder="Rechercher par nom ou liasse…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="app-card">
        <div className="app-table-head" style={{ gridTemplateColumns: '140px 1.5fr 1fr 1fr 130px' }}>
          <span>Liasse</span><span>Client</span><span>Type</span><span>Statut INPI</span><span>Date</span>
        </div>
        {rows.length === 0
          ? <div style={{ padding: 64, textAlign: 'center', color: 'var(--ink-500)' }}>Aucune formalité ne correspond.</div>
          : rows.map(f => (
              <div key={f.id} className="app-table-row" style={{ gridTemplateColumns: '140px 1.5fr 1fr 1fr 130px', padding: '12px 18px' }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>{f.liasseNumber || '—'}</span>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{f.companyName}</span>
                <span style={{ color: 'var(--ink-700)', fontSize: 13 }}>{({ C: 'Création', M: 'Modification', R: 'Radiation' })[f.typeFormalite] || f.typeFormalite}</span>
                <StatusPill statut={f.status} />
                <span className="mono" style={{ color: 'var(--ink-500)', fontSize: 11 }}>{fmtDate(f.statusDate)}</span>
              </div>
            ))}
      </div>
    </div>
  );
};

// ─── CLIENTS ───────────────────────────────────────────────────
const AdminClients = ({ setRoute }) => {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    (async () => {
      try {
        const d = await window.adminFetch('/api/admin/clients');
        setItems(d.items || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="app-content"><p>Chargement…</p></div>;

  const rows = query
    ? items.filter(c => ((c.first_name || '') + ' ' + (c.last_name || '') + ' ' + (c.email || '')).toLowerCase().includes(query.toLowerCase()))
    : items;

  return (
    <div className="app-content with-bg">
      <div className="page-head">
        <div>
          <h1>Clients</h1>
          <p>{items.length} client{items.length > 1 ? 's' : ''} inscrits sur la plateforme.</p>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="app-topbar-search" style={{ width: 360, background: 'white', border: '1px solid var(--ink-150)' }}>
          {window.I && <window.I.Search size={14} style={{ color: 'var(--ink-400)' }} />}
          <input placeholder="Rechercher par nom ou email…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="app-card">
        <div className="app-table-head" style={{ gridTemplateColumns: '40px 1.5fr 1.4fr 100px 100px 130px' }}>
          <span></span><span>Nom</span><span>Email</span><span>Dossiers</span><span>Actifs</span><span>Inscrit</span>
        </div>
        {rows.length === 0
          ? <div style={{ padding: 64, textAlign: 'center', color: 'var(--ink-500)' }}>Aucun client.</div>
          : rows.map(c => (
              <div key={c.id} className="app-table-row" onClick={() => setRoute('clients', { client: c.id })}
                   style={{ gridTemplateColumns: '40px 1.5fr 1.4fr 100px 100px 130px', cursor: 'pointer', padding: '12px 18px' }}>
                <div className="avatar avatar-sm">{initialsFromName(c.first_name, c.last_name)}</div>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{c.first_name} {c.last_name}</span>
                <span style={{ fontSize: 13, color: 'var(--ink-600)' }}>{c.email}</span>
                <span className="mono" style={{ fontSize: 12 }}>{c.dossier_counts.total}</span>
                <span className="mono" style={{ fontSize: 12, color: c.dossier_counts.active > 0 ? 'var(--accent-ink)' : 'var(--ink-500)' }}>{c.dossier_counts.active}</span>
                <span className="mono" style={{ color: 'var(--ink-500)', fontSize: 11 }}>{fmtDate(c.created_at)}</span>
              </div>
            ))}
      </div>
    </div>
  );
};

const AdminClientDetail = ({ clientId, setRoute }) => {
  const [client, setClient] = React.useState(null);
  const [dossiers, setDossiers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const { items: clients } = await window.adminFetch('/api/admin/clients');
        const c = clients.find(c => c.id === clientId);
        setClient(c);
        const { items: dossiers } = await window.adminFetch('/api/admin/dossiers');
        setDossiers((dossiers || []).filter(d => d.user_id === clientId));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [clientId]);

  if (loading) return <div className="app-content"><p>Chargement…</p></div>;
  if (!client) return <div className="app-content"><p>Client introuvable.</p></div>;

  return (
    <div className="app-content with-bg">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, color: 'var(--ink-500)' }}>
        <button onClick={() => setRoute('clients')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-500)' }}>Clients</button>
        <span>/</span>
        <span>{client.first_name} {client.last_name}</span>
      </div>

      <div className="page-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="avatar avatar-lg">{initialsFromName(client.first_name, client.last_name)}</div>
          <div>
            <h1 style={{ margin: 0 }}>{client.first_name} {client.last_name}</h1>
            <p style={{ marginTop: 2 }}>{client.email}</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Total dossiers" value={client.dossier_counts.total} accent="#8B5CF6" />
        <KpiCard label="Actifs" value={client.dossier_counts.active} accent="#3B82F6" />
        <KpiCard label="Validés" value={client.dossier_counts.validated} accent="#10B981" />
      </div>

      <div className="app-card">
        <div className="app-card-head"><h3>Dossiers de ce client</h3></div>
        {dossiers.length === 0
          ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-500)' }}>Aucun dossier.</div>
          : dossiers.map(d => <RowCompact key={d.id} dossier={d} onClick={() => setRoute('dossiers', { id: d.id })} />)}
      </div>
    </div>
  );
};

// ─── PARAMETRES ────────────────────────────────────────────────
const AdminParametres = ({ me }) => (
  <div className="app-content with-bg">
    <div className="page-head"><div><h1>Paramètres</h1><p>Configuration de ton espace admin.</p></div></div>
    <div className="app-card">
      <div className="app-card-head"><h3>Compte</h3></div>
      <div className="app-card-pad" style={{ padding: 24 }}>
        <p><strong>Email :</strong> {me.email}</p>
        <p><strong>Nom :</strong> {me.first_name} {me.last_name}</p>
        <p><strong>Rôle :</strong> Admin</p>
      </div>
    </div>
  </div>
);

window.AdminDashboard = AdminDashboard;
window.AdminQueue = AdminQueue;
window.AdminAllDossiers = AdminAllDossiers;
window.AdminInpiList = AdminInpiList;
window.AdminClients = AdminClients;
window.AdminClientDetail = AdminClientDetail;
window.AdminParametres = AdminParametres;
