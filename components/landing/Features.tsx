import { Workflow, Building, Users, Link as LinkIcon, Lock, Sparkle, Chart, Doc } from '@/components/icons';

const FEATURES = [
  {
    icon: Sparkle,
    title: "Préremplissage par lecture de la pièce d'identité",
    desc: "Déposez la CNI ou le passeport du dirigeant — photo ou PDF scanné. L'OCR extrait l'identité complète et remplit la liasse INPI à votre place. Vous gagnez 15 à 20 minutes par dossier.",
  },
  {
    icon: Building,
    title: '100 % intégré au Guichet Unique',
    desc: "Connectez le compte INPI de votre cabinet une fois : dépôt direct via l'API officielle, statuts synchronisés en temps réel, régularisations suivies automatiquement.",
  },
  {
    icon: Doc,
    title: 'Statuts générés automatiquement',
    desc: "SASU, SAS, EURL, SARL, SCI : les statuts se génèrent en .docx éditable depuis les données du dossier. Votre base de travail est prête, vous n'ajustez que les clauses spécifiques.",
  },
  {
    icon: Lock,
    title: 'Signature électronique avancée intégrée',
    desc: "Signature simple (création) et avancée eIDAS (modification, cessation) sans quitter l'outil. Le signataire reçoit un email, signe avec OTP SMS, le dossier avance tout seul.",
  },
  {
    icon: LinkIcon,
    title: 'Zéro ressaisie avec le SIREN',
    desc: "Saisissez un SIREN : raison sociale, siège, forme juridique et dirigeants remontent instantanément du registre national. Pas de double saisie, pas d'erreur de recopie.",
  },
  {
    icon: Workflow,
    title: 'Un tableau de bord unifié',
    desc: "Pilotez toutes vos formalités au même endroit : kanban des dossiers, tâches par collaborateur, relances clients, et les dossiers qui requièrent votre attention en premier.",
  },
  {
    icon: Users,
    title: 'Multi-cabinets, multi-collaborateurs',
    desc: "Isolation totale entre cabinets, rôles et permissions fines (owner, admin, collaborateur), audit log complet de chaque action.",
  },
  {
    icon: Chart,
    title: 'API & marque blanche',
    desc: "Sous-domaine personnalisé, logo et couleurs de votre cabinet. API publique + webhooks pour vos intégrations partenaires.",
  },
];

export function Features() {
  return (
    <section id="fonctionnalites" className="section" style={{ background: 'var(--ink-50)' }}>
      <div className="container">
        <div className="sec-head">
          <span className="eyebrow"><span className="dot" />Fonctionnalités</span>
          <h2>Une app qui relie vos outils métiers<br />au Guichet Unique.</h2>
          <p className="lead">
            Chaque fonctionnalité est pensée pour supprimer le travail manuel
            fastidieux : vous vérifiez, l&apos;outil remplit, génère et dépose.
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
