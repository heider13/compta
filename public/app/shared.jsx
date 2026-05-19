/* eslint-disable */
// App shell: Sidebar + Topbar + Bottom nav + Layout

const ROUTES = {
  dashboard:    { label: 'Tableau de bord', icon: 'Grid' },
  dossiers:     { label: 'Mes dossiers', icon: 'Doc', badge: '5' },
  nouveau:      { label: 'Nouveau dossier', icon: 'Plus' },
  declarations: { label: 'Déclarations CA', icon: 'Chart' },
  documents:    { label: 'Mes documents', icon: 'Stack' },
  notifications:{ label: 'Notifications', icon: 'Bell', badge: '2' },
  profil:       { label: 'Profil', icon: 'User' },
  parametres:   { label: 'Paramètres', icon: 'Lock' },
};

const BOTTOM_NAV = ['dashboard', 'dossiers', 'nouveau', 'notifications', 'profil'];

const Sidebar = ({ route, setRoute, user }) => (
  <aside className="app-sidebar">
    <a href="index.html" className="logo" aria-label="Compta">
      <span className="logo-mark">C</span>
      <span style={{ fontSize: 19 }}>compta</span>
    </a>

    <div className="sidebar-section">Pilotage</div>
    {['dashboard', 'dossiers', 'nouveau'].map(r => (
      <button key={r} className={`sidebar-link ${route === r ? 'active' : ''}`} onClick={() => setRoute(r)}>
        {React.createElement(I[ROUTES[r].icon], { size: 17 })}
        <span>{ROUTES[r].label}</span>
        {ROUTES[r].badge && <span className="badge">{ROUTES[r].badge}</span>}
      </button>
    ))}

    <div className="sidebar-section">Comptabilité</div>
    {['declarations', 'documents'].map(r => (
      <button key={r} className={`sidebar-link ${route === r ? 'active' : ''}`} onClick={() => setRoute(r)}>
        {React.createElement(I[ROUTES[r].icon], { size: 17 })}
        <span>{ROUTES[r].label}</span>
      </button>
    ))}

    <div className="sidebar-section">Compte</div>
    {['notifications', 'profil', 'parametres'].map(r => (
      <button key={r} className={`sidebar-link ${route === r ? 'active' : ''}`} onClick={() => setRoute(r)}>
        {React.createElement(I[ROUTES[r].icon], { size: 17 })}
        <span>{ROUTES[r].label}</span>
        {ROUTES[r].badge && <span className="badge">{ROUTES[r].badge}</span>}
      </button>
    ))}

    <div className="sidebar-user">
      <div className="sidebar-user-avatar">{user.initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>{user.plan}</div>
      </div>
      <button
        title="Déconnexion"
        onClick={async () => {
          if (window.supabaseClient) await window.supabaseClient.auth.signOut();
          window.location.href = 'auth/login.html';
        }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, color: 'var(--ink-500)', display: 'grid', placeItems: 'center' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--ink-100)'; e.currentTarget.style.color = '#b42318'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-500)'; }}
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

const Topbar = ({ route, onMenu, user }) => (
  <header className="app-topbar">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
      <div className="app-topbar-search">
        <I.Search size={15} style={{ color: 'var(--ink-400)' }} />
        <input placeholder="Rechercher un dossier, un document..." />
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-400)', padding: '2px 6px', border: '1px solid var(--ink-200)', borderRadius: 4 }}>⌘K</span>
      </div>
    </div>
    <div className="app-topbar-right">
      <button className="icon-btn" aria-label="Aide">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <circle cx="12" cy="12" r="9"/>
          <path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5"/>
          <circle cx="12" cy="17" r="0.5" fill="currentColor"/>
        </svg>
      </button>
      <button className="icon-btn" aria-label="Notifications">
        <I.Bell size={17} />
        <span className="dot" />
      </button>
      <div style={{ width: 1, height: 24, background: 'var(--ink-150)', margin: '0 6px' }} />
      <button className="icon-btn" style={{ width: 'auto', padding: '0 8px 0 4px', borderRadius: 999, gap: 8, display: 'flex' }}>
        <div className="avatar avatar-sm">{user.initials}</div>
      </button>
    </div>
  </header>
);

const BottomNav = ({ route, setRoute }) => (
  <nav className="app-bottom-nav">
    {BOTTOM_NAV.map(r => (
      <button key={r} className={`bottom-nav-btn ${route === r ? 'active' : ''}`} onClick={() => setRoute(r)}>
        <span className="icon-wrap">
          {React.createElement(I[ROUTES[r].icon], { size: 17 })}
        </span>
        <span>{ROUTES[r].label.split(' ')[0]}</span>
      </button>
    ))}
  </nav>
);

// Mini-status pill
const StatusPill = ({ tone, label, dot = true }) => (
  <span className={`pill ${tone}`} style={{ fontSize: 12 }}>
    {dot && <span className="dot" />}
    {label}
  </span>
);

// Sparkline (re-export)
const SparkLine = ({ values, color, height = 30 }) => {
  const w = 100, h = height;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const path = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * h * 0.85 - h * 0.05;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  const id = React.useId();
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color || 'var(--accent)'} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color || 'var(--accent)'} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={`${path} L ${w} ${h} L 0 ${h} Z`} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={color || 'var(--accent)'} strokeWidth="1.5" />
    </svg>
  );
};

// Shared seed data
const SEED_DOSSIERS = [
  { id: 'CMP-48217', client: 'Jean Dupont', initials: 'JD', type: 'Création AE', date: '02 mai 25', dateISO: '2025-05-02', statut: 'VALIDATION_PENDING', label: 'En validation', tone: 'blue', siren: null, naf: '6202A · Conseil en informatique' },
  { id: 'CMP-48202', client: 'Sophie Marin', initials: 'SM', type: 'Création AE', date: '01 mai 25', dateISO: '2025-05-01', statut: 'VALIDATED', label: 'Validée', tone: 'green', siren: '932 184 502', naf: '7410Z · Design' },
  { id: 'CMP-48198', client: 'Karim Benali', initials: 'KB', type: 'Modification', date: '30 avr 25', dateISO: '2025-04-30', statut: 'SIGNATURE_PENDING', label: 'Signature requise', tone: 'amber', siren: '521 884 322', naf: '4332A · Menuiserie' },
  { id: 'CMP-48184', client: 'Léa Moreau', initials: 'LM', type: 'Radiation', date: '28 avr 25', dateISO: '2025-04-28', statut: 'AMENDMENT_PENDING', label: 'Régularisation', tone: 'orange', siren: '742 510 803', naf: '9602A · Coiffure' },
  { id: 'CMP-48171', client: 'Thomas Roux', initials: 'TR', type: 'Création AE', date: '26 avr 25', dateISO: '2025-04-26', statut: 'VALIDATED', label: 'Validée', tone: 'green', siren: '991 552 470', naf: '7022Z · Conseil aux affaires' },
  { id: 'CMP-48160', client: 'Amélie Vidal', initials: 'AV', type: 'Création AE', date: '24 avr 25', dateISO: '2025-04-24', statut: 'PAYMENT_PENDING', label: 'En attente paiement', tone: 'amber', siren: null, naf: '8559A · Formation' },
  { id: 'CMP-48142', client: 'Lucas Bernard', initials: 'LB', type: 'Création AE', date: '22 avr 25', dateISO: '2025-04-22', statut: 'REJECTED', label: 'Rejetée', tone: 'red', siren: null, naf: '5610A · Restauration' },
  { id: 'CMP-48118', client: 'Camille Leroy', initials: 'CL', type: 'Création AE', date: '18 avr 25', dateISO: '2025-04-18', statut: 'VALIDATED', label: 'Validée', tone: 'green', siren: '887 109 244', naf: '6202A · Conseil en informatique' },
];

window.ROUTES = ROUTES;
window.Sidebar = Sidebar;
window.Topbar = Topbar;
window.BottomNav = BottomNav;
window.StatusPill = StatusPill;
window.SparkLine = SparkLine;
window.SEED_DOSSIERS = SEED_DOSSIERS;
