'use client';

// « Toutes vos formalités, au même endroit » — constellation sombre.
//
// Reprend la mise en scène de wellapp.ai : fond noir, un foyer blanc d'où part
// un faisceau dense de fils très fins, une poussière de cercles pleins de
// tailles franchement inégales, et UNE carte sombre qui présente un élément à
// la fois.
//
// Remplace la rangée de cartes défilante. Dix cartes qui glissent se lisent
// comme un bandeau décoratif : pour trouver « Mise en sommeil », il fallait
// attendre qu'elle passe. Le contenu, lui, ne change pas d'un mot.

import { useEffect, useMemo, useState } from 'react';

import { Container } from '../ui';

export type Formalite = { key: string; titre: string; texte: string; etat: string };

const FORMALITES: Formalite[] = [
  { key: 'creation', titre: 'Création de société', etat: 'Guichet unique', texte: 'SASU, SAS, SARL, EURL, SCI, micro-entreprise : statuts rédigés, dossier prêt à déposer.' },
  { key: 'modification', titre: 'Modifications', etat: 'Guichet unique', texte: 'Siège, dirigeants, objet, dénomination, capital : les pièces suivent la décision.' },
  { key: 'dissolution', titre: 'Dissolution et liquidation', etat: 'Guichet unique', texte: 'PV, liquidateur, comptes de clôture et radiation, dans l’ordre.' },
  { key: 'sommeil', titre: 'Mise en sommeil', etat: 'Guichet unique', texte: 'Cessation temporaire d’activité, sans annonce légale, jusqu’à deux ans.' },
  { key: 'annonces', titre: 'Annonces légales', etat: 'Journal habilité', texte: 'Rédigées par l’IA, mentions obligatoires contrôlées une à une.' },
  { key: 'rne', titre: 'Documents RNE', etat: 'Registre national', texte: 'Statuts, PV, comptes annuels et avis Insee récupérés en un clic.' },
  { key: 'regularisation', titre: 'Régularisations', etat: 'Greffe', texte: 'Les demandes du greffe sont lues et les réponses préparées.' },
  { key: 'lots', titre: 'Formalités en lot', etat: 'Multi-sociétés', texte: 'Plusieurs sociétés traitées en une seule demande.' },
  { key: 'paiement', titre: 'Suivi des paiements', etat: 'Paiement', texte: 'Montants, délégation au client et alertes, sans relance manuelle.' },
  { key: 'signature', titre: 'Signature électronique', etat: 'eIDAS', texte: 'Documents signés en ligne, signature qualifiée eIDAS si besoin.' },
];

const CYCLE_MS = 3600;

// Le foyer d'où part le faisceau, en % de la zone.
const FOYER = { x: 53, y: 56 };

/**
 * Suite déterministe : même rendu sur le serveur et dans le navigateur.
 * Un `Math.random()` provoquerait une divergence d'hydratation à chaque
 * chargement — React la signale et le rendu saute.
 */
function semis(graine: number) {
  let etat = graine;
  return () => {
    etat = (etat * 1664525 + 1013904223) % 4294967296;
    return etat / 4294967296;
  };
}

type Astre = { x: number; y: number; r: number; o: number };

/**
 * La poussière : des cercles PLEINS, de tailles franchement inégales. C'est
 * cette irrégularité qui donne l'impression d'un nuage ; à taille constante on
 * verrait un motif, et un motif ne respire pas.
 */
function poussiere(nb: number): Astre[] {
  const suivant = semis(20261105);
  const astres: Astre[] = [];
  for (let i = 0; i < nb; i += 1) {
    const angle = suivant() * Math.PI * 2;
    const dist = 0.2 + suivant() * 0.8;
    astres.push({
      x: FOYER.x + Math.cos(angle) * dist * 44,
      y: FOYER.y + Math.sin(angle) * dist * 42,
      r: 2 + suivant() * 9,
      o: 0.14 + suivant() * 0.32,
    });
  }
  return astres;
}

/** Les dix formalités, réparties autour du foyer à distance inégale. */
function placer(i: number, total: number) {
  const suivant = semis(777 + i * 31);
  const angle = -Math.PI / 2 + (i / total) * Math.PI * 2 + (suivant() - 0.5) * 0.32;
  const dist = 0.58 + suivant() * 0.4;
  return {
    x: FOYER.x + Math.cos(angle) * dist * 42,
    y: FOYER.y + Math.sin(angle) * dist * 40,
  };
}

export function FormalitesConstellation({
  titre = 'Toutes vos formalités, au même endroit.',
  sousTitre = 'De la création à la radiation : l’agent prépare, vous validez et déposez.',
  formalites = FORMALITES,
}: { titre?: string; sousTitre?: string; formalites?: Formalite[] } = {}) {
  const [actif, setActif] = useState(0);
  // Survoler un nœud le désigne ET suspend la rotation : continuer à tourner
  // sous le doigt du visiteur lui reprendrait la main.
  const [fige, setFige] = useState(false);

  const astres = useMemo(() => poussiere(30), []);
  const noeuds = useMemo(
    () => formalites.map((f, i) => ({ ...f, ...placer(i, formalites.length) })),
    [formalites],
  );

  useEffect(() => {
    if (fige) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setActif((i) => (i + 1) % formalites.length), CYCLE_MS);
    return () => clearInterval(id);
  }, [fige, formalites.length]);

  const courante = noeuds[actif];

  return (
    <section id="fonctionnalites" className="fc-section">
      <Container className="relative">
        <h2 className="fc-titre">{titre}</h2>
        <p className="fc-soustitre">{sousTitre}</p>

        <div className="fc-zone" onMouseLeave={() => setFige(false)}>
          {/*
            Coordonnées en POURCENTAGES, que SVG accepte nativement. Une
            première version mesurait la zone au montage pour dessiner en
            pixels : la mesure restait à zéro, aucun fil n'apparaissait, et il
            ne restait qu'un semis de points sans lien entre eux.
          */}
          <svg width="100%" height="100%" className="fc-fils" aria-hidden="true">
            {astres.map((a, i) => (
              <line
                key={`a${i}`}
                x1={`${FOYER.x}%`}
                y1={`${FOYER.y}%`}
                x2={`${a.x}%`}
                y2={`${a.y}%`}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
              />
            ))}
            {noeuds.map((n, i) => (
              <line
                key={n.key}
                x1={`${FOYER.x}%`}
                y1={`${FOYER.y}%`}
                x2={`${n.x}%`}
                y2={`${n.y}%`}
                stroke={i === actif ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.16)'}
                strokeWidth={i === actif ? 1.4 : 1}
                className="fc-fil"
              />
            ))}
          </svg>

          {astres.map((a, i) => (
            <span
              key={`p${i}`}
              className="fc-astre"
              style={{ left: `${a.x}%`, top: `${a.y}%`, width: a.r * 2, height: a.r * 2, opacity: a.o }}
            />
          ))}

          {/* Les deux disques blancs du foyer, comme sur la référence */}
          <span className="fc-foyer fc-foyer--haut" style={{ left: `${FOYER.x - 1}%`, top: `${FOYER.y - 18}%` }} />
          <span className="fc-foyer" style={{ left: `${FOYER.x}%`, top: `${FOYER.y}%` }} />

          {/* Les dix formalités : des disques, celui qui parle est allumé */}
          {noeuds.map((n, i) => (
            <button
              key={n.key}
              type="button"
              className={`fc-noeud${i === actif ? ' fc-noeud--actif' : ''}`}
              style={{ left: `${n.x}%`, top: `${n.y}%` }}
              onMouseEnter={() => {
                setActif(i);
                setFige(true);
              }}
              onFocus={() => {
                setActif(i);
                setFige(true);
              }}
              onBlur={() => setFige(false)}
              aria-label={n.titre}
              aria-pressed={i === actif}
            />
          ))}

          {/* La carte sombre : une formalité à la fois. Les fils passent
              derrière elle, exactement comme sur la référence. */}
          <div className="fc-carte">
            <div key={courante.key} className="fc-carte-inner">
              <div className="fc-carte-tete">
                <span className="fc-carte-pastille" aria-hidden="true" />
                <div>
                  <strong>{courante.titre}</strong>
                  <span>{courante.etat}</span>
                </div>
              </div>
              <p>{courante.texte}</p>
              <span className="fc-carte-badge">
                {actif + 1} / {formalites.length}
              </span>
            </div>
          </div>
        </div>

        {/* Repli : la même information, en liste. La constellation demande de
            la largeur ; une animation qui escamote l'information sur mobile ne
            vaut rien. */}
        <ul className="fc-liste">
          {formalites.map((f) => (
            <li key={f.key}>
              <h3>{f.titre}</h3>
              <p>{f.texte}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
