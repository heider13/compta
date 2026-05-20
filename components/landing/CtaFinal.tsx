import { Arrow } from '@/components/icons';

export function CtaFinal() {
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="container">
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            background:
              'linear-gradient(135deg, var(--violet-700) 0%, var(--violet-500) 60%, var(--violet-400) 100%)',
            borderRadius: 28,
            padding: '64px 48px',
            textAlign: 'center',
            color: 'white',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.15), transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1), transparent 50%)',
              pointerEvents: 'none',
            }}
          />
          <span
            className="eyebrow"
            style={{
              background: 'rgba(255,255,255,0.15)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.25)',
              position: 'relative',
            }}
          >
            <span className="dot" style={{ background: 'white' }} />
            Prêt à industrialiser vos formalités ?
          </span>
          <h2 style={{ color: 'white', fontSize: 'clamp(32px, 4vw, 56px)', marginTop: 16, marginBottom: 16, position: 'relative' }}>
            Faites passer votre cabinet<br />à la vitesse supérieure.
          </h2>
          <p
            style={{
              fontSize: 18,
              color: 'rgba(255,255,255,0.85)',
              maxWidth: 600,
              margin: '0 auto 32px',
              position: 'relative',
            }}
          >
            Démarrez avec 30 jours gratuits. Onboarding personnalisé, import de votre portefeuille client, formation de vos collaborateurs.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
            <a
              href="/auth/signup"
              className="btn btn-lg"
              style={{ background: 'white', color: 'var(--accent-ink)', fontWeight: 500 }}
            >
              Demander une démo
              <Arrow size={16} />
            </a>
            <a
              href="#tarifs"
              className="btn btn-lg"
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              Voir les tarifs
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
