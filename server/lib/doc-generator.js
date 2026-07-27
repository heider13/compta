// Génération de documents juridiques (.docx éditable) — statuts de société.
//
// Trois familles de templates :
//   - SAS / SASU        → capital en actions, dirigé par un Président
//   - SARL / EURL       → capital en parts sociales, dirigée par un(des) gérant(s)
//   - SCI               → société civile, objet immobilier, gérance
//
// Le .docx est volontairement éditable : les cabinets retravaillent toujours
// les clauses. Ce générateur produit une base saine et complète, pas un acte
// définitif.
//
// Entrée : un objet `data` normalisé (voir normalizeData) construit par la
// route à partir du dossier + overrides du body.

const {
  Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel,
} = require('docx');

// ─── Helpers de mise en forme ────────────────────────────────────

function title(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [new TextRun({ text, bold: true, size: 32 })],
  });
}

function subtitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [new TextRun({ text, size: 24, color: '555555' })],
  });
}

function article(num, heading, ...paragraphs) {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 120 },
      children: [new TextRun({ text: `Article ${num} — ${heading}`, bold: true, size: 24 })],
    }),
    ...paragraphs.map(
      (p) =>
        new Paragraph({
          spacing: { after: 120 },
          alignment: AlignmentType.JUSTIFIED,
          children: [new TextRun({ text: p, size: 22 })],
        }),
    ),
  ];
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, size: 22, bold: !!opts.bold })],
  });
}

function formatEuros(cents) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
    .format((cents ?? 0) / 100)
    .replace(/ /g, ' ');
}

function formatDateFr(iso) {
  if (!iso) return '____________';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '____________';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function personLine(p) {
  const nomComplet = [p.prenoms?.join(' '), p.nom].filter(Boolean).join(' ') || '____________';
  const ne = p.dateNaissance
    ? `né(e) le ${formatDateFr(p.dateNaissance)}${p.lieuNaissance ? ` à ${p.lieuNaissance}` : ''}`
    : 'né(e) le ____________';
  const nat = p.nationalite ? `de nationalité ${p.nationalite === 'FRA' ? 'française' : p.nationalite}` : '';
  const dem = p.adresse ? `demeurant ${p.adresse}` : 'demeurant ____________';
  return [nomComplet, ne, nat, dem].filter(Boolean).join(', ');
}

// ─── Normalisation des données ───────────────────────────────────

const FORME_LABELS = {
  SASU: 'Société par actions simplifiée unipersonnelle',
  SAS: 'Société par actions simplifiée',
  EURL: 'Entreprise unipersonnelle à responsabilité limitée',
  SARL: 'Société à responsabilité limitée',
  SCI: 'Société civile immobilière',
};

function normalizeData(raw) {
  const forme = String(raw.formeJuridique || 'SASU').toUpperCase();
  return {
    forme,
    formeLabel: FORME_LABELS[forme] || forme,
    denomination: raw.denomination || '____________',
    siege: raw.siege || '____________',
    objet: raw.objet || '____________',
    dureeAnnees: raw.dureeAnnees || 99,
    capitalCents: raw.capitalCents ?? null,
    nbTitres: raw.nbTitres || null,
    // associes[] : [{nom, prenoms[], dateNaissance, lieuNaissance, nationalite, adresse, apportCents, nbTitres}]
    associes: Array.isArray(raw.associes) && raw.associes.length ? raw.associes : [{}],
    // dirigeant : {nom, prenoms[], ...} — Président (SAS/SASU) ou Gérant (SARL/EURL/SCI)
    dirigeant: raw.dirigeant || raw.associes?.[0] || {},
    villeSignature: raw.villeSignature || '____________',
    dateSignature: raw.dateSignature || null,
    exerciceCloture: raw.exerciceCloture || '31 décembre',
  };
}

// ─── Corps des statuts ───────────────────────────────────────────

function buildChildren(d) {
  const isActions = d.forme === 'SAS' || d.forme === 'SASU';
  const isUnipersonnelle = d.forme === 'SASU' || d.forme === 'EURL';
  const isSci = d.forme === 'SCI';
  const titreCapital = isActions ? 'actions' : 'parts sociales';
  const dirigeantTitre = isActions ? 'Président' : 'Gérant';
  const capital = d.capitalCents != null ? formatEuros(d.capitalCents) : '____________';
  const nbTitres = d.nbTitres || '____________';

  const children = [
    title(`STATUTS`),
    subtitle(`${d.denomination} — ${d.formeLabel}`),
    para(isUnipersonnelle ? "L'associé(e) unique soussigné(e) :" : 'Les soussignés :', { bold: true }),
  ];

  for (const a of d.associes) {
    children.push(para(`• ${personLine(a)}`));
  }
  children.push(
    para(
      isUnipersonnelle
        ? `a établi ainsi qu'il suit les statuts de la ${d.formeLabel.toLowerCase()} qu'il/elle a décidé de constituer.`
        : `ont établi ainsi qu'il suit les statuts de la ${d.formeLabel.toLowerCase()} qu'ils ont décidé de constituer entre eux.`,
    ),
  );

  let n = 0;
  children.push(
    ...article(++n, 'Forme',
      `Il est formé une ${d.formeLabel.toLowerCase()} régie par les dispositions légales et réglementaires en vigueur${isSci ? ', notamment les articles 1832 et suivants du Code civil,' : isActions ? ', notamment les articles L. 227-1 à L. 227-20 du Code de commerce,' : ', notamment les articles L. 223-1 et suivants du Code de commerce,'} ainsi que par les présents statuts.`,
    ),
    ...article(++n, 'Dénomination sociale',
      `La dénomination sociale de la société est : « ${d.denomination} ».`,
      `Dans tous les actes et documents émanant de la société, la dénomination doit être précédée ou suivie immédiatement des mots « ${d.formeLabel} » ou des initiales « ${d.forme} », de l'énonciation du montant du capital social, du numéro d'immatriculation au registre du commerce et des sociétés${isSci ? ' (RCS)' : ''}.`,
    ),
    ...article(++n, 'Objet social',
      `La société a pour objet, en France et à l'étranger : ${d.objet}`,
      `Et plus généralement, toutes opérations industrielles, commerciales, financières, civiles, mobilières ou immobilières pouvant se rattacher directement ou indirectement à l'objet social ou susceptibles d'en faciliter l'extension ou le développement.`,
    ),
    ...article(++n, 'Siège social',
      `Le siège social est fixé : ${d.siege}.`,
      `Il peut être transféré en tout autre lieu par décision ${isUnipersonnelle ? "de l'associé unique" : isActions ? 'collective des associés' : 'des associés représentant plus de la moitié des parts sociales'}.`,
    ),
    ...article(++n, 'Durée',
      `La durée de la société est fixée à ${d.dureeAnnees} années à compter de son immatriculation au registre du commerce et des sociétés, sauf dissolution anticipée ou prorogation.`,
    ),
    ...article(++n, 'Apports',
      ...d.associes.map((a) => {
        const apport = a.apportCents != null ? formatEuros(a.apportCents) : '____________';
        const nomComplet = [a.prenoms?.join(' '), a.nom].filter(Boolean).join(' ') || '____________';
        return `${nomComplet} apporte à la société la somme de ${apport} en numéraire.`;
      }),
      `Le montant total des apports en numéraire s'élève à ${capital}, déposé conformément à la loi.`,
    ),
    ...article(++n, 'Capital social',
      `Le capital social est fixé à la somme de ${capital}.`,
      `Il est divisé en ${nbTitres} ${titreCapital} égales, intégralement souscrites et ${isActions ? 'libérées dans les conditions légales' : 'réparties entre les associés en proportion de leurs apports'}.`,
    ),
  );

  if (isActions) {
    children.push(
      ...article(++n, 'Forme des actions',
        `Les actions sont obligatoirement nominatives. Elles donnent lieu à une inscription en compte individuel dans les conditions et selon les modalités prévues par la loi.`,
      ),
      ...article(++n, 'Cession des actions',
        isUnipersonnelle
          ? `Les cessions d'actions par l'associé unique sont libres.`
          : `Toute cession d'actions à un tiers est soumise à l'agrément préalable de la collectivité des associés statuant à la majorité des voix des associés disposant du droit de vote.`,
      ),
      ...article(++n, 'Président',
        `La société est représentée, dirigée et administrée par un Président, personne physique ou morale, associé ou non.`,
        `Est désigné(e) en qualité de premier Président, sans limitation de durée : ${personLine(d.dirigeant)}.`,
        `Le Président représente la société à l'égard des tiers et est investi des pouvoirs les plus étendus pour agir en toute circonstance au nom de la société, dans la limite de l'objet social.`,
      ),
      ...article(++n, 'Décisions collectives',
        isUnipersonnelle
          ? `L'associé unique exerce les pouvoirs dévolus par la loi et les présents statuts à la collectivité des associés. Ses décisions sont répertoriées dans un registre.`
          : `Les décisions collectives des associés sont prises, au choix du Président, en assemblée générale ou par consultation écrite. Les décisions ordinaires sont adoptées à la majorité simple des voix ; les décisions extraordinaires (modification des statuts, dissolution) à la majorité des deux tiers.`,
      ),
    );
  } else if (isSci) {
    children.push(
      ...article(++n, 'Parts sociales — cession',
        `Les parts sociales ne peuvent être cédées, à titre onéreux ou gratuit, qu'avec l'agrément de tous les associés, y compris entre associés, conjoints, ascendants et descendants.`,
      ),
      ...article(++n, 'Gérance',
        `La société est gérée par un ou plusieurs gérants, associés ou non, nommés par décision des associés représentant plus de la moitié des parts sociales.`,
        `Est désigné(e) en qualité de premier gérant, sans limitation de durée : ${personLine(d.dirigeant)}.`,
        `Dans les rapports avec les tiers, le gérant engage la société par les actes entrant dans l'objet social.`,
      ),
      ...article(++n, 'Décisions collectives',
        `Les décisions qui excèdent les pouvoirs du gérant sont prises par les associés réunis en assemblée générale. Les décisions ordinaires sont adoptées à la majorité des parts sociales ; les modifications statutaires requièrent l'unanimité, sauf clause contraire.`,
      ),
      ...article(++n, 'Responsabilité des associés',
        `À l'égard des tiers, les associés répondent indéfiniment des dettes sociales à proportion de leur part dans le capital social, conformément à l'article 1857 du Code civil.`,
      ),
    );
  } else {
    children.push(
      ...article(++n, 'Parts sociales — cession',
        isUnipersonnelle
          ? `Les cessions de parts par l'associé unique sont libres.`
          : `Les parts sociales sont librement cessibles entre associés. Toute cession à un tiers étranger à la société est soumise à l'agrément des associés représentant au moins la moitié des parts sociales, dans les conditions de l'article L. 223-14 du Code de commerce.`,
      ),
      ...article(++n, 'Gérance',
        `La société est gérée par une ou plusieurs personnes physiques, associées ou non.`,
        `Est désigné(e) en qualité de premier gérant, sans limitation de durée : ${personLine(d.dirigeant)}.`,
        `Le gérant est investi des pouvoirs les plus étendus pour agir en toute circonstance au nom de la société, dans la limite de l'objet social.`,
      ),
      ...article(++n, 'Décisions collectives',
        isUnipersonnelle
          ? `L'associé unique exerce les pouvoirs dévolus par la loi à l'assemblée des associés. Ses décisions sont répertoriées dans un registre.`
          : `Les décisions collectives sont prises en assemblée ou par consultation écrite. Les décisions ordinaires sont adoptées par un ou plusieurs associés représentant plus de la moitié des parts sociales ; les décisions extraordinaires selon les majorités légales.`,
      ),
    );
  }

  children.push(
    ...article(++n, 'Exercice social',
      `L'exercice social commence le 1er janvier et se termine le ${d.exerciceCloture} de chaque année.`,
      `Par exception, le premier exercice social comprendra le temps écoulé depuis l'immatriculation de la société au registre du commerce et des sociétés jusqu'au ${d.exerciceCloture} de l'année ${d.dateSignature ? new Date(d.dateSignature).getFullYear() + 1 : 'suivante'}.`,
    ),
    ...article(++n, 'Comptes annuels — affectation du résultat',
      `Il est tenu une comptabilité régulière des opérations sociales conformément à la loi. ${isActions ? 'Le Président' : 'Le gérant'} établit les comptes annuels de chaque exercice.`,
      `Le bénéfice distribuable est réparti entre les associés proportionnellement au nombre de ${titreCapital} détenues, après dotation des réserves légales le cas échéant.`,
    ),
    ...article(++n, 'Dissolution — liquidation',
      `La société est dissoute à l'arrivée du terme, par décision ${isUnipersonnelle ? "de l'associé unique" : 'collective des associés'}, ou pour toute autre cause prévue par la loi. La dissolution entraîne sa liquidation dans les conditions légales.`,
    ),
    ...article(++n, 'Contestations',
      `Toutes contestations relatives aux affaires sociales survenant pendant la durée de la société ou de sa liquidation, entre les associés ou entre un associé et la société, seront soumises aux tribunaux compétents.`,
    ),
    para(''),
    para(`Fait à ${d.villeSignature}, le ${formatDateFr(d.dateSignature)}, en autant d'exemplaires originaux que requis par la loi.`),
    para(''),
    ...d.associes.map((a) => {
      const nomComplet = [a.prenoms?.join(' '), a.nom].filter(Boolean).join(' ') || '____________';
      return para(`${nomComplet}\nSignature précédée de la mention « Lu et approuvé — Bon pour acceptation des statuts »`);
    }),
  );

  return children;
}

const SUPPORTED_FORMES = Object.keys(FORME_LABELS);

async function generateStatuts(rawData) {
  const d = normalizeData(rawData);
  if (!SUPPORTED_FORMES.includes(d.forme)) {
    const err = new Error(`Forme juridique non gérée pour la génération de statuts : ${d.forme}`);
    err.status = 422;
    err.code = 'unsupported_forme';
    throw err;
  }
  const doc = new Document({
    creator: 'Legaly AI',
    title: `Statuts — ${d.denomination}`,
    sections: [{ children: buildChildren(d) }],
  });
  const buffer = await Packer.toBuffer(doc);
  return { buffer, filename: `Statuts-${d.denomination.replace(/[^\w-]+/g, '_')}.docx`, forme: d.forme };
}

module.exports = { generateStatuts, SUPPORTED_FORMES };
