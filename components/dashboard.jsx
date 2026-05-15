/* eslint-disable */
// Dashboard demo — used both as hero product preview and in dedicated section

const DOSSIERS = [
  { id: 'CMP-48217', name: 'Jean Dupont', type: 'Création AE', date: '02 mai 25', statut: 'VALIDATION_PENDING', label: 'En validation', tone: 'blue' },
  { id: 'CMP-48202', name: 'Sophie Marin', type: 'Création AE', date: '01 mai 25', statut: 'VALIDATED', label: 'Validée', tone: 'green' },
  { id: 'CMP-48198', name: 'Karim Benali', type: 'Modification', date: '30 avr 25', statut: 'SIGNATURE_PENDING', label: 'Signature requise', tone: 'amber' },
  { id: 'CMP-48184', name: 'Léa Moreau', type: 'Radiation', date: '28 avr 25', statut: 'AMENDMENT_PENDING', label: 'Régularisation', tone: 'orange' },
  { id: 'CMP-48171', name: 'Thomas Roux', type: 'Création AE', date: '26 avr 25', statut: 'VALIDATED', label: 'Validée', tone: 'green' },
];

const Spark = ({ values, color = 'var(--accent)' }) => {
  const w = 100, h = 30;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const path = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * h;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  const areaPath = `${path} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkGrad)" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
};

const Dashboard = ({ preview = false }) => {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: preview ? '220px 1fr' : '240px 1fr',
      minHeight: preview ? 460 : 540,
      background: 'var(--white)',
      fontSize: 14,
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
        {[
          ['Grid', 'Tableau de bord', false],
          ['Doc', 'Mes dossiers', true],
          ['Building', 'Mes clients', false],
          ['Chart', 'Statistiques', false],
          ['Bell', 'Notifications', false],
        ].map(([icon, label, active]) => (
          <button key={label} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', border: 'none', borderRadius: 8,
            background: active ? 'white' : 'transparent',
            boxShadow: active ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
            color: active ? 'var(--ink-900)' : 'var(--ink-600)',
            fontWeight: active ? 500 : 400,
            cursor: 'pointer', textAlign: 'left', fontSize: 13,
          }}>
            {React.createElement(I[icon], { size: 15 })}
            {label}
          </button>
        ))}
        <div style={{ marginTop: 'auto', padding: '12px' }}>
          <div style={{
            padding: 12, background: 'var(--accent-soft)',
            borderRadius: 10, fontSize: 12,
          }}>
            <div style={{ fontWeight: 500, color: 'var(--accent-ink)', marginBottom: 4 }}>
              <I.Sparkle size={13} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 4 }}/>
              Nouveau
            </div>
            <div style={{ color: 'var(--ink-600)', fontSize: 11 }}>API Pappers · enrichissement auto des dossiers</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ padding: '20px 24px', display: 'grid', gap: 18, overflow: 'hidden' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 18, marginBottom: 2 }}>Mes dossiers</h3>
            <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>5 actifs · 2 nécessitent une action</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
              <I.Search size={13} />
              Rechercher
            </button>
            <button className="btn btn-primary btn-sm" style={{ fontSize: 12 }}>
              <I.Plus size={13} />
              Nouveau dossier
            </button>
          </div>
        </header>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }} className="kpi-grid">
          <KPI label="Dossiers ce mois" value="12" trend="+33%" spark={[3,4,3,5,4,6,7,5,8,9,10,12]} />
          <KPI label="Taux de validation" value="94%" trend="+2pts" spark={[88,90,89,91,92,90,93,92,94,93,94,94]} />
          <KPI label="Délai moyen" value="3.2j" trend="−0.4j" spark={[4.5,4.2,4.0,3.8,3.9,3.7,3.5,3.4,3.3,3.3,3.2,3.2]} />
        </div>

        {/* Table */}
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
          {DOSSIERS.slice(0, preview ? 5 : 5).map((d) => (
            <div key={d.id} style={{
              display: 'grid', gridTemplateColumns: '110px 1fr 1fr 90px 130px',
              padding: '12px 14px', alignItems: 'center', fontSize: 13,
              borderBottom: '1px solid var(--ink-100)',
            }} className="row-grid">
              <span className="mono" style={{ fontSize: 12, color: 'var(--ink-600)' }}>{d.id}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'var(--accent-soft)', color: 'var(--accent-ink)',
                  display: 'grid', placeItems: 'center',
                  fontSize: 10, fontWeight: 600,
                }}>{d.name.split(' ').map(p => p[0]).join('').slice(0, 2)}</span>
                <span style={{ fontWeight: 500 }}>{d.name}</span>
              </span>
              <span style={{ color: 'var(--ink-600)' }} className="hide-sm">{d.type}</span>
              <span className="mono hide-sm" style={{ color: 'var(--ink-500)', fontSize: 12 }}>{d.date}</span>
              <span className={`pill ${d.tone}`} style={{ fontSize: 11 }}>
                <span className="dot" />
                {d.label}
              </span>
            </div>
          ))}
        </div>
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

const KPI = ({ label, value, trend, spark }) => (
  <div style={{
    border: '1px solid var(--ink-150)', borderRadius: 12,
    padding: '14px 16px', background: 'white',
  }}>
    <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>{label}</div>
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      marginTop: 4,
    }}>
      <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink-900)' }}>{value}</span>
      <span style={{ fontSize: 11, color: 'var(--status-green)', fontWeight: 500 }}>{trend}</span>
    </div>
    <div style={{ marginTop: 8 }}>
      <Spark values={spark} />
    </div>
  </div>
);

window.Dashboard = Dashboard;
