/* eslint-disable */
// Notifications + Profil + Paramètres + Déclarations CA + Documents

const NOTIFS = [
  { id: 1, unread: true, time: 'il y a 12 min', icon: 'Check', tone: 'green',
    title: 'Dossier validé', text: 'Le dossier CMP-48202 (Sophie Marin) a été validé par l\'INPI. Votre Kbis est disponible.' },
  { id: 2, unread: true, time: 'il y a 2h', icon: 'DocEdit', tone: 'amber',
    title: 'Régularisation demandée', text: 'L\'INPI demande un justificatif de domicile valide pour CMP-48184 (Léa Moreau).' },
  { id: 3, unread: false, time: 'hier · 17:30', icon: 'Send', tone: 'blue',
    title: 'Dossier déposé', text: 'CMP-48217 transmis au Guichet Unique INPI avec succès.' },
  { id: 4, unread: false, time: 'hier · 14:02', icon: 'EUR', tone: 'violet',
    title: 'Déclaration URSSAF envoyée', text: 'Mai 2025 · 2 480 €. Prélèvement le 5 juin.' },
  { id: 5, unread: false, time: 'il y a 3 jours', icon: 'Bell', tone: 'gray',
    title: 'Seuil TVA approche', text: 'Vous êtes à 78% du seuil de franchise (37 500 €).' },
];

const Notifications = () => {
  const [tab, setTab] = React.useState('all');
  const filtered = tab === 'unread' ? NOTIFS.filter(n => n.unread) : NOTIFS;
  return (
    <div className="app-content with-bg">
      <div className="page-head">
        <div><h1>Notifications</h1><p>{NOTIFS.filter(n => n.unread).length} non lues</p></div>
        <button className="btn btn-ghost btn-sm">Tout marquer comme lu</button>
      </div>
      <div className="tabs">
        <button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
          Toutes <span style={{ color: 'var(--ink-400)' }}>{NOTIFS.length}</span>
        </button>
        <button className={`tab ${tab === 'unread' ? 'active' : ''}`} onClick={() => setTab('unread')}>
          Non lues <span style={{ color: 'var(--ink-400)' }}>{NOTIFS.filter(n => n.unread).length}</span>
        </button>
      </div>
      <div className="app-card">
        {filtered.map((n, i) => (
          <div key={n.id} style={{
            display: 'grid', gridTemplateColumns: '40px 1fr auto',
            gap: 14, padding: '16px 22px',
            background: n.unread ? 'var(--ink-50)' : 'white',
            borderBottom: i < filtered.length - 1 ? '1px solid var(--ink-100)' : 'none',
            cursor: 'pointer', alignItems: 'flex-start',
            position: 'relative',
          }}>
            {n.unread && <span style={{
              position: 'absolute', left: 12, top: 22,
              width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)',
            }} />}
            <div className={`pill ${n.tone}`} style={{
              width: 40, height: 40, padding: 0, borderRadius: 10,
              display: 'grid', placeItems: 'center', marginLeft: 4,
            }}>
              {React.createElement(I[n.icon], { size: 18 })}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-900)' }}>{n.title}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-600)', marginTop: 4, lineHeight: 1.5 }}>{n.text}</div>
            </div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-500)', whiteSpace: 'nowrap', paddingTop: 4 }}>{n.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── PROFIL ─────────────────────────────────────────────────

const Profil = ({ user }) => (
  <div className="app-content with-bg">
    <div className="page-head">
      <div><h1>Profil</h1><p>Vos informations personnelles et professionnelles.</p></div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="dash-row">
      <div className="app-card">
        <div className="app-card-head"><h3>Identité</h3></div>
        <div className="app-card-pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div className="avatar avatar-lg" style={{ width: 64, height: 64, fontSize: 20 }}>{user.initials}</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 500 }}>{user.name}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>{user.email}</div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>Modifier</button>
          </div>
          <FieldRow label="Date de naissance" value="15 mars 1985" />
          <FieldRow label="NIR (Sécurité sociale)" value={<span className="mono">1 85 03 75 ••• ••• 15</span>} />
          <FieldRow label="Téléphone" value="+33 6 12 34 56 78" last />
        </div>
      </div>

      <div className="app-card">
        <div className="app-card-head"><h3>Entreprise</h3></div>
        <div className="app-card-pad">
          <FieldRow label="Dénomination" value={`${user.firstName} ${user.lastName}`} />
          <FieldRow label="SIREN" value={<span className="mono">932 184 502</span>} />
          <FieldRow label="Activité (NAF)" value="6202A · Conseil en informatique" />
          <FieldRow label="Nature" value="Libérale" />
          <FieldRow label="Adresse" value="12 rue de la Paix, 75001 Paris" />
          <FieldRow label="Régime fiscal" value="Micro-BNC · Versement libératoire" last />
        </div>
      </div>
    </div>

    <div className="app-card" style={{ marginTop: 20 }}>
      <div className="app-card-head"><h3>Plan</h3></div>
      <div style={{
        padding: 22, display: 'flex', alignItems: 'center', gap: 20,
        background: 'linear-gradient(135deg, var(--violet-50), transparent)',
      }}>
        <div className="icon-tile-lg"><I.Sparkle size={22} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 500 }}>Plan Tranquillité</div>
          <div style={{ fontSize: 13, color: 'var(--ink-600)', marginTop: 2 }}>
            9 €/mois · Renouvellement le 1ᵉʳ juin 2025
          </div>
        </div>
        <button className="btn btn-ghost">Gérer mon abonnement</button>
      </div>
    </div>
  </div>
);

const FieldRow = ({ label, value, last }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 0', borderBottom: last ? 'none' : '1px solid var(--ink-100)',
    fontSize: 14, gap: 12,
  }}>
    <span style={{ color: 'var(--ink-500)' }}>{label}</span>
    <span style={{ color: 'var(--ink-900)', fontWeight: 500, textAlign: 'right' }}>{value}</span>
  </div>
);

// ─── PARAMETRES ─────────────────────────────────────────────

const Parametres = () => {
  const [twoFa, setTwoFa] = React.useState(true);
  const [emailNotif, setEmailNotif] = React.useState(true);
  const [smsNotif, setSmsNotif] = React.useState(true);
  const [marketing, setMarketing] = React.useState(false);

  return (
    <div className="app-content with-bg">
      <div className="page-head">
        <div><h1>Paramètres</h1><p>Sécurité, notifications, préférences.</p></div>
      </div>
      <div style={{ display: 'grid', gap: 20, maxWidth: 800 }}>
        <div className="app-card">
          <div className="app-card-head"><h3>Sécurité</h3></div>
          <div style={{ padding: '8px 22px 16px' }}>
            <ToggleRow label="Authentification à deux facteurs" sub="Une vérification par SMS à chaque connexion." value={twoFa} onChange={setTwoFa} />
            <ButtonRow label="Mot de passe" sub="Dernière modification il y a 3 mois" action="Changer" last />
          </div>
        </div>
        <div className="app-card">
          <div className="app-card-head"><h3>Notifications</h3></div>
          <div style={{ padding: '8px 22px 16px' }}>
            <ToggleRow label="Email" sub="Statuts dossiers, déclarations, alertes." value={emailNotif} onChange={setEmailNotif} />
            <ToggleRow label="SMS" sub="Pour les changements critiques uniquement." value={smsNotif} onChange={setSmsNotif} />
            <ToggleRow label="Communications marketing" sub="Conseils, nouveautés produit, offres." value={marketing} onChange={setMarketing} last />
          </div>
        </div>
        <div className="app-card">
          <div className="app-card-head"><h3>Données</h3></div>
          <div style={{ padding: '8px 22px 16px' }}>
            <ButtonRow label="Exporter mes données" sub="Format ZIP : PDF, JSON, pièces jointes." action="Exporter" />
            <ButtonRow label="Supprimer mon compte" sub="Conservation RGPD : 30 jours puis effacement définitif." action="Supprimer" tone="red" last />
          </div>
        </div>
      </div>
    </div>
  );
};

const ToggleRow = ({ label, sub, value, onChange, last }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 0', borderBottom: last ? 'none' : '1px solid var(--ink-100)',
    gap: 16,
  }}>
    <div>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>{sub}</div>
    </div>
    <span onClick={() => onChange(!value)} style={{
      width: 40, height: 24, borderRadius: 999, padding: 2,
      background: value ? 'var(--accent)' : 'var(--ink-200)',
      display: 'flex', alignItems: 'center', cursor: 'pointer',
      flexShrink: 0,
    }}>
      <span style={{
        width: 20, height: 20, borderRadius: '50%', background: 'white',
        transform: `translateX(${value ? 16 : 0}px)`, transition: 'transform .15s',
        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
      }} />
    </span>
  </div>
);

const ButtonRow = ({ label, sub, action, tone, last }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 0', borderBottom: last ? 'none' : '1px solid var(--ink-100)',
    gap: 16,
  }}>
    <div>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>{sub}</div>
    </div>
    <button className="btn btn-ghost btn-sm" style={tone === 'red' ? { color: 'var(--status-red)', borderColor: '#FECACA' } : {}}>{action}</button>
  </div>
);

// ─── DÉCLARATIONS CA ────────────────────────────────────────

const Declarations = () => {
  const decl = [
    { period: 'Mai 2025', ca: '2 480 €', cot: '525 €', ir: '42 €', statut: 'En attente', tone: 'amber', date: 'À déposer avant le 30 juin' },
    { period: 'Avril 2025', ca: '3 120 €', cot: '661 €', ir: '53 €', statut: 'Déposée', tone: 'green', date: '02 mai 25' },
    { period: 'Mars 2025', ca: '2 980 €', cot: '631 €', ir: '50 €', statut: 'Déposée', tone: 'green', date: '03 avr 25' },
    { period: 'Février 2025', ca: '2 240 €', cot: '474 €', ir: '38 €', statut: 'Déposée', tone: 'green', date: '02 mars 25' },
    { period: 'Janvier 2025', ca: '1 850 €', cot: '392 €', ir: '31 €', statut: 'Déposée', tone: 'green', date: '01 fév 25' },
  ];
  return (
    <div className="app-content with-bg">
      <div className="page-head">
        <div><h1>Déclarations CA</h1><p>URSSAF · Micro-BNC · Versement libératoire activé</p></div>
        <button className="btn btn-accent">
          <I.Plus size={16} /> Nouvelle déclaration
        </button>
      </div>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatCard label="CA déclaré 2025" value="10 190 €" trend="5 mois · soit ~24 456 € annualisé" trendNeutral />
        <StatCard label="Cotisations versées" value="2 158 €" trend="21,2% du CA" trendNeutral />
        <StatCard label="Seuil micro BNC" value="13 %" trend="77 700 € autorisés" trendNeutral />
      </div>

      <div className="app-card">
        <div className="app-table-head" style={{ gridTemplateColumns: '1.3fr 1fr 1fr 1fr 130px 40px' }}>
          <span>Période</span><span>CA déclaré</span><span>Cotisations</span><span>IR (VFL)</span><span>Statut</span><span></span>
        </div>
        {decl.map((d, i) => (
          <div key={d.period} className="app-table-row" style={{ gridTemplateColumns: '1.3fr 1fr 1fr 1fr 130px 40px' }}>
            <span>
              <div style={{ fontWeight: 500 }}>{d.period}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 2 }}>{d.date}</div>
            </span>
            <span className="mono" style={{ fontWeight: 500 }}>{d.ca}</span>
            <span className="mono" style={{ color: 'var(--ink-600)' }}>{d.cot}</span>
            <span className="mono" style={{ color: 'var(--ink-600)' }}>{d.ir}</span>
            <StatusPill tone={d.tone} label={d.statut} />
            <span style={{ color: 'var(--ink-400)' }}><I.ArrowDR size={14} /></span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── DOCUMENTS ──────────────────────────────────────────────

const DOCS = [
  { name: 'Extrait Kbis - 2025.pdf', cat: 'Officiel', icon: 'Doc', date: '02 mai 25', size: '0.4 Mo' },
  { name: 'Avis SIRENE.pdf', cat: 'Officiel', icon: 'Doc', date: '02 mai 25', size: '0.3 Mo' },
  { name: 'Attestation URSSAF Q1 2025.pdf', cat: 'URSSAF', icon: 'Doc', date: '15 avr 25', size: '0.5 Mo' },
  { name: "Attestation de vigilance.pdf", cat: 'URSSAF', icon: 'Doc', date: '15 avr 25', size: '0.5 Mo' },
  { name: "Pièce d'identité.pdf", cat: 'Personnel', icon: 'Doc', date: '01 mai 25', size: '0.8 Mo' },
  { name: "Justificatif de domicile.pdf", cat: 'Personnel', icon: 'Doc', date: '01 mai 25', size: '1.2 Mo' },
  { name: "Déclaration CA - Avril 2025.pdf", cat: 'Déclarations', icon: 'Doc', date: '02 mai 25', size: '0.2 Mo' },
  { name: "Déclaration CA - Mars 2025.pdf", cat: 'Déclarations', icon: 'Doc', date: '03 avr 25', size: '0.2 Mo' },
];

const Documents = () => {
  const [cat, setCat] = React.useState('Tous');
  const cats = ['Tous', ...new Set(DOCS.map(d => d.cat))];
  const filtered = cat === 'Tous' ? DOCS : DOCS.filter(d => d.cat === cat);
  return (
    <div className="app-content with-bg">
      <div className="page-head">
        <div><h1>Mes documents</h1><p>Coffre-fort numérique · {DOCS.length} fichiers</p></div>
        <button className="btn btn-accent">
          <I.Plus size={16} /> Téléverser
        </button>
      </div>
      <div className="tabs">
        {cats.map(c => (
          <button key={c} className={`tab ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
        {filtered.map((d, i) => (
          <div key={i} className="app-card" style={{ padding: 16, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
              <div className="doc-ico" style={{ width: 40, height: 40 }}>
                {React.createElement(I[d.icon], { size: 20 })}
              </div>
              <span className="pill violet" style={{ fontSize: 10, marginLeft: 'auto' }}>{d.cat}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-900)', lineHeight: 1.35, marginBottom: 6 }}>{d.name}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>{d.size} · {d.date}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

window.Notifications = Notifications;
window.Profil = Profil;
window.Parametres = Parametres;
window.Declarations = Declarations;
window.Documents = Documents;
