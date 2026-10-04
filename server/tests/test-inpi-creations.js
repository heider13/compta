// Test des liasses de création de société (SAS, SARL, EURL, SCI) au Guichet unique.
// Données FICTIVES ; crée des BROUILLONS jamais signés, à supprimer ensuite.
// Lancé via /opt/compta-proxy/server/run-test-inpi.sh creations
const { buildCreationLiasse, createDraftWithPieces } = require('../lib/inpi-liasse');
const inpi = require('../inpi');

const ORG = '19c6719d-f210-4451-ba7a-058a061ddf55'; // cabinet Heider Imarazene (compte INPI du cabinet)

// PDF minimal d'une page (pièce factice « statuts »).
function pdfFactice(titre) {
  const texte = `(${titre} - DOCUMENT FICTIF DE TEST)`;
  const stream = `BT /F1 14 Tf 60 780 Td ${texte} Tj ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offs = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

// NIR fictif au format valide : sexe, 85, 04, Lyon (69 123), ordre 001, clé = 97 - (n mod 97)
const nirFictif = (sexe) => { const base = `${sexe === 'F' ? 2 : 1}850469123001`; return base + String(97 - Number(BigInt(base) % 97n)).padStart(2, '0'); };
const dirigeant = (nom, prenom, sexe = 'M') => ({
  nom, prenoms: [prenom], sexe, dateNaissance: '1985-04-12', lieuNaissance: 'Lyon', nationalite: 'FRA',
  numeroSecu: nirFictif(sexe), situationMatrimoniale: 'CELIBATAIRE', codePostalNaissance: '69001',
  adresse: { voie: '5 rue de la République', codePostal: '13002', commune: 'Marseille' },
});

const commun = {
  typeFormalite: 'CREATION',
  objet: 'Conseil en stratégie et organisation des entreprises.',
  activitePrincipale: 'Conseil pour les affaires et autres conseils de gestion',
  codeApe: '7022Z',
  dureeAnnees: 99,
  dateClotureExercice: '12-31',
  datePremiereCloture: '2027-12-31',
  siege: { voie: '23 rue Édouard Crémieux', codePostal: '13003', commune: 'Marseille' },
  annonceLegale: { journal: 'La Marseillaise', datePublication: '2026-10-01' },
  regimeTVA: 'FRANCHISE_BASE',
};

const CAS = [
  {
    skip: true,
    label: 'SAS (2 associés)',
    data: { ...commun, formeJuridique: 'SAS', denomination: 'TEST AGENT SAS', capitalEuros: 2000,
      dirigeant: { ...dirigeant('TESTEUR', 'Jean'), role: 'PRESIDENT' },
      associes: [{ ...dirigeant('TESTEUR', 'Jean'), apportEuros: 1000, pourcentage: 50 }, { ...dirigeant('DUPONT', 'Marie', 'F'), apportEuros: 1000, pourcentage: 50 }] },
  },
  {
    label: 'SARL (2 associés)',
    data: { ...commun, formeJuridique: 'SARL', denomination: 'TEST AGENT SARL', capitalEuros: 2000,
      dirigeant: { ...dirigeant('TESTEUR', 'Jean'), role: 'GERANT' },
      associes: [{ ...dirigeant('TESTEUR', 'Jean'), apportEuros: 1200, pourcentage: 60 }, { ...dirigeant('DUPONT', 'Marie', 'F'), apportEuros: 800, pourcentage: 40 }] },
  },
  {
    label: 'EURL',
    candidats: { typeDeStatuts: ['2', '1', 'N', 'O', 'AUTRE'] },
    data: { ...commun, formeJuridique: 'EURL', denomination: 'TEST AGENT EURL', capitalEuros: 1000,
      dirigeant: { ...dirigeant('TESTEUR', 'Jean'), role: 'GERANT' } },
  },
  {
    label: 'SCI familiale',
    data: { ...commun, formeJuridique: 'SCI', denomination: 'SCI TEST AGENT', capitalEuros: 1000,
      objet: "Acquisition, gestion et administration de biens immobiliers.", activitePrincipale: "Location de biens immobiliers",
      codeApe: '6820B', formeExercice: 'CIVILE', regimeImposition: 'IR',
      dirigeant: { ...dirigeant('TESTEUR', 'Jean'), role: 'GERANT' },
      associes: [{ ...dirigeant('TESTEUR', 'Jean'), apportEuros: 500, pourcentage: 50 }, { ...dirigeant('DUPONT', 'Marie', 'F'), apportEuros: 500, pourcentage: 50 }] },
  },
];

(async () => {
  const client = inpi.forOrg(ORG);
  const crees = [];
  for (const cas of CAS) {
    if (cas.skip) continue;
    const variantes = cas.candidats
      ? Object.entries(cas.candidats).flatMap(([k, vals]) => vals.map((v) => ({ [k]: v })))
      : [{}];
    for (const variante of variantes) {
    const data = { ...cas.data, ...variante };
    const dossier = { reference: `TEST-${cas.data.formeJuridique}`, client_name: cas.data.denomination };
    try {
      const { payload, bloquants, aCompleter } = await buildCreationLiasse(data, dossier, client);
      if (bloquants.length) { console.log(`✗ ${cas.label} : bloquants ${JSON.stringify(bloquants)}`); continue; }
      const { formality, deposees, erreurs } = await createDraftWithPieces(ORG, payload, [
        { categorie: 'STATUTS', nom: `Statuts-${cas.data.denomination}.pdf`, buffer: pdfFactice(`STATUTS ${cas.data.denomination}`), mime: 'application/pdf' },
      ]);
      crees.push(`${cas.label} : liasse ${formality.liasseNumber} (formalité ${formality.id})`);
      console.log(`✓ ${cas.label} ${JSON.stringify(variante)} : brouillon créé — liasse ${formality.liasseNumber}, statut ${formality.status}, ${deposees.length} pièce(s)${erreurs.length ? ', erreurs pièces : ' + erreurs.join(' ; ') : ''} | à compléter : ${aCompleter.join(' ; ')}`);
      break; // variante acceptée : on passe au cas suivant
    } catch (e) {
      console.log(`✗ ${cas.label} ${JSON.stringify(variante)} : ${String(e.message).slice(0, 1500)}`);
    }
    }
  }
  console.log(`\nBROUILLONS À SUPPRIMER SUR LE GUICHET UNIQUE :\n${crees.map((c) => '  - ' + c).join('\n') || '  (aucun)'}`);
})();
