// Fond du hero : une constellation de points reliés à un même foyer, sous le
// chat, avec une carte qui présente les sources officielles l'une après
// l'autre.
//
// Elle remplace les tuiles de logos qui flottaient autour du titre. Six
// pastilles blanches posées sur un dégradé encadraient le message au lieu de
// le servir : l'œil partait les lire, et aucune ne disait ce que la
// plateforme en fait. La constellation dit la même chose — « on est branché
// à tout ça » — sans encombrer, et la carte explique à quoi sert chaque
// source, une à la fois.
//
// Parti pris technique : les positions sont TIRÉES D'UNE SUITE DÉTERMINISTE,
// jamais de `Math.random()`. Un tirage aléatoire donnerait un rendu différent
// sur le serveur et dans le navigateur, et React signalerait une divergence
// d'hydratation à chaque chargement.

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Source = {
  cle: string;
  nom: string;
  logo?: string;
  role: string;
  /** Position en % de la zone. */
  x: number;
  y: number;
};

// Les cinq sources réellement branchées. Pas de logos clients inventés : ce
// sont des registres publics, c'est vérifiable.
const SOURCES: Source[] = [
  { cle: 'inpi', nom: 'INPI — Guichet unique', logo: '/logos/inpi.svg', role: 'Dépose vos formalités et suit leur instruction.', x: 13, y: 32 },
  { cle: 'rne', nom: 'Registre national des entreprises', logo: '/logos/inpi.svg', role: 'Statuts, PV et comptes annuels récupérés en un clic.', x: 87, y: 28 },
  { cle: 'legifrance', nom: 'Légifrance', logo: '/logos/legifrance.jpg', role: 'Contrôle les mentions obligatoires contre le texte en vigueur.', x: 89, y: 57 },
  { cle: 'insee', nom: 'Insee', logo: '/logos/insee.png', role: 'Vérifie SIREN, NAF et adresse avant l’envoi.', x: 11, y: 59 },
  { cle: 'youtrust', nom: 'Youtrust', logo: '/logos/youtrust.png', role: 'Signature électronique eIDAS des actes.', x: 15, y: 80 },
];

const CYCLE_MS = 3600;

/** Suite déterministe (générateur congruentiel) : même rendu serveur et client. */
function semis(graine: number) {
  let etat = graine;
  return () => {
    etat = (etat * 1664525 + 1013904223) % 4294967296;
    return etat / 4294967296;
  };
}

type Point = { x: number; y: number; r: number; o: number; delai: number };

function constellation(nb: number): Point[] {
  const suivant = semis(20260207);
  const points: Point[] = [];
  for (let i = 0; i < nb; i += 1) {
    points.push({
      x: 6 + suivant() * 88,
      y: 10 + suivant() * 72,
      r: 2 + suivant() * 7,
      o: 0.12 + suivant() * 0.3,
      delai: suivant() * 6,
    });
  }
  return points;
}

export function ConstellationSources({ className }: { className?: string }) {
  const zone = useRef<HTMLDivElement>(null);
  const [taille, setTaille] = useState({ w: 0, h: 0 });
  const [actif, setActif] = useState(0);
  const points = useMemo(() => constellation(26), []);

  // Les lignes sont tracées en pixels réels : en pourcentage, un SVG étiré
  // déforme l'épaisseur des traits et les courbes deviennent molles.
  useEffect(() => {
    const el = zone.current;
    if (!el) return;
    const mesurer = () => setTaille({ w: el.clientWidth, h: el.clientHeight });
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setActif((i) => (i + 1) % SOURCES.length), CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  const { w, h } = taille;
  // Le foyer est sous la boîte de chat, au centre : toutes les lignes en
  // partent, comme si la demande irriguait les registres.
  const foyer = { x: w / 2, y: h };

  const ligne = (xp: number, yp: number) => {
    const x = (xp / 100) * w;
    const y = (yp / 100) * h;
    return `M${foyer.x},${foyer.y} C${foyer.x},${foyer.y - h * 0.42} ${foyer.x + (x - foyer.x) * 0.4},${y + h * 0.26} ${x},${y}`;
  };

  const source = SOURCES[actif];
  // La carte suit la hauteur de sa source, mais reste dans une bande sûre :
  // trop bas elle débordait du hero et passait sous la pastille du chat,
  // trop haut elle serait allée se loger sous la barre de navigation.
  const hauteurCarte = Math.min(Math.max(source.y, 26), 66);

  return (
    <div
      ref={zone}
      className={className}
      aria-hidden="true"
      style={{
        // Creuse le fond derrière le titre et la boîte de chat. Sans ce
        // masque, un point tombait en plein sur « Décrivez » et les fils
        // barraient la phrase — le décor passait devant le message.
        maskImage:
          'radial-gradient(ellipse 42% 30% at 50% 36%, transparent 55%, black 95%),' +
          'radial-gradient(ellipse 34% 16% at 50% 80%, transparent 60%, black 100%)',
        WebkitMaskImage:
          'radial-gradient(ellipse 42% 30% at 50% 36%, transparent 55%, black 95%),' +
          'radial-gradient(ellipse 34% 16% at 50% 80%, transparent 60%, black 100%)',
        maskComposite: 'intersect',
        WebkitMaskComposite: 'source-in',
      }}
    >
      {w > 0 && (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute inset-0">
          <defs>
            {/* Les lignes s'effacent vers le haut : à pleine opacité partout,
                elles coupaient le titre en deux. */}
            <linearGradient id="cs-fil" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#361fab" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#361fab" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {points.map((p, i) => (
            <path key={`f${i}`} d={ligne(p.x, p.y)} fill="none" stroke="url(#cs-fil)" strokeWidth="0.7" />
          ))}

          {SOURCES.map((s, i) => (
            <path
              key={`s${s.cle}`}
              d={ligne(s.x, s.y)}
              fill="none"
              stroke={i === actif ? '#7551e8' : 'url(#cs-fil)'}
              strokeWidth={i === actif ? 1.4 : 0.9}
              className="cs-transition"
            />
          ))}
        </svg>
      )}

      {/* Poussière de points */}
      {points.map((p, i) => (
        <span
          key={`p${i}`}
          className="cs-point"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.r * 2,
            height: p.r * 2,
            opacity: p.o,
            animationDelay: `${p.delai}s`,
          }}
        />
      ))}

      {/* Les cinq sources : un point plus franc, celui qui parle est allumé */}
      {SOURCES.map((s, i) => (
        <span
          key={s.cle}
          className={`cs-source${i === actif ? ' cs-source--actif' : ''}`}
          style={{ left: `${s.x}%`, top: `${s.y}%` }}
        />
      ))}

      {/*
        La carte est plaquée dans la GOUTTIÈRE, du côté de sa source, et non
        collée au point. Accrochée au point, elle passait par-dessus
        « L'agent la prépare. » : le titre est ce qu'on vient lire, rien ne
        doit s'y superposer. Elle suit la hauteur de la source, ce qui suffit
        à les relier — le point s'allume et sa ligne s'épaissit en même temps.
      */}
      <div
        className={`cs-carte ${source.x < 50 ? 'cs-carte--gauche' : 'cs-carte--droite'}`}
        style={{ top: `${hauteurCarte}%` }}
      >
        <div key={source.cle} className="cs-carte-inner">
          <div className="cs-carte-tete">
            {source.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={source.logo} alt="" className="cs-carte-logo" />
            ) : null}
            <div>
              <strong>{source.nom}</strong>
              <span>Connecté</span>
            </div>
          </div>
          <p>{source.role}</p>
        </div>
      </div>
    </div>
  );
}
