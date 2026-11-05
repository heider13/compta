'use client';

// « Toutes vos formalités, au même endroit » — en constellation.
//
// Remplace la rangée de cartes défilante. Le défilement continu obligeait à
// attendre pour voir passer la formalité qu'on cherche, et personne n'attend :
// dix cartes qui glissent se lisent comme un bandeau décoratif. Ici les dix
// sont posées autour de l'agent, visibles d'un seul coup d'œil, et une carte
// les présente l'une après l'autre — sur le modèle de wellapp.ai.
//
// Le contenu est EXACTEMENT celui des cartes précédentes : même titre, même
// texte, même illustration. Seule la mise en scène change.

import { useEffect, useMemo, useState } from 'react';

import { Container } from '../ui';
import { TitreEcrit } from '../TitreEcrit';
import { ILLUS } from './Illus';

export type Formalite = { key: string; titre: string; texte: string };

const FORMALITES: Formalite[] = [
  { key: 'creation', titre: 'Création de société', texte: 'SASU, SAS, SARL, EURL, SCI, micro-entreprise : statuts rédigés, dossier prêt à déposer.' },
  { key: 'modification', titre: 'Modifications', texte: 'Siège, dirigeants, objet, dénomination, capital : les pièces suivent la décision.' },
  { key: 'dissolution', titre: 'Dissolution et liquidation', texte: 'PV, liquidateur, comptes de clôture et radiation, dans l’ordre.' },
  { key: 'sommeil', titre: 'Mise en sommeil', texte: 'Cessation temporaire d’activité, sans annonce légale, jusqu’à deux ans.' },
  { key: 'annonces', titre: 'Annonces légales', texte: 'Rédigées par l’IA, mentions obligatoires contrôlées une à une.' },
  { key: 'rne', titre: 'Documents RNE', texte: 'Statuts, PV, comptes annuels et avis Insee récupérés en un clic.' },
  { key: 'regularisation', titre: 'Régularisations', texte: 'Les demandes du greffe sont lues et les réponses préparées.' },
  { key: 'lots', titre: 'Formalités en lot', texte: 'Plusieurs sociétés traitées en une seule demande.' },
  { key: 'paiement', titre: 'Suivi des paiements', texte: 'Montants, délégation au client et alertes, sans relance manuelle.' },
  { key: 'signature', titre: 'Signature électronique', texte: 'Documents signés en ligne, signature qualifiée eIDAS si besoin.' },
];

const CYCLE_MS = 3800;

// Le foyer — l'agent — est à gauche ; la carte occupe la droite. Les nœuds se
// répartissent sur une ellipse autour du foyer, sans jamais empiéter sur la
// zone de la carte : un nœud passant dessous serait illisible.
const FOYER = { x: 30, y: 50 };
const RAYON = { x: 25, y: 39 };

function position(i: number, total: number) {
  // On démarre à midi et on tourne : la répartition reste régulière quel que
  // soit le nombre de formalités, y compris si la liste change.
  const angle = -Math.PI / 2 + (i / total) * Math.PI * 2;
  return {
    x: FOYER.x + Math.cos(angle) * RAYON.x,
    y: FOYER.y + Math.sin(angle) * RAYON.y,
  };
}

export function FormalitesConstellation({
  titre = ['Toutes vos formalités,', 'au même endroit.'],
  sousTitre = 'De la création à la radiation : l’agent prépare, vous validez et déposez.',
  formalites = FORMALITES,
}: { titre?: [string, string]; sousTitre?: string; formalites?: Formalite[] } = {}) {
  const [actif, setActif] = useState(0);
  // Suspend la rotation quand le visiteur désigne lui-même une formalité :
  // continuer à tourner sous son doigt lui reprendrait la main.
  const [fige, setFige] = useState(false);

  const noeuds = useMemo(
    () => formalites.map((f, i) => ({ ...f, ...position(i, formalites.length) })),
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
    <section id="fonctionnalites" className="relative scroll-mt-24 overflow-hidden bg-[#fcfbff] py-20 sm:py-24">
      <Container className="relative">
        <TitreEcrit
          debut={titre[0]}
          fin={titre[1]}
          className="max-w-3xl font-[Sora] !text-[clamp(1.75rem,3.4vw,2.6rem)] !font-bold !leading-[1.1] !tracking-[-0.03em] !text-[var(--violet-900)]"
        />
        <p className="!mt-4 max-w-md text-[15px] !leading-relaxed !text-[var(--ink-600)]">{sousTitre}</p>

        {/* ── Constellation (écrans larges) ── */}
        <div className="fc-zone" onMouseLeave={() => setFige(false)}>
          {/*
            Les coordonnées sont données en POURCENTAGES, ce que SVG accepte
            nativement. La première version mesurait la zone au montage pour
            dessiner en pixels : la mesure restait à zéro et aucun fil
            n'apparaissait — une constellation sans ses liens. Sans viewBox,
            rien n'est mis à l'échelle, donc l'épaisseur des traits reste
            juste à toutes les largeurs.
          */}
          <svg width="100%" height="100%" className="absolute inset-0" aria-hidden="true">
            {noeuds.map((n, i) => (
              <line
                key={n.key}
                x1={`${FOYER.x}%`}
                y1={`${FOYER.y}%`}
                x2={`${n.x}%`}
                y2={`${n.y}%`}
                stroke={i === actif ? '#7551e8' : 'rgba(117,81,232,0.3)'}
                strokeWidth={i === actif ? 2 : 1.25}
                className="fc-fil"
              />
            ))}
          </svg>

          {/* Le foyer : l'agent, d'où tout part */}
          <span className="fc-foyer" style={{ left: `${FOYER.x}%`, top: `${FOYER.y}%` }}>
            <span className="fc-foyer-coeur" />
            <span className="fc-foyer-halo" />
          </span>

          {/* Les dix formalités */}
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
            >
              <span className="fc-noeud-point" />
              <span className="fc-noeud-nom">{n.titre}</span>
            </button>
          ))}

          {/* La carte : une formalité à la fois, avec son illustration */}
          <div className="fc-carte">
            <div key={courante.key} className="fc-carte-inner">
              <div className="fc-carte-illus">{ILLUS[courante.key] ?? null}</div>
              <h3>{courante.titre}</h3>
              <p>{courante.texte}</p>
            </div>
          </div>
        </div>

        {/* ── Repli (écrans étroits et mouvement réduit) ──
            La constellation demande de la largeur. En dessous, le contenu ne
            disparaît pas : les mêmes dix formalités, en liste simple. Une
            animation qui escamote l'information sur mobile ne vaut rien. */}
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
