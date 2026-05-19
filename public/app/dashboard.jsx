/* eslint-disable */
// App Dashboard screen — overview for an auto-entrepreneur user

const AppDashboard = ({ user, setRoute, setActiveDossier }) => {
  const mesDossiers = SEED_DOSSIERS.slice(0, 4);
  const recentActivity = [
    { time: '10:42', icon: 'Check', tone: 'green', text: <>Dossier <strong>CMP-48202</strong> validé · Sophie Marin · Kbis disponible</> },
    { time: '09:18', icon: 'DocEdit', tone: 'amber', text: <>Régularisation demandée sur <strong>CMP-48184</strong> · Justificatif manquant</> },
    { time: 'Hier · 17:30', icon: 'Send', tone: 'blue', text: <>Dossier <strong>CMP-48217</strong> déposé au Guichet Unique INPI</> },
    { time: 'Hier · 14:02', icon: 'EUR', tone: 'violet', text: <>Déclaration CA mai · <strong>2 480 €</strong> · URSSAF envoyée</> },
  ];

  return (
    <div className="app-content">
      <div className="page-head">
        <div>
          <h1>Bonjour {user.firstName} 👋</h1>
          <p>Voici l'essentiel sur vos dossiers et déclarations.</p>
        </div>
        <button className="btn btn-accent" onClick={() => setRoute('nouveau')}>
          <I.Plus size={16} /> Nouveau dossier
        </button>
      </div>

      <div className="stat-grid">
        <StatCard label="Dossiers actifs" value="5" trend="+2 ce mois" spark={[2,3,2,4,3,4,5,5]} />
        <StatCard label="CA cumulé 2025" value="18 240 €" trend="+12% vs avril" spark={[1.2,1.5,1.8,2.0,1.9,2.3,2.5,2.7]} />
        <StatCard label="Cotisations dues" value="3 866 €" trend="prochain prélèv. 15 mai" trendNeutral />
        <StatCard label="Délai moyen INPI" value="3.2 j" trend="−0.4j vs avril" spark={[4.5,4.2,4.0,3.8,3.7,3.4,3.3,3.2]} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, marginBottom: 20 }} className="dash-row">
        <div className="app-card">
          <div className="app-card-head">
            <h3>Mes dossiers récents</h3>
            <button className="btn btn-link btn-sm" onClick={() => setRoute('dossiers')}>Voir tout <I.ChevRight size={14} /></button>
          </div>
          <div>
            {mesDossiers.map(d => (
              <div key={d.id}
                   onClick={() => { setActiveDossier(d); setRoute('dossier-detail'); }}
                   style={{
                     display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center',
                     padding: '14px 22px', borderBottom: '1px solid var(--ink-100)', cursor: 'pointer',
                     gap: 12,
                   }} className="hover-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="avatar">{d.initials}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-900)' }}>{d.client}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>
                      {d.type} · <span className="mono">{d.id}</span>
                    </div>
                  </div>
                </div>
                <StatusPill tone={d.tone} label={d.label} />
              </div>
            ))}
          </div>
        </div>

        <div className="app-card">
          <div className="app-card-head">
            <h3>Activité récente</h3>
          </div>
          <div style={{ padding: '8px 22px 16px' }}>
            {recentActivity.map((a, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '32px 1fr',
                gap: 12, padding: '12px 0',
                borderBottom: i < recentActivity.length - 1 ? '1px solid var(--ink-100)' : 'none',
              }}>
                <div className={`pill ${a.tone}`} style={{ width: 32, height: 32, padding: 0, borderRadius: 8, display: 'grid', placeItems: 'center' }}>
                  {React.createElement(I[a.icon], { size: 15 })}
                </div>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--ink-800)', lineHeight: 1.45 }}>{a.text}</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 4 }}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CA chart + alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }} className="dash-row">
        <div className="app-card">
          <div className="app-card-head">
            <h3>Chiffre d'affaires 2025</h3>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-ghost btn-sm" style={{ padding: '4px 10px', fontSize: 12 }}>Mois</button>
              <button className="btn btn-primary btn-sm" style={{ padding: '4px 10px', fontSize: 12 }}>Année</button>
            </div>
          </div>
          <div style={{ padding: 22 }}>
            <CAChart />
          </div>
        </div>

        <div className="app-card">
          <div className="app-card-head">
            <h3>Vigilance</h3>
            <I.Bell size={15} style={{ color: 'var(--ink-400)' }} />
          </div>
          <div style={{ padding: '8px 22px 20px', display: 'grid', gap: 12 }}>
            <Alert
              tone="amber"
              title="Seuil TVA approche"
              text="Vous êtes à 78% du seuil de franchise (37 500 €). Pensez à anticiper la bascule." />
            <Alert
              tone="blue"
              title="Déclaration CA mai"
              text="À déposer avant le 30 juin. On vous notifie à 7 jours." />
            <Alert
              tone="violet"
              title="ACRE bientôt expirée"
              text="Vos exonérations ACRE prennent fin le 31 mars 2026." />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1100px) {
          .dash-row { grid-template-columns: 1fr !important; }
        }
        .hover-row:hover { background: var(--ink-50); }
        .hover-row:last-child { border-bottom: none !important; }
      `}</style>
    </div>
  );
};

const StatCard = ({ label, value, trend, trendNeutral, spark }) => (
  <div className="stat-card">
    <div className="stat-card-label">{label}</div>
    <div className="stat-card-value">{value}</div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 }}>
      <div className="stat-card-trend" style={{ color: trendNeutral ? 'var(--ink-500)' : 'var(--status-green)' }}>{trend}</div>
      {spark && (
        <div style={{ width: 80, opacity: 0.85 }}>
          <SparkLine values={spark} height={24} />
        </div>
      )}
    </div>
  </div>
);

const Alert = ({ tone, title, text }) => (
  <div style={{
    display: 'flex', gap: 12,
    padding: 14, borderRadius: 10,
    background: tone === 'amber' ? '#FEF6E7' : tone === 'blue' ? '#EFF4FE' : 'var(--accent-soft)',
  }}>
    <div style={{
      width: 6, borderRadius: 3, flexShrink: 0,
      background: tone === 'amber' ? 'var(--status-amber)' : tone === 'blue' ? 'var(--status-blue)' : 'var(--accent)',
    }} />
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-900)' }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--ink-600)', marginTop: 4, lineHeight: 1.5 }}>{text}</div>
    </div>
  </div>
);

const CAChart = () => {
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const data = [1850, 2240, 2980, 3120, 2480, 2680, 2820, 0, 0, 0, 0, 0];
  const seuil = 37500 / 12 * 2; // visual mid
  const max = Math.max(...data, seuil) * 1.1;
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 200, paddingBottom: 24, borderBottom: '1px solid var(--ink-150)' }}>
        {data.map((v, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%' }}>
            <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
              {v > 0 && (
                <div style={{
                  width: '100%',
                  height: `${(v / max) * 100}%`,
                  background: i === 4 ? 'var(--accent)' : 'var(--accent-soft)',
                  borderRadius: '4px 4px 0 0',
                  border: i !== 4 ? `1px solid color-mix(in oklab, var(--accent) 30%, transparent)` : 'none',
                  transition: 'height .3s',
                  position: 'relative',
                }}>
                  {i === 4 && (
                    <div style={{
                      position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)',
                      fontSize: 11, color: 'var(--accent-ink)', fontWeight: 500, whiteSpace: 'nowrap',
                    }}>2 480 €</div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {months.map((m, i) => (
          <div key={m} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: i === 4 ? 'var(--accent-ink)' : 'var(--ink-500)', fontWeight: i === 4 ? 500 : 400 }}>{m}</div>
        ))}
      </div>
    </div>
  );
};

window.AppDashboard = AppDashboard;
