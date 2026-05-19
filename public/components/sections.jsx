/* eslint-disable */
// Major content sections: HowItWorks, Formalites, ApiIntegration, Pricing, CTAFinal

const HowItWorks = () => {
  const steps = [
    {
      n: '01', title: 'Vous remplissez en 4 minutes',
      desc: "Activité, identité, adresse, options fiscales. Nos formulaires intelligents reconnaissent votre métier et pré-remplissent le code NAF + la nature d'activité.",
      icon: 'Doc',
    },
    {
      n: '02', title: 'On dépose au Guichet Unique',
      desc: "Compta convertit votre formulaire en payload officiel INPI, ajoute vos pièces jointes signées et dépose le dossier via l'API du GU. Sous 24h ouvrées.",
      icon: 'Send',
    },
    {
      n: '03', title: 'Vous recevez votre Kbis',
      desc: "Suivi temps réel des statuts INPI. Alertes email + SMS à chaque étape. Dès validation, votre extrait Kbis arrive dans votre espace, prêt à imprimer.",
      icon: 'Check',
    },
  ];
  return (
    <section id="comment" className="section">
      <div className="container">
        <div className="sec-head">
          <span className="eyebrow"><span className="dot" />Comment ça marche</span>
          <h2>De l'idée au Kbis, en trois clics.</h2>
          <p className="lead">Le parcours administratif le plus court de France. Vraiment.</p>
        </div>
        <div className="grid-3" style={{ position: 'relative' }}>
          {steps.map((s, i) => (
            <div key={s.n} className="card" style={{ padding: 28, position: 'relative' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 28,
              }}>
                <span className="mono" style={{
                  fontSize: 13, color: 'var(--accent-ink)', fontWeight: 500,
                  background: 'var(--accent-soft)', padding: '4px 10px', borderRadius: 999,
                }}>{s.n}</span>
                <div className="icon-tile-lg">
                  {React.createElement(I[s.icon], { size: 24 })}
                </div>
              </div>
              <h3 style={{ fontSize: 22, marginBottom: 10 }}>{s.title}</h3>
              <p style={{ fontSize: 15 }}>{s.desc}</p>
              {i < steps.length - 1 && (
                <div style={{
                  position: 'absolute', right: -10, top: '50%',
                  transform: 'translateY(-50%)', zIndex: 1,
                  display: 'none', // shown only on desktop via media
                }} className="step-arrow">
                  <I.ChevRight size={20} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Formalites = () => {
  const items = [
    {
      icon: 'DocPlus', title: 'Création',
      tag: 'Le plus demandé', tagTone: 'violet',
      price: '49€',
      bullets: [
        'Dossier déposé sous 24h ouvrées',
        'Code NAF auto-détecté · 747 codes 2025',
        'CNI + justificatif de domicile suffisent',
        'Signature simple (pas de certificat)',
      ],
    },
    {
      icon: 'DocEdit', title: 'Modification',
      tag: 'Signature avancée', tagTone: 'amber',
      price: '39€',
      bullets: [
        "Changement d'adresse, d'activité, de dénomination",
        'Récupération auto via API RNE',
        'Champs déclencheurs validés en amont',
        'Service de signature qualifiée inclus',
      ],
    },
    {
      icon: 'DocX', title: 'Radiation',
      tag: 'Sans pièces', tagTone: 'gray',
      price: '29€',
      bullets: [
        'Cessation volontaire ou subie',
        'Date d\'effet flexible (jusqu\'à J−30)',
        'Aucune pièce à fournir (cas général)',
        'Confirmation déclaration CA incluse',
      ],
    },
  ];
  return (
    <section id="formalites" className="section" style={{ background: 'var(--ink-50)' }}>
      <div className="container">
        <div className="sec-head">
          <span className="eyebrow"><span className="dot" />Formalités couvertes</span>
          <h2>Toutes vos démarches AE,<br/>déposées au Guichet Unique.</h2>
          <p className="lead">Création, modification, radiation. Nous couvrons l'intégralité du cycle de vie de votre auto-entreprise.</p>
        </div>
        <div className="grid-3">
          {items.map(f => (
            <div key={f.title} className="card" style={{ padding: 28, background: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div className="icon-tile-lg">
                  {React.createElement(I[f.icon], { size: 24 })}
                </div>
                <span className={`pill ${f.tagTone}`}>{f.tag}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                <h3 style={{ fontSize: 24 }}>{f.title}</h3>
                <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--accent-ink)' }}>
                  {f.price}
                </span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
                {f.bullets.map(b => (
                  <li key={b} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: 'var(--ink-700)' }}>
                    <I.Check size={16} style={{ color: 'var(--accent)', marginTop: 3, flexShrink: 0 }} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const ApiIntegration = () => (
  <section id="api" className="section">
    <div className="container">
      <div className="grid-2" style={{ alignItems: 'center', gap: 64 }}>
        <div>
          <span className="eyebrow"><span className="dot" />Intégration officielle</span>
          <h2 style={{ marginTop: 16, marginBottom: 18 }}>
            Branché directement<br/>sur les API officielles.
          </h2>
          <p className="lead" style={{ marginBottom: 28 }}>
            Compta n'est pas un intermédiaire qui retape vos données.
            Nous écrivons vos formalités directement dans le Guichet Unique INPI
            via leur API officielle, et nous enrichissons votre dossier avec Pappers.
          </p>
          <div style={{ display: 'grid', gap: 16 }}>
            {[
              ['Bolt', 'JWT Bearer auto-renouvelé', 'Authentification GU gérée en arrière-plan, tokens rotation toutes les 55 minutes.'],
              ['Stack', 'Workflow par type de formalité', 'Création → Modification → Radiation. Chaque flux a son orchestrateur dédié.'],
              ['Shield', 'Pièces jointes chiffrées', 'Format PDF, encodage base64, max 10 Mo, transmises à l\'INPI sans intermédiaire.'],
              ['Clock', 'Polling toutes les 4 heures', 'Statuts INPI synchronisés en quasi-temps réel. Webhooks dispo en API.'],
            ].map(([icon, t, d]) => (
              <div key={t} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div className="icon-tile">{React.createElement(I[icon], { size: 18 })}</div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 15, color: 'var(--ink-900)' }}>{t}</div>
                  <div style={{ fontSize: 14, color: 'var(--ink-600)', marginTop: 2 }}>{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <ApiCodeBlock />
      </div>
    </div>
  </section>
);

const ApiCodeBlock = () => {
  const lines = [
    { c: 'kw', t: 'import' }, { c: 'p', t: ' { ' }, { c: 'fn', t: 'soumettreCreationAE' }, { c: 'p', t: ' } ' }, { c: 'kw', t: 'from' }, { c: 'str', t: " './orchestrateur'" }, { c: 'p', t: ';' }, { br: 1 },
    { br: 1 },
    { c: 'kw', t: 'const' }, { c: 'p', t: ' resultat = ' }, { c: 'kw', t: 'await' }, { c: 'p', t: ' ' }, { c: 'fn', t: 'soumettreCreationAE' }, { c: 'p', t: '(' }, { br: 1 },
    { tab: 1 }, { c: 'p', t: '{' }, { br: 1 },
    { tab: 2 }, { c: 'k', t: 'nomNaissance' }, { c: 'p', t: ': ' }, { c: 'str', t: "'DUPONT'" }, { c: 'p', t: ',' }, { br: 1 },
    { tab: 2 }, { c: 'k', t: 'prenom' }, { c: 'p', t: ': ' }, { c: 'str', t: "'Jean'" }, { c: 'p', t: ',' }, { br: 1 },
    { tab: 2 }, { c: 'k', t: 'codeNaf' }, { c: 'p', t: ': ' }, { c: 'str', t: "'6202A'" }, { c: 'p', t: ',' }, { c: 'cmt', t: '   // Conseil en informatique' }, { br: 1 },
    { tab: 2 }, { c: 'k', t: 'natureActivite' }, { c: 'p', t: ': ' }, { c: 'str', t: "'LIBERALE'" }, { c: 'p', t: ',' }, { br: 1 },
    { tab: 2 }, { c: 'k', t: 'dateDebutActivite' }, { c: 'p', t: ': ' }, { c: 'str', t: "'01/04/2025'" }, { c: 'p', t: ',' }, { br: 1 },
    { tab: 2 }, { c: 'k', t: 'demandeAccre' }, { c: 'p', t: ': ' }, { c: 'lit', t: 'true' }, { c: 'p', t: ',' }, { br: 1 },
    { tab: 1 }, { c: 'p', t: '},' }, { br: 1 },
    { tab: 1 }, { c: 'p', t: '{ ' }, { c: 'k', t: 'payerAutomatiquement' }, { c: 'p', t: ': ' }, { c: 'lit', t: 'true' }, { c: 'p', t: ' }' }, { br: 1 },
    { c: 'p', t: ');' }, { br: 1 },
    { br: 1 },
    { c: 'cmt', t: "// → resultat.liasseNumber: 'J00010000024'" },
  ];
  const colors = {
    kw:  '#C792EA',
    fn:  '#82AAFF',
    str: '#C3E88D',
    k:   '#FFCB6B',
    lit: '#F78C6C',
    cmt: '#637777',
    p:   '#D6DEEB',
  };
  return (
    <div style={{
      background: '#0F1228',
      borderRadius: 16,
      padding: 24,
      boxShadow: '0 20px 60px -20px rgba(91,54,214,0.3), 0 4px 12px rgba(0,0,0,0.2)',
      border: '1px solid rgba(255,255,255,0.06)',
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      lineHeight: 1.7,
      color: '#D6DEEB',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C940' }} />
        <span style={{ marginLeft: 12, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>orchestrateur.ts</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>POST /api/formalities</span>
      </div>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
{lines.map((seg, i) => {
  if (seg.br) return '\n';
  if (seg.tab) return '  '.repeat(seg.tab);
  return <span key={i} style={{ color: colors[seg.c] || '#D6DEEB' }}>{seg.t}</span>;
})}
      </pre>
    </div>
  );
};

const Pricing = () => {
  const plans = [
    {
      name: 'À la carte', desc: 'Pour les besoins ponctuels, sans engagement.',
      price: '49 €', priceSuffix: ' / formalité', cta: 'Démarrer', tone: 'ghost',
      features: [
        'Création AE — 49 €',
        'Modification — 39 €',
        'Radiation — 29 €',
        'Suivi de statut illimité',
        'Notifications email + SMS',
      ],
    },
    {
      name: 'Essentiel', desc: 'Le pack complet pour piloter votre activité au quotidien.',
      price: '19,99 €', priceSuffix: ' / mois', cta: 'Démarrer 30 jours', tone: 'accent', highlight: true,
      features: [
        'Facturation électronique conforme 2026',
        'Déclarations URSSAF automatisées',
        'Aide à la déclaration de TVA',
        'Tableau de bord temps réel',
        'Devis et bons de commande illimités',
        'Fichier client centralisé',
      ],
    },
    {
      name: 'Conseil', desc: 'Essentiel + un expert qui répond à vos questions.',
      price: '29,99 €', priceSuffix: ' / mois', cta: 'Souscrire', tone: 'ghost',
      features: [
        'Tout l\'Essentiel inclus',
        'Assistance conseil dédiée',
        'Réponse par chat sous 2 h ouvrées',
        'Rendez-vous expert sur demande',
        'Optimisation fiscale et stratégique',
      ],
    },
  ];
  return (
    <section id="tarifs" className="section section-tarifs">
      <div className="tarifs-bg" aria-hidden="true" />
      <div className="container" style={{ position: 'relative' }}>
        <div className="sec-head">
          <span className="eyebrow"><span className="dot" />Tarifs</span>
          <h2>Simple, comme nos formulaires.</h2>
          <p className="lead">Pas d'engagement. Pas de frais cachés. Vous payez ce que vous utilisez.</p>
        </div>
        <div className="grid-3 pricing-grid">
          {plans.map(p => (
            <div key={p.name} className={`pricing-card ${p.highlight ? 'highlighted card-elev' : 'card'}`} style={{
              padding: 28,
              border: p.highlight ? '2px solid var(--accent)' : undefined,
              position: 'relative',
              background: p.highlight ? 'linear-gradient(180deg, var(--violet-50), white 30%)' : 'white',
            }}>
              {p.highlight && (
                <span className="pill violet" style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--accent)', color: 'white', fontSize: 11, padding: '4px 12px',
                }}>
                  <I.Sparkle size={11} />
                  RECOMMANDÉ
                </span>
              )}
              <h3 style={{ fontSize: 22, marginBottom: 6 }}>{p.name}</h3>
              <p style={{ fontSize: 14, minHeight: 40 }}>{p.desc}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '20px 0 24px' }}>
                <span style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink-900)' }}>{p.price}</span>
                <span style={{ fontSize: 14, color: 'var(--ink-500)' }}>{p.priceSuffix}</span>
              </div>
              <a href="auth/signup.html" className={`btn ${p.tone === 'accent' ? 'btn-accent' : 'btn-ghost'}`} style={{ width: '100%', marginBottom: 24, justifyContent: 'center' }}>
                {p.cta}
                <I.Arrow size={16} />
              </a>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
                {p.features.map(f => (
                  <li key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: 'var(--ink-700)' }}>
                    <I.Check size={16} style={{ color: 'var(--accent)', marginTop: 3, flexShrink: 0 }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const CTAFinal = () => (
  <section className="section" style={{ paddingTop: 0 }}>
    <div className="container">
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, var(--violet-700) 0%, var(--violet-500) 60%, var(--violet-400) 100%)',
        borderRadius: 28,
        padding: '64px 48px',
        textAlign: 'center',
        color: 'white',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.15), transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1), transparent 50%)',
          pointerEvents: 'none',
        }} />
        <span className="eyebrow" style={{
          background: 'rgba(255,255,255,0.15)', color: 'white',
          border: '1px solid rgba(255,255,255,0.25)', position: 'relative',
        }}>
          <span className="dot" style={{ background: 'white' }} />
          Prêt à commencer ?
        </span>
        <h2 style={{ color: 'white', fontSize: 'clamp(32px, 4vw, 56px)', marginTop: 16, marginBottom: 16, position: 'relative' }}>
          Votre Kbis n'attend plus que vous.
        </h2>
        <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.85)', maxWidth: 540, margin: '0 auto 32px', position: 'relative' }}>
          Plus de 12 000 entrepreneurs ont déjà créé leur AE avec Compta. Rejoignez-les en 4 minutes.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
          <a href="auth/signup.html" className="btn btn-lg" style={{ background: 'white', color: 'var(--accent-ink)', fontWeight: 500 }}>
            Démarrer maintenant
            <I.Arrow size={18} />
          </a>
          <a href="#tarifs" className="btn btn-lg" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>
            Voir les tarifs
          </a>
        </div>
      </div>
    </div>
  </section>
);

Object.assign(window, { HowItWorks, Formalites, ApiIntegration, Pricing, CTAFinal });
