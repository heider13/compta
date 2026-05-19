/* eslint-disable */
// Calculateur CA / seuils micro — 2025

// Seuils 2025 (3-year average for micro)
const SEUILS = {
  vente: { name: 'Vente de marchandises / hébergement', plafond: 188700, tvaSeuilBase: 85000, tvaSeuilMajore: 93500, urssaf: 0.123, ir: 0.01 },
  service: { name: 'Prestations de services (BIC)', plafond: 77700, tvaSeuilBase: 37500, tvaSeuilMajore: 41250, urssaf: 0.212, ir: 0.017 },
  liberale: { name: 'Professions libérales (BNC)', plafond: 77700, tvaSeuilBase: 37500, tvaSeuilMajore: 41250, urssaf: 0.231, ir: 0.022 },
};

const formatEUR = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const Calculateur = () => {
  const [type, setType] = React.useState('service');
  const [ca, setCa] = React.useState(48000);
  const [vfl, setVfl] = React.useState(false);

  const s = SEUILS[type];
  const urssaf = ca * s.urssaf;
  const ir = vfl ? ca * s.ir : 0;
  const net = ca - urssaf - ir;
  const pctPlafond = Math.min(100, (ca / s.plafond) * 100);
  const overTVA = ca > s.tvaSeuilBase;
  const overTVAMajore = ca > s.tvaSeuilMajore;
  const overPlafond = ca > s.plafond;

  return (
    <div className="card-elev" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--ink-150)' }}>
        <h3 style={{ marginBottom: 6 }}>Combien je gagne réellement ?</h3>
        <p style={{ fontSize: 14 }}>Simulez vos cotisations URSSAF et l'impôt selon votre activité et votre chiffre d'affaires 2025.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 0 }} className="calc-grid">
        {/* Left: inputs */}
        <div style={{ padding: 28, borderRight: '1px solid var(--ink-150)' }} className="calc-left">
          <div style={{ display: 'grid', gap: 8, marginBottom: 24 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)' }}>Type d'activité</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
              {Object.entries(SEUILS).map(([k, v]) => (
                <label key={k} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', border: `1.5px solid ${type === k ? 'var(--accent)' : 'var(--ink-150)'}`,
                  borderRadius: 10, cursor: 'pointer',
                  background: type === k ? 'var(--accent-soft)' : 'white',
                }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%',
                    border: `2px solid ${type === k ? 'var(--accent)' : 'var(--ink-300)'}`,
                    background: 'white', display: 'grid', placeItems: 'center',
                  }}>
                    {type === k && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />}
                  </span>
                  <span style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{v.name}</div>
                    <div className="mono" style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>
                      Plafond {formatEUR(v.plafond)}/an · URSSAF {(v.urssaf * 100).toFixed(1)}%
                    </div>
                  </span>
                  <input type="radio" checked={type === k} onChange={() => setType(k)} style={{ display: 'none' }} />
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)' }}>Chiffre d'affaires annuel</span>
              <span className="mono" style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent-ink)' }}>{formatEUR(ca)}</span>
            </div>
            <input type="range" min={0} max={Math.max(s.plafond * 1.1, 200000)} step={500} value={ca}
              onChange={e => setCa(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-500)' }}>
              <span>0 €</span>
              <span>{formatEUR(s.plafond)}</span>
            </div>
          </div>

          <label style={{
            display: 'flex', alignItems: 'center', gap: 12, marginTop: 20,
            padding: '12px 14px', border: '1px solid var(--ink-150)', borderRadius: 10,
            cursor: 'pointer',
          }}>
            <span style={{
              width: 36, height: 22, borderRadius: 999, padding: 2,
              background: vfl ? 'var(--accent)' : 'var(--ink-200)',
              transition: 'background .15s',
              display: 'flex', alignItems: 'center',
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%', background: 'white',
                transform: `translateX(${vfl ? 14 : 0}px)`,
                transition: 'transform .15s',
                boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }} />
            </span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Versement libératoire de l'IR</span>
            <input type="checkbox" checked={vfl} onChange={e => setVfl(e.target.checked)} style={{ display: 'none' }} />
          </label>
        </div>

        {/* Right: results */}
        <div style={{ padding: 28, background: 'var(--ink-50)' }}>
          <div style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 6 }}>Vos revenus nets estimés</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 44, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink-900)', lineHeight: 1 }}>
            {formatEUR(net)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-500)', marginTop: 4 }}>
            soit <strong className="mono">{formatEUR(net / 12)}</strong> / mois
          </div>

          <div style={{ marginTop: 24, display: 'grid', gap: 10 }}>
            <Row label="Chiffre d'affaires" value={formatEUR(ca)} />
            <Row label={`Cotisations URSSAF (${(s.urssaf * 100).toFixed(1)}%)`} value={`− ${formatEUR(urssaf)}`} muted />
            {vfl && <Row label={`Versement libératoire (${(s.ir * 100).toFixed(1)}%)`} value={`− ${formatEUR(ir)}`} muted />}
            <div style={{ height: 1, background: 'var(--ink-150)', margin: '4px 0' }} />
            <Row label="Net après prélèvements" value={formatEUR(net)} strong />
          </div>

          {/* Plafond bar */}
          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
              <span style={{ color: 'var(--ink-600)' }}>Plafond micro-entreprise</span>
              <span className="mono" style={{ color: 'var(--ink-900)', fontWeight: 500 }}>
                {pctPlafond.toFixed(0)}%
              </span>
            </div>
            <div style={{ height: 8, background: 'var(--ink-150)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
              <div style={{
                height: '100%', width: `${pctPlafond}%`,
                background: overPlafond ? 'var(--status-red)' : pctPlafond > 80 ? 'var(--status-amber)' : 'var(--accent)',
                transition: 'all .25s ease',
              }} />
            </div>
            <div style={{ display: 'grid', gap: 6, marginTop: 12, fontSize: 12 }}>
              <Alert tone={overTVA ? (overTVAMajore ? 'red' : 'amber') : 'gray'}
                text={overTVAMajore ? `TVA obligatoire dès le mois suivant (seuil majoré ${formatEUR(s.tvaSeuilMajore)} dépassé)`
                  : overTVA ? `Vigilance TVA : seuil de base ${formatEUR(s.tvaSeuilBase)} dépassé`
                  : `TVA non applicable (sous le seuil ${formatEUR(s.tvaSeuilBase)})`} />
              {overPlafond && <Alert tone="red" text={`Plafond micro dépassé. Bascule au régime réel à prévoir.`} />}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 800px) {
          .calc-grid { grid-template-columns: 1fr !important; }
          .calc-left { border-right: none !important; border-bottom: 1px solid var(--ink-150); }
        }
      `}</style>
    </div>
  );
};

const Row = ({ label, value, muted, strong }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
    <span style={{ fontSize: 13, color: muted ? 'var(--ink-500)' : 'var(--ink-700)' }}>{label}</span>
    <span className="mono" style={{
      fontSize: strong ? 16 : 14,
      fontWeight: strong ? 600 : 500,
      color: strong ? 'var(--accent-ink)' : muted ? 'var(--ink-500)' : 'var(--ink-900)',
    }}>{value}</span>
  </div>
);

const Alert = ({ tone, text }) => (
  <div className={`pill ${tone}`} style={{ alignSelf: 'flex-start' }}>
    <span className="dot" />
    {text}
  </div>
);

window.Calculateur = Calculateur;
