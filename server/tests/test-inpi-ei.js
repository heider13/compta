// Test des liasses de création d'entreprise individuelle (micro-entreprise).
// Données FICTIVES ; crée des BROUILLONS jamais signés, à supprimer ensuite.
const { buildEILiasse, createDraftWithPieces } = require('../lib/inpi-liasse');
const inpi = require('../inpi');

const ORG = '19c6719d-f210-4451-ba7a-058a061ddf55';
const pdf = (t) => { const s = `BT /F1 14 Tf 60 780 Td (${t} - DOCUMENT FICTIF DE TEST) Tj ET`; const o = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>', `<< /Length ${s.length} >>\nstream\n${s}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']; let r = '%PDF-1.4\n'; const off = []; o.forEach((x, i) => { off.push(r.length); r += `${i + 1} 0 obj\n${x}\nendobj\n`; }); const xr = r.length; r += `xref\n0 6\n0000000000 65535 f \n${off.map((n) => String(n).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF\n`; return Buffer.from(r, 'latin1'); };
const nir = (sexe) => { const b = `${sexe === 'F' ? 2 : 1}850469123001`; return b + String(97 - Number(BigInt(b) % 97n)).padStart(2, '0'); };
const entrepreneur = (sexe) => ({
  nom: sexe === 'F' ? 'TESTEUSE' : 'TESTEUR', prenoms: [sexe === 'F' ? 'Marie' : 'Jean'], sexe, dateNaissance: '1985-04-12',
  lieuNaissance: 'Lyon', codePostalNaissance: '69001', nationalite: 'FRA', numeroSecu: nir(sexe), situationMatrimoniale: 'CELIBATAIRE',
  adresse: { voie: '5 rue de la République', codePostal: '13002', commune: 'Marseille' },
});

const CAS = [
  { label: 'Micro-entreprise commerciale (vente en ligne, domicile)',
    data: { formeJuridique: 'AE', codeApe: '4791B', formeExercice: 'COMMERCIALE', activitePrincipale: 'Vente en ligne de vêtements et accessoires',
      dirigeant: entrepreneur('M'), regimeMicro: { periodicite: 'TRIMESTRIELLE', versementLiberatoire: false } } },
  { label: 'Micro-entreprise libérale (conseil, domicile)',
    data: { formeJuridique: 'AE', codeApe: '7022Z', formeExercice: 'LIBERALE', activitePrincipale: 'Conseil en gestion aux entreprises',
      dirigeant: entrepreneur('F'), regimeMicro: { periodicite: 'MENSUELLE', versementLiberatoire: true } } },
];

(async () => {
  const client = inpi.forOrg(ORG);
  const crees = [];
  for (const cas of CAS.slice(1)) for (const diffusionDomicile of [undefined]) {
    try {
      const { payload, bloquants, aCompleter } = await buildEILiasse({ ...cas.data, diffusionDomicile }, { reference: 'TEST-EI', client_name: 'TEST EI' }, client);
      if (bloquants.length) { console.log(`✗ ${cas.label} : bloquants ${JSON.stringify(bloquants)}`); continue; }
      const { formality, deposees, erreurs } = await createDraftWithPieces(ORG, payload, [
        { categorie: 'IDENTITE_DIRIGEANT', nom: 'CNI-TEST.pdf', buffer: pdf('PIECE IDENTITE'), mime: 'application/pdf' },
        { categorie: 'JUSTIFICATIF_SIEGE', nom: 'Justificatif-domicile-TEST.pdf', buffer: pdf('JUSTIFICATIF DOMICILE'), mime: 'application/pdf' },
      ]);
      crees.push(`${cas.label} : liasse ${formality.liasseNumber} (formalité ${formality.id})`);
      console.log(`✓ ${cas.label} [diffusion=${diffusionDomicile}] : brouillon créé — liasse ${formality.liasseNumber}, ${deposees.length} pièce(s)${erreurs.length ? ', erreurs pièces : ' + erreurs.join(' ; ') : ''}${aCompleter.length ? ' | à compléter : ' + aCompleter.join(' ; ') : ''}`);
      break;
    } catch (e) {
      console.log(`✗ ${cas.label} [diffusion=${diffusionDomicile}] : ${String(e.message).slice(0, 600)}`);
    }
  }
  console.log(`\nBROUILLONS À SUPPRIMER SUR LE GUICHET UNIQUE :\n${crees.map((c) => '  - ' + c).join('\n') || '  (aucun)'}`);
})();
