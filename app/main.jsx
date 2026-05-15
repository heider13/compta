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

const ME = {
  firstName: 'Jean',
  lastName: 'Dupont',
  name: 'Jean Dupont',
  email: 'jean.dupont@compta.fr',
  initials: 'JD',
  plan: 'Plan Tranquillité',
};

function App() {
  const [route, setRouteState] = React.useState(readQuery().route);
  const [activeDossier, setActiveDossierState] = React.useState(() => {
    const id = readQuery().dossierId;
    return id ? SEED_DOSSIERS.find(d => d.id === id) : null;
  });

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

  const renderPage = () => {
    switch (route) {
      case 'dashboard':       return <AppDashboard user={ME} setRoute={setRoute} setActiveDossier={setActiveDossier} />;
      case 'dossiers':        return <DossiersList setRoute={setRoute} setActiveDossier={setActiveDossier} />;
      case 'dossier-detail':  return <DossierDetail dossier={activeDossier || SEED_DOSSIERS[0]} setRoute={setRoute} />;
      case 'nouveau':         return <Nouveau setRoute={setRoute} setActiveDossier={setActiveDossier} />;
      case 'declarations':    return <Declarations />;
      case 'documents':       return <Documents />;
      case 'notifications':   return <Notifications />;
      case 'profil':          return <Profil user={ME} />;
      case 'parametres':      return <Parametres />;
      default:                return <AppDashboard user={ME} setRoute={setRoute} setActiveDossier={setActiveDossier} />;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar route={sidebarRoute} setRoute={setRoute} user={ME} />
      <div className="app-main">
        <Topbar route={route} user={ME} />
        {renderPage()}
        <BottomNav route={sidebarRoute} setRoute={setRoute} />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
