/* eslint-disable */
// Admin SPA shell — sidebar + topbar + content area routing

const ADMIN_API_BASE = 'https://vps-84ac2579.vps.ovh.net';

const ADMIN_ROUTES = {
  dashboard:    { label: 'Tableau de bord',     icon: 'Grid' },
  queue:        { label: 'À valider',           icon: 'DocEdit' },
  dossiers:     { label: 'Dossiers & formalités', icon: 'Doc' },
  clients:      { label: 'Clients',             icon: 'User' },
  parametres:   { label: 'Paramètres',          icon: 'Lock' },
};

async function getJwt() {
  const { data } = await window.supabaseClient.auth.getSession();
  return data.session?.access_token;
}

async function adminFetch(path, opts = {}) {
  const jwt = await getJwt();
  if (!jwt) throw new Error('not_authenticated');
  const r = await fetch(`${ADMIN_API_BASE}${path}`, {
    ...opts,
    headers: { ...(opts.headers || {}), Authorization: `Bearer ${jwt}` },
  });
  if (!r.ok) throw new Error(`API ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

window.adminFetch = adminFetch;
window.ADMIN_API_BASE = ADMIN_API_BASE;

function readAdminRoute() {
  const sp = new URLSearchParams(window.location.search);
  const r = sp.get('section');
  return r && ADMIN_ROUTES[r] ? r : 'dashboard';
}

function writeAdminRoute(section, extra) {
  const sp = new URLSearchParams(window.location.search);
  sp.set('section', section);
  if (extra) for (const [k, v] of Object.entries(extra)) v == null ? sp.delete(k) : sp.set(k, v);
  else { sp.delete('id'); sp.delete('client'); }
  window.history.pushState(null, '', '?' + sp.toString());
}

const AdminSidebar = ({ route, setRoute, me }) => (
  <aside className="app-sidebar" style={{ background: '#1A1A1F', color: 'white' }}>
    <a href="admin.html" className="logo" aria-label="Compta Admin" style={{ color: 'white' }}>
      <span className="logo-mark">C</span>
      <span style={{ fontSize: 19 }}>compta</span>
      <span style={{ marginLeft: 'auto', background: '#FEF3C7', color: '#92400E', fontSize: 10, padding: '2px 8px', borderRadius: 999, fontWeight: 600, letterSpacing: 0.05 }}>ADMIN</span>
    </a>

    <div className="sidebar-section" style={{ color: 'rgba(255,255,255,0.5)' }}>Pilotage</div>
    {['dashboard', 'queue', 'dossiers'].map(r => (
      <AdminNavLink key={r} id={r} route={route} setRoute={setRoute} />
    ))}

    <div className="sidebar-section" style={{ color: 'rgba(255,255,255,0.5)' }}>Données</div>
    <AdminNavLink id="clients" route={route} setRoute={setRoute} />

    <div className="sidebar-section" style={{ color: 'rgba(255,255,255,0.5)' }}>Compte</div>
    <AdminNavLink id="parametres" route={route} setRoute={setRoute} />

    <div className="sidebar-user" style={{ background: 'rgba(255,255,255,0.05)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="sidebar-user-avatar" style={{ background: 'var(--accent)' }}>
        {((me.first_name || '?').charAt(0) + (me.last_name || '').charAt(0)).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me.first_name} {me.last_name}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{me.email}</div>
      </div>
      <button
        title="Déconnexion"
        onClick={async () => {
          if (window.supabaseClient) await window.supabaseClient.auth.signOut();
          window.location.href = 'auth/login.html';
        }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, color: 'rgba(255,255,255,0.5)', display: 'grid', placeItems: 'center' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#FCA5A5'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </div>
  </aside>
);

const AdminNavLink = ({ id, route, setRoute }) => {
  const r = ADMIN_ROUTES[id];
  const active = route === id;
  return (
    <button
      onClick={() => setRoute(id)}
      className={`sidebar-link ${active ? 'active' : ''}`}
      style={{
        color: active ? 'white' : 'rgba(255,255,255,0.7)',
        background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
      }}
    >
      {window.I && window.I[r.icon] && React.createElement(window.I[r.icon], { size: 17 })}
      <span>{r.label}</span>
    </button>
  );
};

const AdminTopbar = () => (
  <header className="app-topbar">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
      <div className="app-topbar-search" style={{ background: 'white', border: '1px solid var(--ink-150)' }}>
        {window.I && <window.I.Search size={15} style={{ color: 'var(--ink-400)' }} />}
        <input placeholder="Rechercher un dossier, un client, un SIREN…" />
      </div>
    </div>
    <div className="app-topbar-right">
      <a href="app.html?as=client" className="btn btn-ghost btn-sm">Voir comme client →</a>
    </div>
  </header>
);

function AdminApp() {
  const [route, setRouteState] = React.useState(readAdminRoute());
  const [me, setMe] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [extra, setExtra] = React.useState(() => {
    const sp = new URLSearchParams(window.location.search);
    return { id: sp.get('id'), client: sp.get('client') };
  });

  React.useEffect(() => {
    (async () => {
      try {
        const profile = await adminFetch('/api/me');
        if (profile.role !== 'admin') { window.location.replace('app.html'); return; }
        setMe(profile);
      } catch (e) {
        if (String(e.message).includes('401') || String(e.message).includes('not_authenticated')) {
          window.location.replace('auth/login.html');
        } else setError(e.message);
      }
    })();
    const onPop = () => {
      setRouteState(readAdminRoute());
      const sp = new URLSearchParams(window.location.search);
      setExtra({ id: sp.get('id'), client: sp.get('client') });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const setRoute = (r, ex) => { setRouteState(r); setExtra(ex || {}); writeAdminRoute(r, ex); };

  if (error) return <div style={{ padding: 40, color: '#b42318' }}>Erreur : {error}</div>;
  if (!me) return <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: 'var(--ink-500)' }}>Chargement…</div>;

  return (
    <div className="app-shell">
      <AdminSidebar route={route} setRoute={setRoute} me={me} />
      <div className="app-main">
        <AdminTopbar />
        {renderAdminPage(route, setRoute, me, extra)}
      </div>
    </div>
  );
}

function renderAdminPage(route, setRoute, me, extra) {
  if (extra.id) return <window.AdminDossierDetail dossierId={extra.id} setRoute={setRoute} me={me} />;
  if (extra.client) return <window.AdminClientDetail clientId={extra.client} setRoute={setRoute} />;
  switch (route) {
    case 'dashboard': return <window.AdminDashboard setRoute={setRoute} me={me} />;
    case 'queue':     return <window.AdminQueue setRoute={setRoute} />;
    case 'dossiers':  return <window.AdminAllDossiers setRoute={setRoute} />;
    case 'clients':   return <window.AdminClients setRoute={setRoute} />;
    case 'parametres':return <window.AdminParametres me={me} />;
    default:          return <window.AdminDashboard setRoute={setRoute} me={me} />;
  }
}

window.AdminApp = AdminApp;
