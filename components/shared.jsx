/* eslint-disable */
// Shared atoms: logo, nav, hero, footer, eyebrow, button utilities

const Logo = ({ size = 'md' }) => (
  <a href="#" className="logo" aria-label="Compta">
    <span className="logo-mark" style={{
      width: size === 'lg' ? 36 : 28,
      height: size === 'lg' ? 36 : 28,
      fontSize: size === 'lg' ? 17 : 14,
    }}>C</span>
    <span style={{ fontSize: size === 'lg' ? 24 : 19 }}>compta</span>
  </a>
);

const Nav = () => {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <nav className="nav" style={{
      boxShadow: scrolled ? '0 1px 0 var(--ink-100)' : 'none',
    }}>
      <div className="container nav-inner">
        <Logo />
        <div className="nav-links">
          <a href="#formalites" className="nav-link">Formalités</a>
          <a href="#simulateur" className="nav-link">Simulateur</a>
          <a href="#suivi" className="nav-link">Suivi dossier</a>
          <a href="#tarifs" className="nav-link">Tarifs</a>
          <a href="#faq" className="nav-link">FAQ</a>
        </div>
        <div className="nav-cta">
          <a href="auth/login.html" className="btn btn-ghost btn-sm">Se connecter</a>
          <a href="auth/signup.html" className="btn btn-primary btn-sm">
            Démarrer
            <I.Arrow size={16} />
          </a>
        </div>
      </div>
    </nav>
  );
};

const HeroProductPreview = () => (
  <div className="hero-product-frame">
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '12px 16px', borderBottom: '1px solid var(--ink-150)',
      background: 'var(--ink-50)'
    }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E' }} />
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C940' }} />
      <div className="mono" style={{
        fontSize: 12, color: 'var(--ink-500)',
        background: 'white', border: '1px solid var(--ink-150)',
        borderRadius: 6, padding: '4px 12px', margin: '0 auto',
      }}>app.compta.fr/dossiers</div>
      <span style={{ width: 60 }} />
    </div>
    <Dashboard preview />
  </div>
);

const Hero = ({ accent }) => (
  <section className="hero">
    <div className="hero-bg" />
    <div className="hero-grid" />
    <div className="container hero-content">
      <span className="eyebrow" style={{ margin: '0 auto' }}>
        <span className="dot" />
        Connecté à l'INPI Guichet Unique
      </span>
      <h1>
        Créez votre auto-entreprise<br />
        en <span className="hl">4 minutes</span>, pas en 4 semaines.
      </h1>
      <p className="lead" style={{ maxWidth: 580, margin: '0 auto' }}>
        Compta dépose votre dossier directement auprès du Guichet Unique INPI.
        Pas de paperasse. Pas d'allers-retours. Vous recevez votre Kbis par email.
      </p>
      <div className="hero-cta">
        <a href="auth/signup.html" className="btn btn-accent btn-lg">
          Démarrer maintenant
          <I.Arrow size={18} />
        </a>
        <a href="#tarifs" className="btn btn-ghost btn-lg">
          Voir les tarifs
        </a>
      </div>
      <div className="hero-price-band">
        <a href="auth/signup.html" className="price-chip">
          <span className="lbl">Création AE</span>
          <span className="val">49 €</span>
          <span className="suf">/ formalité</span>
        </a>
        <a href="auth/signup.html" className="price-chip highlighted">
          <span className="lbl">Essentiel</span>
          <span className="val">19,99 €</span>
          <span className="suf">/ mois</span>
          <span className="badge">Le + choisi</span>
        </a>
        <a href="auth/signup.html" className="price-chip">
          <span className="lbl">Conseil</span>
          <span className="val">29,99 €</span>
          <span className="suf">/ mois</span>
        </a>
      </div>
      <div className="hero-trust">
        <span><I.Shield size={16} /> Données chiffrées</span>
        <span><I.Bolt size={16} /> Dépôt en 24h</span>
        <span><I.Check size={16} /> Sans engagement</span>
      </div>
    </div>
    <div className="hero-product">
      <HeroProductPreview />
    </div>
  </section>
);

const LogosStrip = () => (
  <section className="logos-strip">
    <div className="container">
      <div className="logos-label">Partenaires & intégrations officielles</div>
      <div className="logos-row">
        <span className="logo-item">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z"/></svg>
          INPI · Guichet Unique
        </span>
        <span className="logo-item">Pappers</span>
        <span className="logo-item">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>
          URSSAF
        </span>
        <span className="logo-item">CFE</span>
        <span className="logo-item">DGFiP</span>
        <span className="logo-item">RNE</span>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="footer">
    <div className="container">
      <div className="footer-grid">
        <div>
          <Logo />
          <p style={{ color: 'var(--ink-400)', marginTop: 16, fontSize: 14, maxWidth: 280 }}>
            La plateforme tout-en-un pour vos formalités d'auto-entrepreneur. Connecté au Guichet Unique INPI.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <span className="pill" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--ink-200)' }}>
              <I.Shield size={12} /> ISO 27001
            </span>
            <span className="pill" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--ink-200)' }}>
              RGPD
            </span>
          </div>
        </div>
        <div>
          <h4>Produit</h4>
          <a href="#formalites">Formalités</a>
          <a href="#simulateur">Simulateur</a>
          <a href="#suivi">Suivi dossier</a>
          <a href="#tarifs">Tarifs</a>
        </div>
        <div>
          <h4>Ressources</h4>
          <a href="#faq">FAQ</a>
          <a href="#">Guide auto-entrepreneur</a>
          <a href="#">Seuils micro 2025</a>
          <a href="#">Blog</a>
        </div>
        <div>
          <h4>Société</h4>
          <a href="#">À propos</a>
          <a href="#">Sécurité</a>
          <a href="#">Contact</a>
          <a href="#">Recrutement</a>
        </div>
        <div>
          <h4>Légal</h4>
          <a href="#">CGU</a>
          <a href="#">Politique de confidentialité</a>
          <a href="#">Mentions légales</a>
          <a href="#">Cookies</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2025 Compta SAS · 12 rue de la Paix, 75002 Paris</span>
        <span>RCS Paris 921 384 502 · Mandataire INPI agréé</span>
      </div>
    </div>
  </footer>
);

Object.assign(window, { Logo, Nav, Hero, LogosStrip, Footer, HeroProductPreview });
