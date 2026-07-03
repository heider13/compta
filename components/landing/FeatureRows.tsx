// Blocs fonctionnalités alternés texte/visuel — layout inspiré des landing
// legaltech (image gauche/droite en alternance). Les visuels sont des
// mini-mockups UI en pur CSS (pas de screenshots à maintenir).

import { Arrow, Users, Chart, Sparkle } from '@/components/icons';

// ─── Mini-mockups CSS ────────────────────────────────────────────

function MockOcr() {
  return (
    <div className="mock-card">
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
        <div
          style={{
            width: 84, height: 56, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--violet-100, #E9E2FA), var(--violet-50))',
            border: '1px solid var(--ink-150)', display: 'grid', placeItems: 'center',
            fontSize: 10, fontWeight: 700, color: 'var(--accent-ink)', letterSpacing: '0.06em',
          }}
        >
          CNI / PDF
        </div>
        <Arrow size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="mock-line filled" style={{ width: '90%' }} />
          <div className="mock-line filled" style={{ width: '70%' }} />
          <div className="mock-line filled" style={{ width: '80%', marginBottom: 0 }} />
        </div>
      </div>
      <span className="mock-pill" style={{ background: 'rgba(19,115,51,0.1)', color: '#137333' }}>
        ✓ 12 champs préremplis en 8 s
      </span>
    </div>
  );
}

function MockGuichet() {
  return (
    <div className="mock-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}>Dossier SASU Lemaire</span>
        <span className="mock-pill" style={{ background: 'var(--violet-50)', color: 'var(--accent-ink)' }}>
          Synchronisé INPI
        </span>
      </div>
      {['Déposé au Guichet Unique', 'Paiement des frais validé', 'En examen au greffe'].map((step, i) => (
        <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: i < 2 ? '1px solid var(--ink-100)' : 'none' }}>
          <span
            style={{
              width: 16, height: 16, borderRadius: '50%', fontSize: 10, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: i < 2 ? 'var(--accent)' : 'var(--ink-150)',
              color: i < 2 ? 'white' : 'var(--ink-500)',
            }}
          >
            {i < 2 ? '✓' : '…'}
          </span>
          <span style={{ fontSize: 13, color: i < 2 ? 'var(--ink-900)' : 'var(--ink-500)' }}>{step}</span>
        </div>
      ))}
    </div>
  );
}

function MockStatuts() {
  return (
    <div className="mock-card" style={{ maxWidth: 300 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}>Statuts — SASU Lemaire</span>
        <span className="mock-pill" style={{ background: 'var(--violet-50)', color: 'var(--accent-ink)' }}>.DOCX</span>
      </div>
      <div className="mock-line" style={{ width: '55%', height: 11 }} />
      <div className="mock-line filled" style={{ width: '100%' }} />
      <div className="mock-line filled" style={{ width: '92%' }} />
      <div className="mock-line filled" style={{ width: '96%' }} />
      <div className="mock-line" style={{ width: '45%', height: 11, marginTop: 12 }} />
      <div className="mock-line filled" style={{ width: '100%' }} />
      <div className="mock-line filled" style={{ width: '85%', marginBottom: 0 }} />
    </div>
  );
}

function MockSignature() {
  return (
    <div className="mock-card" style={{ maxWidth: 320 }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Signature du PV de décision</div>
      <svg width="140" height="44" viewBox="0 0 140 44" aria-hidden="true" style={{ display: 'block', marginBottom: 10 }}>
        <path
          d="M6 32 C 22 8, 34 40, 48 24 S 74 6, 88 26 S 116 38, 134 14"
          fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round"
        />
      </svg>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span className="mock-pill" style={{ background: 'var(--violet-50)', color: 'var(--accent-ink)' }}>OTP SMS vérifié</span>
        <span className="mock-pill" style={{ background: 'rgba(19,115,51,0.1)', color: '#137333' }}>✓ eIDAS avancée</span>
      </div>
    </div>
  );
}

function MockDashboard() {
  const cols: Array<[string, number]> = [['À traiter', 3], ['Au greffe', 2], ['Validés', 4]];
  return (
    <div className="mock-card" style={{ maxWidth: 380 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {cols.map(([title, count]) => (
          <div key={title}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-500)', marginBottom: 6 }}>
              {title} · {count}
            </div>
            {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
              <div key={i} style={{ background: 'var(--ink-50)', border: '1px solid var(--ink-100)', borderRadius: 6, padding: '6px 7px', marginBottom: 6 }}>
                <div className="mock-line filled" style={{ width: '85%', height: 6, marginBottom: 4 }} />
                <div className="mock-line" style={{ width: '55%', height: 6, marginBottom: 0 }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Contenu des blocs ───────────────────────────────────────────

const ROWS = [
  {
    eyebrow: 'OCR pièce d’identité',
    title: 'Déposez la pièce d’identité, la liasse se remplit toute seule.',
    desc: "Photo de CNI, passeport ou PDF scanné : l'OCR lit la zone MRZ et extrait l'identité complète du dirigeant — nom, prénoms, naissance, nationalité. Le questionnaire devient interactif et 90 % des champs INPI sont déjà remplis. Vous gagnez 15 à 20 minutes par dossier.",
    visual: <MockOcr />,
  },
  {
    eyebrow: 'Guichet Unique',
    title: '100 % intégré à votre Guichet Unique.',
    desc: "Connectez le compte INPI de votre cabinet une seule fois. Vos dossiers sont déposés via l'API officielle et leurs statuts se synchronisent en temps réel : réception, paiement, examen au greffe, validation. Fini les allers-retours sur le portail INPI.",
    visual: <MockGuichet />,
  },
  {
    eyebrow: 'Documents juridiques',
    title: 'Les statuts se génèrent pendant que vous vérifiez.',
    desc: 'SASU, SAS, EURL, SARL, SCI : les statuts sortent en .docx éditable, générés depuis les données du dossier — dénomination, capital, apports, dirigeants. Votre base de travail est prête ; vous n’ajustez que les clauses spécifiques.',
    visual: <MockStatuts />,
  },
  {
    eyebrow: 'Signature électronique',
    title: 'La signature avancée part en un clic.',
    desc: "Signature simple pour les créations, avancée eIDAS pour les modifications et cessations — celle que l'INPI exige. Le signataire reçoit un email, valide par OTP SMS, et le dossier avance tout seul. Aucun certificat matériel à gérer.",
    visual: <MockSignature />,
  },
  {
    eyebrow: 'Pilotage',
    title: 'Un tableau de bord qui montre où agir.',
    desc: 'Kanban des dossiers en cours, tâches par collaborateur, relances clients et alertes sur les dossiers qui requièrent votre attention. Toute l’activité du cabinet au même endroit, sans changer d’outil.',
    visual: <MockDashboard />,
  },
];

const EXTRAS = [
  {
    icon: Users,
    title: 'Multi-cabinets, multi-collaborateurs',
    desc: 'Isolation totale entre cabinets, rôles et permissions fines, audit log complet.',
  },
  {
    icon: Sparkle,
    title: 'CRM intégré',
    desc: 'Carnet de clients, historique des formalités, espace client en autonomie.',
  },
  {
    icon: Chart,
    title: 'API & marque blanche',
    desc: 'Sous-domaine, logo et couleurs du cabinet. API publique + webhooks.',
  },
];

export function FeatureRows() {
  return (
    <section id="fonctionnalites" className="section" style={{ background: 'white' }}>
      <div className="container">
        <div className="sec-head">
          <span className="eyebrow"><span className="dot" />Fonctionnalités</span>
          <h2>Une app qui relie vos outils métiers<br />au Guichet Unique.</h2>
          <p className="lead">
            Chaque fonctionnalité supprime une tâche manuelle fastidieuse :
            l&apos;outil remplit, génère et dépose — vous vérifiez.
          </p>
        </div>

        {ROWS.map((row, i) => (
          <div key={row.title} className={`feature-row${i % 2 === 1 ? ' reverse' : ''}`}>
            <div className="feature-copy">
              <span className="eyebrow"><span className="dot" />{row.eyebrow}</span>
              <h3 style={{ marginTop: 14 }}>{row.title}</h3>
              <p>{row.desc}</p>
              <a href="/auth/signup" className="btn btn-link" style={{ paddingLeft: 0 }}>
                Demander une démo <Arrow size={15} />
              </a>
            </div>
            <div className="feature-visual">{row.visual}</div>
          </div>
        ))}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginTop: 40 }}>
          {EXTRAS.map((f) => (
            <div key={f.title} className="card" style={{ padding: 22, background: 'var(--ink-50)' }}>
              <div className="icon-tile-lg" style={{ marginBottom: 12 }}>
                <f.icon size={20} />
              </div>
              <h3 style={{ fontSize: 16, marginBottom: 6 }}>{f.title}</h3>
              <p style={{ fontSize: 13.5, color: 'var(--ink-600)', margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
