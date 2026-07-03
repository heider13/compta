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
          Compta pense comme<br />
          un formaliste.<br />
          <span className="hl">Et travaille comme tout un cabinet.</span>
        </h1>
        <p className="lead" style={{ maxWidth: 640, margin: '0 auto' }}>
          Déposez une pièce d&apos;identité, saisissez un SIREN : la liasse INPI se
          remplit toute seule, les statuts se génèrent, la signature part en un clic.
          Vous ne faites plus que vérifier.
        </p>
        <div className="hero-cta">
          <a href="/auth/signup" className="btn btn-accent btn-lg">
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
