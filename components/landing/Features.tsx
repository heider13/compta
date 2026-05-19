import { Workflow, Building, Users, Link as LinkIcon, Lock, Sparkle, Chart, Doc } from '@/components/icons';

const FEATURES = [
  {
    icon: Building,
    title: 'Connexion native INPI',
    desc: "Dépôt direct au Guichet Unique via l'API officielle. Statuts synchronisés en temps réel, régularisations traitées automatiquement.",
  },
  {
    icon: Users,
    title: 'Multi-cabinets, multi-collaborateurs',
    desc: "Isolation totale entre cabinets, rôles (owner, admin, collaborateur), permissions fines, audit log complet de chaque action.",
  },
  {
    icon: Workflow,
    title: 'Pipeline et workflows automatisés',
    desc: "Kanban des dossiers en cours, attribution des tâches, relances automatiques aux clients, deadlines internes.",
  },
  {
    icon: Doc,
    title: 'Génération de documents',
    desc: "Statuts, PV, actes, lettres-types pré-remplis depuis les données de la société. Variables dynamiques, modèles personnalisables.",
  },
  {
    icon: LinkIcon,
    title: 'Import Kbis/SIREN automatique',
    desc: "Saisie d'un SIREN → récupération instantanée des données entreprise via Pappers + RNE. Pas de double saisie.",
  },
  {
    icon: Lock,
    title: 'Signature électronique',
    desc: "Signature simple (création) et avancée RGS (modification/cessation) intégrée. Envoi aux signataires en un clic.",
  },
  {
    icon: Sparkle,
    title: 'CRM intégré',
    desc: "Carnet de clients du cabinet, historique des formalités par client, espace client pour suivi en autonomie.",
  },
  {
    icon: Chart,
    title: 'API & marque blanche',
    desc: "Sous-domaine personnalisé, logo et couleurs du cabinet. API publique + webhooks pour vos intégrations partenaires.",
  },
];

export function Features() {
  return (
    <section id="fonctionnalites" className="section" style={{ background: 'var(--ink-50)' }}>
      <div className="container">
        <div className="sec-head">
          <span className="eyebrow"><span className="dot" />Fonctionnalités</span>
          <h2>Le back-office complet<br />pour vos formalités juridiques.</h2>
          <p className="lead">
            Pensé pour la productivité des cabinets : tout ce dont vous avez besoin
            pour traiter des centaines de dossiers par mois, sans changer d&apos;outil.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="card" style={{ padding: 24, background: 'white' }}>
              <div className="icon-tile-lg" style={{ marginBottom: 16 }}>
                <f.icon size={22} />
              </div>
              <h3 style={{ fontSize: 17, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--ink-600)', margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
