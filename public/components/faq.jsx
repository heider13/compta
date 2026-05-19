/* eslint-disable */
// FAQ accordion

const FAQ_ITEMS = [
  {
    q: "Qui peut devenir auto-entrepreneur ?",
    a: "Toute personne physique majeure résidant en France peut créer une auto-entreprise : salariés, étudiants, demandeurs d'emploi, retraités, fonctionnaires (sous conditions d'autorisation hiérarchique). Vous devez disposer d'un titre de séjour autorisant une activité indépendante si vous n'êtes pas ressortissant de l'UE. Quelques activités sont exclues : agricoles principales, certaines professions réglementées (avocat, expert-comptable, etc.).",
  },
  {
    q: "Puis-je cumuler auto-entreprise et emploi salarié ?",
    a: "Oui, dans la majorité des cas. Vous devez vérifier votre contrat de travail (clauses d'exclusivité, non-concurrence) et informer votre employeur si vous travaillez dans la même branche. Les fonctionnaires doivent demander une autorisation à leur hiérarchie. Côté social, vous cotisez deux fois : sur votre salaire et sur votre CA d'auto-entrepreneur, mais vous gardez tous vos droits salariés (chômage, retraite).",
  },
  {
    q: "Et si je suis retraité, étudiant ou demandeur d'emploi ?",
    a: "Tous compatibles. Les retraités cumulent leur pension (sous conditions de plafond pour les régimes salariés). Les étudiants peuvent même conserver leur statut étudiant entrepreneur (PEPITE). Les demandeurs d'emploi peuvent garder leur ARE partielle ou opter pour l'ARCE (capital de 60% de leurs droits versé en 2 fois).",
  },
  {
    q: "Combien de temps prend la création de mon auto-entreprise ?",
    a: "Vous remplissez le formulaire en 4 minutes. Nous déposons votre dossier au Guichet Unique INPI sous 24h ouvrées. L'INPI valide ensuite votre dossier en 3 à 7 jours en moyenne. Vous recevez votre SIRET et votre extrait Kbis par email dès la validation.",
  },
  {
    q: "Quels sont les plafonds de chiffre d'affaires à respecter ?",
    a: "Pour rester en régime micro : 188 700 € par an pour les activités de vente et fourniture de logement, 77 700 € par an pour les prestations de service et professions libérales. Activité mixte : plafond global de 188 700 € dont 77 700 € maxi en services. Première année : ces plafonds sont proratisés selon votre date de création.",
  },
  {
    q: "Combien je vais payer de cotisations sociales ?",
    a: "Vous payez un pourcentage de votre chiffre d'affaires encaissé (pas de CA = 0 € à payer) : 12,3% en vente, 21,2% en services BIC, 21,1% en libéral CIPAV, 23,1% en libéral hors CIPAV. Avec l'ACRE en première année, ces taux sont divisés par 2 environ. Les déclarations sont mensuelles ou trimestrielles, à votre choix.",
  },
  {
    q: "Qu'est-ce que l'ACRE et comment l'obtenir ?",
    a: "L'ACRE est une exonération partielle de cotisations sociales la première année (50% environ). Elle est automatique pour les créateurs sous conditions : demandeurs d'emploi, jeunes 18-25 ans, bénéficiaires de minimas sociaux, repreneurs en zone urbaine défavorisée, et quelques autres cas. La demande se fait via un formulaire séparé que nous gérons pour vous lors de la création.",
  },
  {
    q: "Et le versement libératoire de l'impôt sur le revenu ?",
    a: "Option qui permet de payer votre impôt sur le revenu en même temps que vos cotisations URSSAF, à un taux fixe : 1% en vente, 1,7% en services BIC, 2,2% en libéral. Avantage : simplicité, pas de mauvaise surprise. Inconvénient : vous payez même si votre revenu fiscal de référence est faible. À évaluer selon votre situation personnelle — on peut vous aider à choisir.",
  },
  {
    q: "Quand reçois-je mon SIRET exactement ?",
    a: "Dès que l'INSEE traite la transmission INPI, soit en moyenne 3 à 7 jours ouvrés après le dépôt. Vous recevez un email avec votre numéro de SIRET, votre code APE et l'avis de situation INSEE en PDF. Vous pouvez commencer à facturer dès ce moment-là — même si votre Kbis arrive parfois quelques jours plus tard.",
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
    q: "Faut-il un compte bancaire pro dédié ?",
    a: "Pas obligatoire sous 10 000 € de CA pendant 2 années consécutives. Au-delà, un compte distinct (pas forcément un compte « pro » coûteux : un second compte courant suffit) est requis pour séparer activité et perso. On vous prévient quand vous approchez du seuil.",
  },
  {
    q: "Faut-il un local professionnel ?",
    a: "Non, la majorité des auto-entrepreneurs domicilient leur activité chez eux. Si vous êtes locataire, vérifiez votre bail (certains interdisent l'usage commercial). En copropriété, le règlement peut aussi imposer des restrictions. Les activités avec accueil du public ou stockage nécessitent en général un local dédié.",
  },
  {
    q: "Et la TVA ?",
    a: "Par défaut, vous êtes en franchise de TVA : vous ne la facturez pas et ne la récupérez pas. Cela change si vous dépassez 91 900 € en vente ou 36 800 € en services (seuils 2024) sur une année civile. Compta vous alerte dès que vous approchez de ces seuils et vous propose l'option pour passer au régime de TVA dès la création si vous y avez intérêt.",
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
    q: "Puis-je modifier mon activité plus tard ?",
    a: "Oui, à tout moment. Changement de code NAF, ajout d'une activité secondaire, modification de l'adresse de domiciliation, changement de nom commercial : 39 € le dépôt. Attention, certaines modifications nécessitent une signature électronique avancée (certificat RGS), nous vous accompagnons sur cette étape.",
  },
  {
    q: "Comment je radie mon auto-entreprise si j'arrête ?",
    a: "Depuis votre tableau de bord, en 2 minutes. Vous indiquez la date d'effet et le motif (cessation volontaire, retraite, salariat, etc.), nous déposons la formalité. La radiation est effective au jour J. Vous restez tenu de déclarer le CA réalisé jusqu'à cette date à l'URSSAF.",
  },
  {
    q: "Puis-je récupérer mon dossier si je quitte Compta ?",
    a: "À tout moment. Vos données restent les vôtres : export PDF de toutes vos déclarations, formalités et pièces en un clic. Vous pouvez aussi nous demander la suppression complète de votre compte selon le RGPD.",
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
