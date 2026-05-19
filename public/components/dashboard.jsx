/* eslint-disable */
// Dashboard demo INTERACTIF — utilisé dans le bloc Démo de la landing.
// Clic sur la sidebar = switch de vue (tableau de bord / dossiers / clients / stats / notifs).

const DOSSIERS = [
  { id: 'CMP-48217', name: 'Jean Dupont',   type: 'Création AE',  date: '02 mai 25', statut: 'VALIDATION_PENDING', label: 'En validation',       tone: 'blue'   },
  { id: 'CMP-48202', name: 'Sophie Marin',  type: 'Création AE',  date: '01 mai 25', statut: 'VALIDATED',          label: 'Validée',             tone: 'green'  },
  { id: 'CMP-48198', name: 'Karim Benali',  type: 'Modification', date: '30 avr 25', statut: 'SIGNATURE_PENDING',  label: 'Signature requise',   tone: 'amber'  },
  { id: 'CMP-48184', name: 'Léa Moreau',    type: 'Radiation',    date: '28 avr 25', statut: 'AMENDMENT_PENDING',  label: 'Régularisation',      tone: 'orange' },
  { id: 'CMP-48171', name: 'Thomas Roux',   type: 'Création AE',  date: '26 avr 25', statut: 'VALIDATED',          label: 'Validée',             tone: 'green'  },
];

const CLIENTS = [
  { name: 'Jean Dupont',   email: 'j.dupont@mail.fr',   siren: '932 184 502', dossiers: 3, status: 'Actif' },
  { name: 'Sophie Marin',  email: 'sophie@studio.fr',   siren: '521 884 322', dossiers: 1, status: 'Actif' },
  { name: 'Karim Benali',  email: 'k.benali@menui.fr',  siren: '742 510 803', dossiers: 2, status: 'Actif' },
  { name: 'Léa Moreau',    email: 'lea.moreau@art.fr',  siren: '991 552 470', dossiers: 1, status: 'En radiation' },
];

const NOTIFS = [
  { time: 'il y a 5 min', icon: 'Bell',    title: "Régularisation INPI",       text: 'Dossier CMP-48184 — pièce 3 illisible. Réglée auto.', tone: 'orange' },
  { time: 'il y a 1 h',   icon: 'Check',   title: "Validation reçue",          text: 'Sophie Marin · SIREN attribué : 932 184 502',          tone: 'green'  },
  { time: 'il y a 3 h',   icon: 'DocEdit', title: "Signature complétée",       text: 'Karim Benali a signé sa modification d\'adresse.',    tone: 'blue'   },
  { time: 'hier',         icon: 'Bell',    title: "Seuil micro",               text: "Léa Moreau approche du seuil de TVA (32 200 € de CA YTD).", tone: 'amber' },
];

const NAV_ITEMS = [
  ['dashboard',     'Grid',     'Tableau de bord'],
  ['dossiers',      'Doc',      'Mes dossiers'],
  ['clients',       'Building', 'Mes clients'],
  ['stats',         'Chart',    'Statistiques'],
  ['notifications', 'Bell',     'Notifications'],
];

const Spark = ({ values, color = 'var(--accent)', height = 30 }) => {
  const w = 100, h = height;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const path = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * h;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  const id = React.useId();
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={`${path} L ${w} ${h} L 0 ${h} Z`} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
};

const Dashboard = ({ preview = false }) => {
  const [view, setView] = React.useState('dashboard');
  const viewMeta = {
    dashboard:     { title: 'Tableau de bord',  sub: 'Vue d\'ensemble de votre activité ce mois.' },
    dossiers:      { title: 'Mes dossiers',     sub: '5 actifs · 2 nécessitent une action' },
    clients:       { title: 'Mes clients',      sub: `${CLIENTS.length} fiches client enregistrées` },
    stats:         { title: 'Statistiques',     sub: 'Détail des indicateurs sur 12 mois glissants' },
    notifications: { title: 'Notifications',    sub: `${NOTIFS.length} événements récents` },
  };

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: preview ? '220px 1fr' : '240px 1fr',
      minHeight: preview ? 460 : 540,
      background: 'var(--white)', fontSize: 14,
    }} className="dash-grid">
      {/* Sidebar */}
      <aside style={{
        background: 'var(--ink-50)',
        borderRight: '1px solid var(--ink-150)',
        padding: '20px 12px',
        display: 'flex', flexDirection: 'column', gap: 4,
      }} className="dash-sidebar">
        <div style={{ padding: '8px 12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="logo-mark" style={{ width: 24, height: 24, fontSize: 12 }}>C</span>
          <span style={{ fontWeight: 600, fontSize: 15 }}>compta</span>
        </div>
        {NAV_ITEMS.map(([id, icon, label]) => {
          const active = view === id;
          return (
            <button key={id} onClick={() => setView(id)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', border: 'none', borderRadius: 8,
              background: active ? 'white' : 'transparent',
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
              color: active ? 'var(--ink-900)' : 'var(--ink-600)',
              fontWeight: active ? 500 : 400,
              cursor: 'pointer', textAlign: 'left', fontSize: 13,
              transition: 'background 0.12s ease, color 0.12s ease',
              fontFamily: 'inherit',
            }}>
              {React.createElement(I[icon], { size: 15 })}
              {label}
            </button>
          );
        })}
        <div style={{ marginTop: 'auto', padding: '12px' }}>
          <div style={{ padding: 12, background: 'var(--accent-soft)', borderRadius: 10, fontSize: 12 }}>
            <div style={{ fontWeight: 500, color: 'var(--accent-ink)', marginBottom: 4 }}>
              <I.Sparkle size={13} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 4 }}/>
              Nouveau
            </div>
            <div style={{ color: 'var(--ink-600)', fontSize: 11 }}>API Pappers · enrichissement auto des dossiers</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ padding: '20px 24px', display: 'grid', gap: 18, overflow: 'hidden', alignContent: 'start' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 18, marginBottom: 2 }}>{viewMeta[view].title}</h3>
            <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>{viewMeta[view].sub}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
              <I.Search size={13} />Rechercher
            </button>
            {(view === 'dossiers' || view === 'dashboard') && (
              <button className="btn btn-primary btn-sm" style={{ fontSize: 12 }}>
                <I.Plus size={13} />Nouveau dossier
              </button>
            )}
          </div>
        </header>

        {view === 'dashboard'     && <ViewDashboard />}
        {view === 'dossiers'      && <ViewDossiers />}
        {view === 'clients'       && <ViewClients />}
        {view === 'stats'         && <ViewStats />}
        {view === 'notifications' && <ViewNotifications />}
      </main>

      <style>{`
        @media (max-width: 700px) {
          .dash-sidebar { display: none; }
          .dash-grid { grid-template-columns: 1fr !important; }
          .kpi-grid { grid-template-columns: 1fr 1fr !important; }
          .hide-sm { display: none; }
          .row-grid { grid-template-columns: 100px 1fr 130px !important; }
        }
      `}</style>
    </div>
  );
};

// ── Vues ──

const ViewDashboard = () => (
  <>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }} className="kpi-grid">
      <KPI label="Dossiers ce mois" value="12" trend="+33%" spark={[3,4,3,5,4,6,7,5,8,9,10,12]} />
      <KPI label="Taux de validation" value="94%" trend="+2pts" spark={[88,90,89,91,92,90,93,92,94,93,94,94]} />
      <KPI label="Délai moyen" value="3.2j" trend="−0.4j" spark={[4.5,4.2,4.0,3.8,3.9,3.7,3.5,3.4,3.3,3.3,3.2,3.2]} />
    </div>
    <Section title="Activité récente">
      {DOSSIERS.slice(0, 3).map((d) => <DossierRow key={d.id} d={d} compact />)}
    </Section>
  </>
);

const ViewDossiers = () => (
  <div style={{ border: '1px solid var(--ink-150)', borderRadius: 12, overflow: 'hidden' }}>
    <div style={{
      display: 'grid', gridTemplateColumns: '110px 1fr 1fr 90px 130px',
      padding: '10px 14px', background: 'var(--ink-50)',
      fontSize: 11, fontWeight: 500, color: 'var(--ink-500)',
      textTransform: 'uppercase', letterSpacing: '0.04em',
      borderBottom: '1px solid var(--ink-150)',
    }} className="row-grid">
      <span>ID</span><span>Client</span><span className="hide-sm">Formalité</span><span className="hide-sm">Date</span><span>Statut</span>
    </div>
    {DOSSIERS.map((d) => <DossierRow key={d.id} d={d} />)}
  </div>
);

const ViewClients = () => (
  <div style={{ border: '1px solid var(--ink-150)', borderRadius: 12, overflow: 'hidden' }}>
    <div style={{
      display: 'grid', gridTemplateColumns: '1.4fr 1.4fr 120px 80px 100px',
      padding: '10px 14px', background: 'var(--ink-50)',
      fontSize: 11, fontWeight: 500, color: 'var(--ink-500)',
      textTransform: 'uppercase', letterSpacing: '0.04em',
      borderBottom: '1px solid var(--ink-150)',
    }} className="row-grid">
      <span>Nom</span><span className="hide-sm">Email</span><span className="hide-sm">SIREN</span><span>Dossiers</span><span>Statut</span>
    </div>
    {CLIENTS.map((c, i) => (
      <div key={i} style={{
        display: 'grid', gridTemplateColumns: '1.4fr 1.4fr 120px 80px 100px',
        padding: '12px 14px', alignItems: 'center', fontSize: 13,
        borderBottom: i < CLIENTS.length - 1 ? '1px solid var(--ink-100)' : 'none',
      }} className="row-grid">
        <span style={{ fontWeight: 500 }}>{c.name}</span>
        <span style={{ color: 'var(--ink-600)' }} className="hide-sm">{c.email}</span>
        <span className="mono hide-sm" style={{ color: 'var(--ink-500)', fontSize: 12 }}>{c.siren}</span>
        <span className="mono" style={{ fontSize: 12 }}>{c.dossiers}</span>
        <span className={`pill ${c.status === 'Actif' ? 'green' : 'orange'}`} style={{ fontSize: 11 }}>
          <span className="dot" />{c.status}
        </span>
      </div>
    ))}
  </div>
);

const ViewStats = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }} className="kpi-grid">
    <BigStat label="Volume dossiers · 12 mois" value="148" trend="+128%" spark={[5,7,8,9,11,12,14,16,15,17,18,20]} />
    <BigStat label="CA cumulé estimé" value="64.2k€" trend="+92%" spark={[2.1,2.8,3.4,3.9,4.4,5.1,5.5,6.0,6.4,6.8,7.0,7.4]} color="#10B981" />
    <BigStat label="Taux de régularisation" value="11%" trend="−4pts" spark={[18,17,16,15,15,14,13,13,12,12,11,11]} color="#F59E0B" />
    <BigStat label="Délai INPI moyen" value="3.2j" trend="−0.8j" spark={[4.5,4.2,4.0,3.8,3.9,3.7,3.5,3.4,3.3,3.3,3.2,3.2]} color="#3B82F6" />
  </div>
);

const ViewNotifications = () => (
  <div style={{ border: '1px solid var(--ink-150)', borderRadius: 12, overflow: 'hidden' }}>
    {NOTIFS.map((n, i) => (
      <div key={i} style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px',
        borderBottom: i < NOTIFS.length - 1 ? '1px solid var(--ink-100)' : 'none',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'var(--ink-50)', color: `var(--status-${n.tone})`,
          display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>
          {React.createElement(I[n.icon], { size: 15 })}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{n.title}</span>
            <span style={{ fontSize: 11, color: 'var(--ink-500)', whiteSpace: 'nowrap' }}>{n.time}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-600)', marginTop: 2 }}>{n.text}</div>
        </div>
      </div>
    ))}
  </div>
);

// ── Sous-composants ──

const Section = ({ title, children }) => (
  <div>
    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{title}</div>
    <div style={{ border: '1px solid var(--ink-150)', borderRadius: 12, overflow: 'hidden' }}>
      {children}
    </div>
  </div>
);

const DossierRow = ({ d, compact }) => (
  <div style={{
    display: 'grid', gridTemplateColumns: compact ? '110px 1fr 130px' : '110px 1fr 1fr 90px 130px',
    padding: '12px 14px', alignItems: 'center', fontSize: 13,
    borderBottom: '1px solid var(--ink-100)',
  }} className="row-grid">
    <span className="mono" style={{ fontSize: 12, color: 'var(--ink-600)' }}>{d.id}</span>
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        width: 24, height: 24, borderRadius: '50%',
        background: 'var(--accent-soft)', color: 'var(--accent-ink)',
        display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 600,
      }}>{d.name.split(' ').map(p => p[0]).join('').slice(0, 2)}</span>
      <span style={{ fontWeight: 500 }}>{d.name}</span>
    </span>
    {!compact && <span style={{ color: 'var(--ink-600)' }} className="hide-sm">{d.type}</span>}
    {!compact && <span className="mono hide-sm" style={{ color: 'var(--ink-500)', fontSize: 12 }}>{d.date}</span>}
    <span className={`pill ${d.tone}`} style={{ fontSize: 11 }}>
      <span className="dot" />{d.label}
    </span>
  </div>
);

const KPI = ({ label, value, trend, spark }) => (
  <div style={{ border: '1px solid var(--ink-150)', borderRadius: 12, padding: '14px 16px', background: 'white' }}>
    <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>{label}</div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
      <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink-900)' }}>{value}</span>
      <span style={{ fontSize: 11, color: 'var(--status-green)', fontWeight: 500 }}>{trend}</span>
    </div>
    <div style={{ marginTop: 8 }}><Spark values={spark} /></div>
  </div>
);

const BigStat = ({ label, value, trend, spark, color }) => (
  <div style={{ border: '1px solid var(--ink-150)', borderRadius: 12, padding: 18, background: 'white' }}>
    <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>{label}</div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 }}>
      <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink-900)' }}>{value}</span>
      <span style={{ fontSize: 12, color: color || 'var(--status-green)', fontWeight: 500 }}>{trend}</span>
    </div>
    <div style={{ marginTop: 12 }}><Spark values={spark} color={color} height={50} /></div>
  </div>
);

window.Dashboard = Dashboard;
