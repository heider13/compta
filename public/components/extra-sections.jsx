/* eslint-disable */
// Sections complémentaires : Documents requis · Témoignages · Comparatif DIY vs Compta

// ─── Documents requis ────────────────────────────────────────────
const DocumentsRequis = () => {
  const docs = [
    {
      icon: 'Doc',
      title: "Pièce d'identité",
      desc: "Carte nationale d'identité ou passeport en cours de validité. Recto-verso si CNI. Format PDF.",
      meta: 'Tous types · obligatoire',
    },
    {
      icon: 'Pin',
      title: "Justificatif de domicile",
      desc: "Facture (électricité, gaz, internet, téléphone) ou quittance de loyer de moins de 3 mois à votre nom.",
      meta: 'Création · obligatoire',
    },
    {
      icon: 'Lock',
      title: 'Déclaration sur l\'honneur',
      desc: "Déclaration de non-condamnation et de filiation. Modèle pré-rempli dans votre espace, il suffit de signer.",
      meta: 'Création · pré-rempli',
    },
    {
      icon: 'Building',
      title: 'Justificatif du nouveau local',
      desc: 'Bail commercial, attestation de domiciliation ou facture, selon le cas. Uniquement pour les modifications d\'adresse.',
      meta: 'Modification · selon le cas',
    },
  ];
  return (
    <section id="documents" className="section">
      <div className="container">
        <div className="sec-head">
          <span className="eyebrow"><span className="dot" />Ce qu'il vous faut</span>
          <h2>Préparez 2 ou 3 pièces.<br />C'est tout.</h2>
          <p className="lead">Tout se gère en ligne, en PDF. Vous téléversez les fichiers depuis votre téléphone ou votre ordinateur, on s'occupe du reste.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {docs.map(d => (
            <div key={d.title} className="card-elev" style={{ padding: 24 }}>
              <div className="icon-tile-lg" style={{ marginBottom: 18 }}>
                {React.createElement(I[d.icon], { size: 22 })}
              </div>
              <h3 style={{ fontSize: 17, marginBottom: 8 }}>{d.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--ink-600)', marginBottom: 14, minHeight: 60 }}>{d.desc}</p>
              <span style={{ fontSize: 11, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: 0.05, fontWeight: 500 }}>{d.meta}</span>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: 'var(--ink-500)' }}>
          Pas de scanner ? Une photo nette prise au téléphone fait l'affaire. On vérifie la lisibilité avant tout dépôt.
        </p>
      </div>
    </section>
  );
};

// ─── Témoignages ─────────────────────────────────────────────────
const Testimonials = () => {
  const items = [
    {
      name: 'Camille L.',
      role: 'Graphiste freelance · Lyon',
      stars: 5,
      quote: "J'avais tenté seule sur l'INPI, j'ai abandonné au bout de 40 minutes. Avec Compta, mon dossier était parti en moins de 10 minutes et j'ai eu mon SIRET le surlendemain. Aucune comparaison.",
    },
    {
      name: 'Mehdi B.',
      role: 'Consultant en cybersécurité · Paris',
      stars: 5,
      quote: "Le suivi en temps réel change tout. J'ai été notifié dès qu'INPI a demandé une régularisation, et la pièce corrigée est repartie automatiquement. Zéro stress, zéro mail relance à écrire.",
    },
    {
      name: 'Sarah D.',
      role: 'Coach sportive · Bordeaux',
      stars: 5,
      quote: "Tarif clair, paiement à l'acte. Pas d'abonnement caché comme chez d'autres. J'ai aussi fait ma déclaration URSSAF du trimestre via l'app — c'est devenu mon réflexe.",
    },
  ];
  return (
    <section className="section" style={{ background: 'var(--ink-50)' }}>
      <div className="container">
        <div className="sec-head">
          <span className="eyebrow"><span className="dot" />Avis utilisateurs</span>
          <h2>Ils se sont lancés<br />en quelques minutes.</h2>
          <p className="lead">Premiers retours de nos utilisateurs early-access. On affiche tout, le bon comme le brut.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {items.map((t, i) => (
            <div key={i} className="card-elev" style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 2, color: '#F59E0B' }}>
                {Array.from({ length: t.stars }).map((_, j) => (
                  <svg key={j} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l2.9 6.3 6.9.7-5.2 4.8 1.5 6.8L12 17.3l-6.1 3.3 1.5-6.8L2.2 9l6.9-.7L12 2z"/>
                  </svg>
                ))}
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--ink-800)', margin: 0, flex: 1 }}>« {t.quote} »</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 8, borderTop: '1px solid var(--ink-100)' }}>
                <div className="avatar avatar-sm" style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)' }}>
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-900)' }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── Comparatif DIY (INPI seul) vs Compta ────────────────────────
const ComparatifDIY = () => {
  const rows = [
    { label: 'Temps de saisie',           diy: '45 min à 2 h',                    compta: '~ 4 min',                              comptaGood: true },
    { label: 'Comptes à créer',           diy: 'Guichet Unique + e-procedures',   compta: '1 compte Compta',                      comptaGood: true },
    { label: 'Erreurs de codes NAF',      diy: 'Fréquentes — code à 1 chiffre près', compta: "Suggéré automatiquement à partir de votre description", comptaGood: true },
    { label: 'Suivi du dossier',          diy: 'À vous de retourner consulter',   compta: 'Notifs email + SMS à chaque étape',    comptaGood: true },
    { label: 'Régularisations INPI',      diy: 'À gérer vous-même',               compta: '70% résolues automatiquement',         comptaGood: true },
    { label: 'Support',                   diy: 'Hotline INPI saturée',            compta: 'Réponse en moins de 2 h ouvrées',      comptaGood: true },
    { label: 'Déclarations URSSAF',       diy: 'Site séparé, autre compte',        compta: 'Intégré au tableau de bord',           comptaGood: true },
    { label: 'Frais légaux',              diy: 'Gratuit',                          compta: 'Gratuit (inclus dans le forfait)',     comptaGood: false },
    { label: 'Frais de service',          diy: '0 €',                              compta: '49 € au dépôt (sans abonnement)',     comptaGood: false },
  ];
  return (
    <section className="section">
      <div className="container">
        <div className="sec-head">
          <span className="eyebrow"><span className="dot" />Honnêteté</span>
          <h2>Faire seul, ou faire avec nous.<br />Comparez.</h2>
          <p className="lead">Vous pouvez créer votre auto-entreprise gratuitement sur le portail INPI. Voici concrètement ce que vous y gagnez (ou pas) en passant par Compta.</p>
        </div>

        <div className="card-elev" style={{ overflow: 'hidden', maxWidth: 920, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1.2fr', background: 'var(--ink-50)', padding: '14px 22px', borderBottom: '1px solid var(--ink-150)', fontSize: 12, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: 0.06, fontWeight: 600 }}>
            <span></span>
            <span style={{ textAlign: 'center' }}>Seul via INPI</span>
            <span style={{ textAlign: 'center', color: 'var(--accent-ink)' }}>Avec Compta</span>
          </div>
          {rows.map((r, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1.3fr 1fr 1.2fr',
              padding: '14px 22px', alignItems: 'center', gap: 10,
              borderBottom: i < rows.length - 1 ? '1px solid var(--ink-100)' : 'none',
              fontSize: 14,
            }}>
              <span style={{ color: 'var(--ink-700)', fontWeight: 500 }}>{r.label}</span>
              <span style={{ textAlign: 'center', color: 'var(--ink-600)' }}>{r.diy}</span>
              <span style={{ textAlign: 'center', color: r.comptaGood ? 'var(--accent-ink)' : 'var(--ink-600)', fontWeight: r.comptaGood ? 500 : 400 }}>{r.compta}</span>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--ink-500)', maxWidth: 640, margin: '24px auto 0' }}>
          Notre prix paie le temps que vous économisez, l'expertise mandataire INPI et le suivi continu — pas la formalité elle-même qui reste gratuite côté administration.
        </p>
      </div>
    </section>
  );
};

window.DocumentsRequis = DocumentsRequis;
window.Testimonials = Testimonials;
window.ComparatifDIY = ComparatifDIY;
