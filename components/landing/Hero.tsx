import { Arrow, Shield, Bolt, Check } from '@/components/icons';

export function Hero() {
  return (
    <section className="hero">
      <div className="hero-bg" />
      <div className="hero-grid" />
      <div className="container hero-content">
        <span className="eyebrow" style={{ margin: '0 auto' }}>
          <span className="dot" />
          Pour les experts-comptables, avocats et formalistes
        </span>
        <h1>
          Toutes les formalités<br />
          juridiques d&apos;entreprise.<br />
          <span className="hl">Un seul logiciel.</span>
        </h1>
        <p className="lead" style={{ maxWidth: 640, margin: '0 auto' }}>
          Compta centralise la gestion des dossiers de création, modification et radiation
          de sociétés (auto-entreprises, SASU, SAS, EURL, SARL, SCI, holdings) directement
          via l&apos;API officielle du Guichet Unique INPI.
        </p>
        <div className="hero-cta">
          <a href="/auth/signup.html" className="btn btn-accent btn-lg">
            Demander une démo
            <Arrow size={18} />
          </a>
          <a href="#fonctionnalites" className="btn btn-ghost btn-lg">
            Voir les fonctionnalités
          </a>
        </div>
        <div className="hero-trust">
          <span><Shield size={16} /> RGPD · Hébergement France</span>
          <span><Bolt size={16} /> Connecté INPI Guichet Unique</span>
          <span><Check size={16} /> Multi-cabinets · marque blanche</span>
        </div>
      </div>
    </section>
  );
}
