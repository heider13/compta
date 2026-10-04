// Construit le inpi_content (structure personneMorale des wizards société) à
// partir des données normalisées collectées par l'agent formalités.
//
// Même forme que initSasuContent / initSarlContent… côté wizards legacy, pour
// que le dossier créé par l'agent s'ouvre et se complète dans le wizard, et que
// l'orchestrateur et le générateur de statuts le lisent sans adaptation.

const ROLE_BY_FORME = {
  SAS: 'PRESIDENT',
  SASU: 'PRESIDENT',
  HOLDING: 'PRESIDENT',
  SARL: 'GERANT',
  EURL: 'GERANT',
  SCI: 'GERANT',
};

function adresse(a = {}) {
  return {
    voie: a.voie || '',
    complement: a.complement || '',
    codePostal: a.codePostal || '',
    commune: a.commune || '',
    codePays: a.codePays || 'FRA',
  };
}

function lieuNaissance(p = {}) {
  return {
    commune: p.lieuNaissance || '',
    codePostal: p.codePostalNaissance || '',
    codePays: p.paysNaissance || 'FRA',
    paysNaissance: p.paysNaissanceLabel || 'France',
  };
}

function descriptionPersonne(p = {}) {
  return {
    nomNaissance: (p.nom || '').toUpperCase(),
    nomUsage: p.nomUsage || '',
    prenoms: Array.isArray(p.prenoms) && p.prenoms.length ? p.prenoms : [''],
    dateDeNaissance: p.dateNaissance || '',
    lieuDeNaissance: lieuNaissance(p),
    codeNationalite: p.nationalite || 'FRA',
    sexe: p.sexe || '',
    situationMatrimoniale: p.situationMatrimoniale || '',
  };
}

// data : objet fusionné de l'agent (voir AGENT_DATA_SCHEMA dans formality-agent.js)
function buildPersonneMorale(data) {
  const forme = String(data.formeJuridique || '').toUpperCase();
  const capital = Number(data.capitalEuros) || 0;
  const dir = data.dirigeant || {};
  const associesIn = Array.isArray(data.associes) && data.associes.length
    ? data.associes
    // Unipersonnelle sans associé détaillé : le dirigeant est l'associé unique.
    : (['SASU', 'EURL'].includes(forme) && dir.nom ? [{ ...dir, apportEuros: capital, pourcentage: 100 }] : []);

  const totalTitres = Number(data.nbTitres) || 100;

  const associes = associesIn.map((a) => {
    const pct = Number(a.pourcentage) || (associesIn.length === 1 ? 100 : 0);
    const nbTitres = Number(a.nbTitres) || Math.round((totalTitres * pct) / 100) || null;
    return {
      type: a.typePersonne === 'MORALE' ? 'MORALE' : 'PHYSIQUE',
      individu: {
        nomNaissance: (a.nom || '').toUpperCase(),
        prenoms: Array.isArray(a.prenoms) && a.prenoms.length ? a.prenoms : [''],
        dateDeNaissance: a.dateNaissance || '',
        lieuDeNaissance: lieuNaissance(a),
        adresseDomicile: adresse(a.adresse),
        ...(a.typePersonne === 'MORALE' ? { denomination: a.denomination || '', siren: a.siren || '' } : {}),
      },
      apports: { numeraire: Number(a.apportEuros) || 0, nature: Number(a.apportNatureEuros) || 0 },
      partsSociales: nbTitres,
      pourcentageDetention: pct || null,
    };
  });

  return {
    personneMorale: {
      identite: {
        entreprise: {
          denomination: (data.denomination || '').toUpperCase(),
          formeJuridique: forme,
          capital,
          deviseCapital: 'EUR',
          objet: data.objet || '',
          dureeSociete: Number(data.dureeAnnees) || 99,
          dateClotureExercice: data.dateClotureExercice || '12-31',
          datePremiereCloture: data.datePremiereCloture || '',
        },
        description: {
          sigle: data.sigle || '',
          nomCommercial: data.nomCommercial || '',
          capitalVariable: Boolean(data.capitalVariable),
          capitalMinimum: 0,
          capitalMaximum: 0,
        },
      },
      composition: {
        pouvoirs: dir.nom || dir.prenoms?.length
          ? [{
              individu: {
                descriptionPersonne: descriptionPersonne(dir),
                adresseDomicile: adresse(dir.adresse),
                role: dir.role || ROLE_BY_FORME[forme] || 'PRESIDENT',
                pieceJointes: [],
              },
            }]
          : [],
        associes,
      },
      etablissementPrincipal: {
        descriptionEtablissement: { rolePourEntreprise: 2, indicateurEtablissementPrincipal: true, indicateurPrincipal: true },
        adresse: adresse(data.siege),
        activites: [{
          codeApe: data.codeApe || '',
          descriptionDetaillee: data.activitePrincipale || data.objet || '',
          dateDebutActivite: data.dateDebutActivite || '',
          indicateurAmbulant: false,
          indicateurPrincipal: true,
        }],
        caracteristiques: {
          indicateurExerciceADomicile: Boolean(data.domiciliationChezDirigeant),
          indicateurEntrepriseDomiciliataire: Boolean(data.societeDomiciliation),
        },
      },
      optionsFiscales: {
        regimeImposition: data.regimeImposition || (forme === 'SCI' ? 'IR' : 'IS'),
        optionTVA: { regimeTVA: data.regimeTVA || 'FRANCHISE_BASE' },
      },
    },
  };
}

module.exports = { buildPersonneMorale, ROLE_BY_FORME };
