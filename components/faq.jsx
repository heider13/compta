/* eslint-disable */
// FAQ accordion

const FAQ_ITEMS = [
  {
    q: "Combien de temps prend la création de mon auto-entreprise ?",
    a: "Vous remplissez le formulaire en 4 minutes. Nous déposons votre dossier au Guichet Unique INPI sous 24h ouvrées. L'INPI valide ensuite votre dossier en 3 à 7 jours en moyenne. Vous recevez votre SIRET et votre extrait Kbis par email dès la validation.",
  },
  {
    q: "Compta remplace-t-il vraiment le Guichet Unique INPI ?",
    a: "Non, Compta est un mandataire INPI agréé qui s'interface directement avec leur API officielle. Toutes vos formalités passent bien par le Guichet Unique — c'est la voie légale unique depuis le 1er janvier 2023. Nous simplifions juste l'expérience : pas de comptes multiples, pas de jargon, pas d'erreurs de saisie.",
  },
  {
    q: "Quelles formalités puis-je faire avec Compta ?",
    a: "Création d'auto-entreprise, modification (adresse, activité, dénomination), radiation, et déclarations de chiffre d'affaires URSSAF. Pour les modifications nécessitant une signature avancée (certificat RGS), nous vous accompagnons sur l'intégration d'un service de signature électronique qualifié.",
  },
  {
    q: "Combien coûte le service ?",
    a: "L'inscription est gratuite. Vous payez uniquement au dépôt d'une formalité : 49€ pour une création d'AE, 39€ pour une modification, 29€ pour une radiation. Sans abonnement, sans frais cachés. Les frais légaux d'immatriculation (le cas échéant) sont inclus.",
  },
  {
    q: "Mes données sont-elles sécurisées ?",
    a: "Oui. Compta est hébergé en France (OVH Cloud souverain), chiffré de bout en bout, et conforme RGPD + ISO 27001. Vos pièces jointes (CNI, justificatif de domicile) sont chiffrées au repos et supprimées 90 jours après la validation de votre dossier.",
  },
  {
    q: "Que se passe-t-il si l'INPI demande une régularisation ?",
    a: "Vous êtes notifié immédiatement par email et SMS, avec la liste exacte des pièces à corriger. Dans 70% des cas, nous pouvons re-soumettre automatiquement la pièce conforme. Sinon, vous la chargez dans votre espace en 30 secondes et nous re-déposons à votre place.",
  },
  {
    q: "Compta gère-t-il la TVA et les déclarations URSSAF ?",
    a: "Nous gérons les déclarations URSSAF (mensuelles ou trimestrielles) en lien avec votre compte autoentrepreneur.urssaf.fr. Pour la TVA, nous vous alertons dès que vous approchez du seuil de franchise et nous nous occupons de la demande d'option pour le régime de TVA.",
  },
  {
    q: "Puis-je récupérer mon dossier si je quitte Compta ?",
    a: "À tout moment. Vos données restent les vôtres : export PDF de toutes vos déclarations, formalités et pièces en un clic. Vous pouvez aussi nous demander la suppression complète de votre compte selon le RGPD.",
  },
];

const FAQItem = ({ q, a, isOpen, onClick }) => (
  <div style={{
    borderBottom: '1px solid var(--ink-150)',
    transition: 'background .15s',
  }}>
    <button
      onClick={onClick}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 16, width: '100%', padding: '20px 4px',
        border: 'none', background: 'transparent', cursor: 'pointer',
        textAlign: 'left', color: 'var(--ink-900)',
      }}
    >
      <span style={{ fontSize: 17, fontWeight: 500, letterSpacing: '-0.01em' }}>{q}</span>
      <span style={{
        width: 32, height: 32, borderRadius: '50%',
        background: isOpen ? 'var(--accent)' : 'var(--ink-100)',
        color: isOpen ? 'white' : 'var(--ink-600)',
        display: 'grid', placeItems: 'center',
        flexShrink: 0,
        transition: 'all .2s ease',
        transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
      }}>
        <I.Plus size={16} />
      </span>
    </button>
    <div style={{
      maxHeight: isOpen ? 400 : 0,
      overflow: 'hidden',
      transition: 'max-height .3s ease, padding .3s ease',
      padding: isOpen ? '0 4px 24px' : '0 4px',
    }}>
      <p style={{ fontSize: 15, lineHeight: 1.6, maxWidth: 720, color: 'var(--ink-600)' }}>{a}</p>
    </div>
  </div>
);

const FAQ = () => {
  const [openIdx, setOpenIdx] = React.useState(0);
  return (
    <div>
      {FAQ_ITEMS.map((it, i) => (
        <FAQItem key={i} q={it.q} a={it.a}
          isOpen={openIdx === i}
          onClick={() => setOpenIdx(openIdx === i ? -1 : i)} />
      ))}
    </div>
  );
};

window.FAQ = FAQ;
