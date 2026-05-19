/* eslint-disable */
// Compta app — single-page, query-param routed so it can be iframed by
// showcase.html: app.html?route=dashboard&d=CMP-48184

const VALID_ROUTES = [
  'dashboard', 'dossiers', 'dossier-detail', 'nouveau',
  'declarations', 'documents', 'notifications', 'profil', 'parametres',
];

function readQuery() {
  const sp = new URLSearchParams(window.location.search);
  return {
    route: VALID_ROUTES.includes(sp.get('route')) ? sp.get('route') : 'dashboard',
    dossierId: sp.get('d'),
  };
}

function writeQuery(next) {
  const sp = new URLSearchParams(window.location.search);
  Object.entries(next).forEach(([k, v]) => {
    if (v == null) sp.delete(k);
    else sp.set(k, v);
  });
  const qs = sp.toString();
  history.pushState(null, '', qs ? `?${qs}` : window.location.pathname);
}

function initialsFrom(first, last, email) {
  const f = (first || '').trim(), l = (last || '').trim();
  if (f || l) return ((f[0] || '') + (l[0] || '')).toUpperCase() || '??';
  return (email || '??').slice(0, 2).toUpperCase();
}

function App() {
  const [route, setRouteState] = React.useState(readQuery().route);
  const [activeDossier, setActiveDossierState] = React.useState(() => {
    const id = readQuery().dossierId;
    return id ? SEED_DOSSIERS.find(d => d.id === id) : null;
  });
  const [me, setMe] = React.useState(null);

  // Charge le profil du user connecté (et redirige admin vers admin.html)
  React.useEffect(() => {
    (async () => {
      try {
        const profile = await window.ComptaAPI.apiFetch('/api/me');
        const sp = new URLSearchParams(window.location.search);
        // Admin landing direct sur l'app sans paramètre → on l'envoie sur le dashboard admin
        // (gardable via ?as=client si admin veut voir l'espace client)
        if (profile.role === 'admin' && sp.get('as') !== 'client') {
          window.location.replace('admin.html');
          return;
        }
        const first = profile.first_name || '';
        const last = profile.last_name || '';
        setMe({
          firstName: first,
          lastName: last,
          name: ((first + ' ' + last).trim()) || profile.email,
          email: profile.email,
          initials: initialsFrom(first, last, profile.email),
          plan: 'Auto-entrepreneur',
          role: profile.role,
        });
      } catch (e) {
        window.location.replace('auth/login.html');
      }
    })();
  }, []);

  // Sync on URL change (back/forward)
  React.useEffect(() => {
    const onPop = () => {
      const q = readQuery();
      setRouteState(q.route);
      if (q.dossierId) {
        setActiveDossierState(SEED_DOSSIERS.find(d => d.id === q.dossierId) || null);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const setRoute = (r) => {
    setRouteState(r);
    writeQuery({ route: r, d: r === 'dossier-detail' ? (activeDossier?.id || null) : null });
    window.scrollTo({ top: 0 });
  };
  const setActiveDossier = (d) => {
    setActiveDossierState(d);
    if (d) writeQuery({ d: d.id });
  };

  // Highlight `dossiers` in sidebar when on dossier-detail
  const sidebarRoute = route === 'dossier-detail' ? 'dossiers' : route;

  if (!me) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: 'var(--ink-500)', fontSize: 14 }}>
        Chargement…
      </div>
    );
  }

  const renderPage = () => {
    switch (route) {
      case 'dashboard':       return <AppDashboard user={me} setRoute={setRoute} setActiveDossier={setActiveDossier} />;
      case 'dossiers':        return <DossiersList setRoute={setRoute} setActiveDossier={setActiveDossier} userRole={me.role} />;
      case 'dossier-detail':  return (activeDossier?.source === 'local')
        ? <DossierLocalDetail dossier={activeDossier} setRoute={setRoute} />
        : <DossierDetail dossier={activeDossier || SEED_DOSSIERS[0]} setRoute={setRoute} />;
      case 'nouveau':         return <Nouveau setRoute={setRoute} setActiveDossier={setActiveDossier} />;
      case 'declarations':    return <Declarations />;
      case 'documents':       return <Documents />;
      case 'notifications':   return <Notifications />;
      case 'profil':          return <Profil user={me} />;
      case 'parametres':      return <Parametres />;
      default:                return <AppDashboard user={me} setRoute={setRoute} setActiveDossier={setActiveDossier} />;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar route={sidebarRoute} setRoute={setRoute} user={me} />
      <div className="app-main">
        <Topbar route={route} user={me} />
        {renderPage()}
        <BottomNav route={sidebarRoute} setRoute={setRoute} />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
