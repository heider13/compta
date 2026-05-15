/* eslint-disable */
// App entry — composes the full landing page + Tweaks

const ACCENT_PRESETS = {
  violet:  { accent: '#5B36D6', soft: '#ECE6FF', ink: '#4827B0' },
  indigo:  { accent: '#4F46E5', soft: '#E0E7FF', ink: '#3730A3' },
  fuchsia: { accent: '#C026D3', soft: '#FAE8FF', ink: '#86198F' },
  midnight:{ accent: '#1E1B4B', soft: '#E4E4F4', ink: '#1E1B4B' },
};

function App() {
  const [t, setTweak] = useTweaks(window.COMPTA_TWEAKS);

  // Apply accent palette to CSS custom props
  React.useEffect(() => {
    const root = document.documentElement;
    const preset = Object.values(ACCENT_PRESETS).find(p => p.accent.toLowerCase() === (t.accent || '').toLowerCase())
      || ACCENT_PRESETS.violet;
    root.style.setProperty('--accent', preset.accent);
    root.style.setProperty('--accent-soft', preset.soft);
    root.style.setProperty('--accent-ink', preset.ink);
  }, [t.accent]);

  React.useEffect(() => {
    document.documentElement.style.setProperty('--space-24', t.density === 'compact' ? '64px' : '96px');
    document.documentElement.style.setProperty('--space-16', t.density === 'compact' ? '48px' : '64px');
  }, [t.density]);

  return (
    <>
      <Nav />
      <Hero accent={t.accent} />
      <LogosStrip />
      <HowItWorks />

      {/* Simulateur */}
      <section id="simulateur" className="section" style={{ background: 'var(--ink-50)' }}>
        <div className="container">
          <div className="sec-head">
            <span className="eyebrow"><span className="dot" />Simulateur interactif</span>
            <h2>Commencez votre déclaration.<br/>Pas de compte requis.</h2>
            <p className="lead">Cinq étapes guidées, tout est sauvegardé localement. Vous reprenez quand vous voulez.</p>
          </div>
          <div style={{ maxWidth: 880, margin: '0 auto' }}>
            <Simulateur />
          </div>
        </div>
      </section>

      <Formalites />

      {/* Tracker */}
      <section id="suivi" className="section">
        <div className="container">
          <div className="grid-2" style={{ alignItems: 'center', gap: 64 }}>
            <div>
              <span className="eyebrow"><span className="dot" />Suivi temps réel</span>
              <h2 style={{ marginTop: 16, marginBottom: 18 }}>
                Plus jamais d'angoisse<br />administrative.
              </h2>
              <p className="lead" style={{ marginBottom: 28 }}>
                Synchronisation continue avec le Guichet Unique INPI.
                Chaque changement de statut côté administration déclenche une notification.
                Vous savez exactement où en est votre dossier, à toute heure.
              </p>
              <div style={{ display: 'grid', gap: 14 }}>
                {[
                  ['Notifications email + SMS instantanées', 'Bell'],
                  ['Régularisations résolues automatiquement à 70%', 'Sparkle'],
                  ['Historique exportable PDF / CSV', 'Doc'],
                  ['Webhooks dispo pour intégration logiciel cabinet', 'Link'],
                ].map(([text, icon]) => (
                  <div key={text} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className="icon-tile" style={{ width: 32, height: 32 }}>
                      {React.createElement(I[icon], { size: 15 })}
                    </div>
                    <span style={{ fontSize: 15, color: 'var(--ink-700)' }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>
            <Timeline />
          </div>
        </div>
      </section>

      <ApiIntegration />

      {/* Calculateur + Dashboard */}
      <section className="section" style={{ background: 'var(--ink-50)' }}>
        <div className="container">
          <div className="sec-head">
            <span className="eyebrow"><span className="dot" />Outils & démo</span>
            <h2>Un tableau de bord pensé pour les auto-entrepreneurs.</h2>
            <p className="lead">Calculez vos charges, gardez l'œil sur le seuil micro, suivez tous vos dossiers — au même endroit.</p>
          </div>
          <div style={{ display: 'grid', gap: 24 }}>
            <Calculateur />
            <div className="card-elev" style={{ overflow: 'hidden' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 16px', borderBottom: '1px solid var(--ink-150)',
                background: 'var(--ink-50)'
              }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C940' }} />
                <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--ink-500)' }} className="mono">app.compta.fr</span>
              </div>
              <Dashboard />
            </div>
          </div>
        </div>
      </section>

      <Pricing />

      {/* FAQ */}
      <section id="faq" className="section">
        <div className="container">
          <div className="grid-2" style={{ gap: 64, alignItems: 'flex-start' }}>
            <div style={{ position: 'sticky', top: 100 }} className="faq-side">
              <span className="eyebrow"><span className="dot" />FAQ</span>
              <h2 style={{ marginTop: 16, marginBottom: 18 }}>
                Questions<br />fréquentes.
              </h2>
              <p style={{ fontSize: 15, marginBottom: 24 }}>
                Vous ne trouvez pas votre réponse ? Notre équipe est joignable du lundi au vendredi.
              </p>
              <div style={{ display: 'grid', gap: 8 }}>
                <a href="mailto:hello@compta.fr" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: 'var(--ink-700)', fontSize: 14 }}>
                  <I.Mail size={16} /> hello@compta.fr
                </a>
                <a href="tel:+33177374000" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: 'var(--ink-700)', fontSize: 14 }}>
                  <I.Phone size={16} /> 01 77 37 40 00
                </a>
              </div>
            </div>
            <FAQ />
          </div>
        </div>
        <style>{`
          @media (max-width: 900px) {
            .faq-side { position: static !important; }
          }
        `}</style>
      </section>

      <CTAFinal />
      <Footer />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Accent">
          <TweakColor
            label="Couleur"
            value={t.accent}
            onChange={(v) => setTweak('accent', v)}
            options={[
              ACCENT_PRESETS.violet.accent,
              ACCENT_PRESETS.indigo.accent,
              ACCENT_PRESETS.fuchsia.accent,
              ACCENT_PRESETS.midnight.accent,
            ]}
          />
        </TweakSection>
        <TweakSection label="Densité">
          <TweakRadio
            label="Espacement"
            value={t.density}
            onChange={(v) => setTweak('density', v)}
            options={[
              { value: 'compact', label: 'Compact' },
              { value: 'comfortable', label: 'Aéré' },
            ]}
          />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
