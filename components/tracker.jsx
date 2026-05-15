/* eslint-disable */
// Tracker statut dossier — timeline du GU INPI

const TRACKER_STATES = [
  { id: 'RECEIVED', label: 'Reçu par le GU', date: '02 mai 2025 · 09:14', tone: 'blue', desc: "Le Guichet Unique INPI a accusé réception de votre dossier." },
  { id: 'VALIDATION_PENDING', label: 'En cours de validation', date: '02 mai 2025 · 11:02', tone: 'blue', desc: "Un agent INPI examine la complétude des pièces et les contrôles métier." },
  { id: 'AMENDMENT_PENDING', label: 'Régularisation demandée', date: '04 mai 2025 · 15:48', tone: 'orange', desc: "L'INPI vous demande une pièce complémentaire. Compta envoie automatiquement le bon document si possible." },
  { id: 'VALIDATED', label: 'Validée — Kbis disponible', date: '07 mai 2025 · 08:30', tone: 'green', desc: "Votre auto-entreprise existe officiellement. Votre extrait Kbis est dans votre espace." },
];

const Timeline = () => {
  const [activeIdx, setActiveIdx] = React.useState(2);

  // Auto-advance demo every 4s
  React.useEffect(() => {
    const t = setInterval(() => {
      setActiveIdx(i => (i + 1) % TRACKER_STATES.length);
    }, 4500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="card-elev" style={{ overflow: 'hidden' }}>
      <div style={{
        padding: '20px 28px', borderBottom: '1px solid var(--ink-150)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--ink-50)',
      }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>Dossier · Création AE</div>
          <div className="mono" style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink-900)', marginTop: 2 }}>
            CMP-48217 · Jean Dupont
          </div>
        </div>
        <span className={`pill ${TRACKER_STATES[activeIdx].tone}`}>
          <span className="dot" />
          {TRACKER_STATES[activeIdx].label}
        </span>
      </div>
      <div style={{ padding: '32px 32px 36px', position: 'relative' }}>
        {/* Vertical guide */}
        <div style={{
          position: 'absolute', left: 47, top: 40, bottom: 40,
          width: 2, background: 'var(--ink-150)',
        }} />
        <div style={{
          position: 'absolute', left: 47, top: 40,
          width: 2,
          height: `${(activeIdx / (TRACKER_STATES.length - 1)) * 100}%`,
          maxHeight: 'calc(100% - 80px)',
          background: 'var(--accent)',
          transition: 'height .5s ease',
        }} />

        {TRACKER_STATES.map((s, i) => {
          const done = i < activeIdx;
          const active = i === activeIdx;
          return (
            <div key={s.id} style={{
              display: 'grid', gridTemplateColumns: '40px 1fr',
              gap: 20, padding: '14px 0',
              alignItems: 'flex-start',
            }}>
              <div style={{
                position: 'relative', zIndex: 1,
                width: 40, height: 40, borderRadius: '50%',
                background: 'white',
                border: `2px solid ${done || active ? 'var(--accent)' : 'var(--ink-200)'}`,
                display: 'grid', placeItems: 'center',
                transition: 'all .3s ease',
              }}>
                {done ? (
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: 'var(--accent)', color: 'white',
                    display: 'grid', placeItems: 'center',
                  }}>
                    <I.Check size={14} />
                  </div>
                ) : active ? (
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: 'var(--accent)',
                    boxShadow: '0 0 0 4px color-mix(in oklab, var(--accent) 20%, transparent)',
                  }} />
                ) : (
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: 'var(--ink-200)',
                  }} />
                )}
              </div>
              <div style={{ paddingTop: 8 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  fontSize: 15, fontWeight: 500,
                  color: done || active ? 'var(--ink-900)' : 'var(--ink-400)',
                }}>
                  {s.label}
                  {active && (
                    <span className="pill" style={{
                      background: 'var(--accent-soft)', color: 'var(--accent-ink)',
                      fontSize: 10, padding: '2px 8px',
                    }}>
                      EN COURS
                    </span>
                  )}
                </div>
                <div className="mono" style={{
                  fontSize: 12, color: 'var(--ink-500)', marginTop: 4,
                }}>
                  {s.date}
                </div>
                {(active || done) && (
                  <div style={{
                    fontSize: 13, color: 'var(--ink-600)', marginTop: 8,
                    maxWidth: 480, lineHeight: 1.5,
                  }}>
                    {s.desc}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{
        padding: '14px 28px', borderTop: '1px solid var(--ink-150)',
        background: 'var(--ink-50)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 13, color: 'var(--ink-500)',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <I.Bell size={14} />
          Notifications email + SMS à chaque changement de statut
        </span>
        <button
          onClick={() => setActiveIdx(i => (i + 1) % TRACKER_STATES.length)}
          className="btn btn-link btn-sm"
        >
          Simuler le suivant
          <I.ChevRight size={14} />
        </button>
      </div>
    </div>
  );
};

window.Timeline = Timeline;
