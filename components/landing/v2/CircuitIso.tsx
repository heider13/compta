'use client';

// Scène « circuit » (esprit light.inc, identité Legaly) : maquette isométrique en
// pixels où chaque plaque est une étape réelle d'une formalité. Des pixels corail
// circulent d'étape en étape (le dossier avance) et des cartes terminal montrent
// les agents au travail, reliées à leur étape. Tout en SVG + HTML, sans 3D :
// léger, net sur mobile, en pause hors écran et figé si l'animation est réduite.

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// ─── Contenu par page ───
type Agent = { nom: string; tag: string; etape: number; lignes: string[] }; // {texte} = puce corail
type Circuit = {
  kicker: string;
  titre: string;
  titreAccent: string;
  sousTitre: string;
  etapes: string[]; // 6 étapes, dans l'ordre du parcours
  agents: Agent[]; // 6 agents : 3 à gauche, 3 à droite
  compteurs: [string, string][];
};

const ACCUEIL: Circuit = {
  kicker: 'En coulisses',
  titre: 'Chaque formalité suit son circuit.',
  titreAccent: 'Les agents font le travail.',
  sousTitre: 'Du premier message au brouillon déposé sur le Guichet unique : chaque étape est préparée, contrôlée et tracée. Vous validez à la fin.',
  etapes: ['Demande', 'Actes', 'Annonce légale', 'Signature', 'Guichet unique', 'Greffe · Kbis'],
  agents: [
    { nom: 'Agent Recueil', tag: 'SASU', etape: 0, lignes: ['lit {SASU} · conseil · Marseille', 'capital {1 000 €} · 1 associé'] },
    { nom: 'Agent Actes', tag: 'DOCX', etape: 1, lignes: ['rédige statuts · 24 articles', 'ajoute {DNC} · pouvoir'] },
    { nom: 'Agent Annonce', tag: 'JAL', etape: 2, lignes: ['rédige avis de constitution', 'mentions légales {6/6}'] },
    { nom: 'Agent Signature', tag: 'PDF', etape: 3, lignes: ['prépare le circuit · {2} signataires', 'en attente de vous…'] },
    { nom: 'Agent INPI', tag: 'GU', etape: 4, lignes: ['crée brouillon {M0}', 'joint {7} pièces · à valider'] },
    { nom: 'Agent Suivi', tag: 'RNE', etape: 5, lignes: ['suit le dossier au greffe', 'statut {en instruction}'] },
  ],
  compteurs: [['6', 'étapes'], ['6', 'agents'], ['1', 'validation : la vôtre']],
};

const PAR_METIER: Record<string, Circuit> = {
  'independants-tpe': {
    ...ACCUEIL,
    titre: 'Votre société avance toute seule.',
    titreAccent: 'Vous gardez la main.',
    sousTitre: 'Statuts, annonce, signature, dépôt : les agents préparent chaque étape de votre formalité. Vous relisez, signez et payez.',
    etapes: ['Votre projet', 'Statuts', 'Annonce légale', 'Signature', 'Guichet unique', 'Kbis'],
  },
  'experts-comptables': {
    kicker: 'En coulisses',
    titre: 'Tout le portefeuille suit le même circuit.',
    titreAccent: 'Les agents font le travail.',
    sousTitre: 'Approbation des comptes, dépôt, modifications : chaque dossier client est préparé et contrôlé, étape par étape. Le cabinet valide.',
    etapes: ['Liasse reçue', 'Approbation', 'Affectation', 'Signature', 'Guichet unique', 'Greffe'],
    agents: [
      { nom: 'Agent Liasse', tag: 'FEC', etape: 0, lignes: ['lit la liasse · {exercice N}', 'résultat repris · bilan OK'] },
      { nom: 'Agent AGO', tag: 'PV', etape: 1, lignes: ['rédige PV d’approbation', 'rapport de gestion {joint}'] },
      { nom: 'Agent Affectation', tag: 'DOCX', etape: 2, lignes: ['affecte le résultat', 'réserve légale {5 %}'] },
      { nom: 'Agent Signature', tag: 'PDF', etape: 3, lignes: ['prépare le circuit · {gérant}', 'en attente du cabinet…'] },
      { nom: 'Agent Dépôt', tag: 'GU', etape: 4, lignes: ['crée brouillon {dépôt des comptes}', 'pièces {4/4} · à valider'] },
      { nom: 'Agent Suivi', tag: 'RNE', etape: 5, lignes: ['suit le dépôt au greffe', 'statut {en instruction}'] },
    ],
    compteurs: [['6', 'étapes'], ['6', 'agents'], ['1', 'validation : celle du cabinet']],
  },
  avocats: {
    kicker: 'En coulisses',
    titre: 'Vos actes suivent leur circuit.',
    titreAccent: 'Vous signez, l’agent dépose.',
    sousTitre: 'Les agents reprennent le RNE, rédigent les actes et l’annonce, préparent le brouillon au Guichet unique. L’avocat relit et valide.',
    etapes: ['Dossier client', 'Lecture RNE', 'Actes', 'Annonce légale', 'Guichet unique', 'Greffe'],
    agents: [
      { nom: 'Agent Dossier', tag: 'CLIENT', etape: 0, lignes: ['ouvre le dossier · {SARL}', 'transfert de siège · Lyon'] },
      { nom: 'Agent RNE', tag: 'RNE', etape: 1, lignes: ['lit statuts en vigueur', 'siège actuel {Paris 8e}'] },
      { nom: 'Agent Actes', tag: 'DOCX', etape: 2, lignes: ['rédige {PV} · statuts à jour', 'article 4 · modifié'] },
      { nom: 'Agent Annonce', tag: 'JAL', etape: 3, lignes: ['rédige avis de transfert', 'mentions légales {6/6}'] },
      { nom: 'Agent INPI', tag: 'GU', etape: 4, lignes: ['crée brouillon {M2}', 'événement {60M} · à valider'] },
      { nom: 'Agent Suivi', tag: 'GREFFE', etape: 5, lignes: ['suit le dossier au greffe', 'statut {en instruction}'] },
    ],
    compteurs: [['6', 'étapes'], ['6', 'agents'], ['1', 'validation : la vôtre']],
  },
  'directions-juridiques': {
    kicker: 'En coulisses',
    titre: 'Un changement, toutes les filiales.',
    titreAccent: 'Les agents propagent.',
    sousTitre: 'Nomination, bénéficiaires effectifs, transfert : les agents préparent la formalité pour chaque entité du groupe. La direction juridique valide.',
    etapes: ['Groupe', 'Filiales', 'PV & registres', 'Bénéf. effectifs', 'Guichet unique', 'Greffe'],
    agents: [
      { nom: 'Agent Groupe', tag: 'HOLDING', etape: 0, lignes: ['nouveau président · {groupe}', '12 entités concernées'] },
      { nom: 'Agent Filiales', tag: 'RNE', etape: 1, lignes: ['lit fiches RNE · {12/12}', 'dirigeants à remplacer : 9'] },
      { nom: 'Agent PV', tag: 'DOCX', etape: 2, lignes: ['rédige {9} PV de nomination', 'registres mis à jour'] },
      { nom: 'Agent RBE', tag: 'RBE', etape: 3, lignes: ['contrôle bénéficiaires effectifs', 'déclarations {3} à modifier'] },
      { nom: 'Agent INPI', tag: 'GU', etape: 4, lignes: ['crée {9} brouillons', 'lot prêt · à valider'] },
      { nom: 'Agent Suivi', tag: 'GREFFE', etape: 5, lignes: ['suit les 9 dossiers', 'statut {en instruction}'] },
    ],
    compteurs: [['6', 'étapes'], ['6', 'agents'], ['1', 'validation : la vôtre']],
  },
};

// ─── Géométrie isométrique ───
const W = 1200;
const H = 630;
const S = 41; // taille d'une unité à l'écran
const CX = 0.866;
const TUILE = 3; // côté d'une plaque, en unités
const PAS = 4.3; // plaque + allée
const EP = 0.35; // épaisseur d'une plaque
const OX = 532;
const OY = 160;

type P = [number, number];

// Rotation lente de la maquette autour de son centre (comme light.inc) :
// l'angle courant est fixé par la scène avant chaque rendu.
let ROT_C = 1;
let ROT_S = 0;
const CENTRE_X = (2 * 4.3 + 3) / 2;
const CENTRE_Y = (4.3 + 3) / 2;
function tourne(x: number, y: number): P {
  const dx = x - CENTRE_X;
  const dy = y - CENTRE_Y;
  return [CENTRE_X + dx * ROT_C - dy * ROT_S, CENTRE_Y + dx * ROT_S + dy * ROT_C];
}
const iso = (x: number, y: number, z = 0): P => {
  const [a, b] = tourne(x, y);
  return [OX + (a - b) * S * CX, OY + (a + b) * S * 0.5 - z * S];
};
const pts = (l: P[]) => l.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ');

// Faces visibles d'un pavé (dessus, face avant-gauche, face avant-droite)
function pave(x: number, y: number, z: number, w: number, d: number, h: number) {
  return {
    dessus: pts([iso(x, y, z + h), iso(x + w, y, z + h), iso(x + w, y + d, z + h), iso(x, y + d, z + h)]),
    gauche: pts([iso(x, y + d, z), iso(x + w, y + d, z), iso(x + w, y + d, z + h), iso(x, y + d, z + h)]),
    droite: pts([iso(x + w, y, z), iso(x + w, y + d, z), iso(x + w, y + d, z + h), iso(x + w, y, z + h)]),
    prof: (([a, b]) => a + b + z)(tourne(x + w / 2, y + d / 2)),
  };
}

// Parcours en serpentin : rangée du fond de gauche à droite, rangée de devant au retour
const GRILLE: P[] = [[0, 0], [1, 0], [2, 0], [2, 1], [1, 1], [0, 1]];
const origine = (i: number): P => [GRILLE[i][0] * PAS, GRILLE[i][1] * PAS];
const centre = (i: number, z = EP): P => {
  const [x, y] = origine(i);
  return iso(x + TUILE / 2, y + TUILE / 2, z);
};

// Volumes en pixels posés sur chaque plaque : [x, y, z, w, d, h] en unités locales
const VOLUMES: [number, number, number, number, number, number][][] = [
  // Demande : bulle de conversation
  [[0.6, 0.7, 0, 1.4, 1.0, 0.45], [0.9, 0.9, 0.45, 0.8, 0.6, 0.45], [1.9, 1.9, 0, 0.5, 0.5, 0.5]],
  // Actes : piles de feuillets
  [[0.5, 0.6, 0, 1.0, 1.3, 0.18], [0.5, 0.6, 0.22, 1.0, 1.3, 0.18], [0.5, 0.6, 0.44, 1.0, 1.3, 0.18], [1.8, 0.8, 0, 0.8, 1.1, 0.18], [1.8, 0.8, 0.22, 0.8, 1.1, 0.18]],
  // Annonce légale : colonnes de journal
  [[0.5, 0.5, 0, 0.5, 0.5, 1.1], [1.15, 0.5, 0, 0.5, 0.5, 0.7], [1.8, 0.5, 0, 0.5, 0.5, 1.4], [0.5, 1.6, 0, 1.8, 0.7, 0.3]],
  // Signature : socle et sceau
  [[0.8, 0.8, 0, 1.4, 1.4, 0.3], [1.15, 1.15, 0.3, 0.7, 0.7, 0.55]],
  // Guichet unique : bâtiment central
  [[0.4, 0.4, 0, 2.2, 2.2, 0.35], [0.6, 0.6, 0.35, 0.6, 0.6, 1.5], [1.3, 0.6, 0.35, 0.6, 0.6, 1.9], [2.0, 0.6, 0.35, 0.4, 0.6, 1.2], [0.6, 1.4, 0.35, 0.6, 1.0, 0.9], [1.3, 1.4, 0.35, 1.1, 1.0, 0.6]],
  // Greffe · Kbis : extrait empilé
  [[0.7, 0.7, 0, 1.6, 1.2, 0.12], [0.75, 0.75, 0.16, 1.5, 1.1, 0.12], [0.8, 0.8, 0.32, 1.4, 1.0, 0.12], [2.1, 0.4, 0, 0.6, 0.6, 0.6]],
];

// Deux cadrages de la même maquette (coordonnées du viewBox) :
//   section → bandeau large, 6 cartes (3 de chaque côté)
//   hero    → panneau d'en-tête plus haut, 4 cartes au-dessus de la maquette
type Mise = { x0: number; y0: number; w: number; h: number; carteL: number; cartes: P[]; agents: number[]; police: string };
const MISES: Record<'section' | 'hero', Mise> = {
  section: {
    x0: 0, y0: 0, w: W, h: H, carteL: 232,
    cartes: [[20, 26], [20, 150], [20, 274], [W - 252, 26], [W - 252, 150], [W - 252, 274]],
    agents: [0, 1, 2, 3, 4, 5],
    police: 'clamp(8.5px, 0.95cqw, 11.5px)',
  },
  hero: {
    x0: 200, y0: -60, w: 820, h: 730, carteL: 262,
    cartes: [[212, -44], [212, 76], [746, -44], [746, 76]],
    agents: [0, 1, 4, 5],
    police: 'clamp(8.5px, 1.4cqw, 12px)',
  },
};

// ─── Machine à écrire des cartes ───
function useFrappe(lignes: string[], actif: boolean, delai: number) {
  const total = lignes.join('\n');
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!actif) return;
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      i += 1;
      setN(i);
      if (i >= total.length + 60) i = 0; // pause en fin de texte puis on recommence
      t = setTimeout(tick, i === 0 ? 400 : 42);
    };
    t = setTimeout(tick, delai);
    return () => clearTimeout(t);
  }, [total, actif, delai]);
  return actif ? total.slice(0, n) : total;
}

function Ligne({ texte }: { texte: string }) {
  // {mot} → puce corail ; une accolade non refermée (frappe en cours) reste ouverte
  const morceaux = texte.split(/(\{[^}]*\}?)/g).filter(Boolean);
  return (
    <>
      {morceaux.map((m, i) =>
        m.startsWith('{') ? (
          <span key={i} className="rounded-[3px] bg-[#ff887b] px-1 text-[#080331]">{m.replace(/[{}]/g, '')}</span>
        ) : (
          <span key={i}>{m}</span>
        ),
      )}
    </>
  );
}

function CarteAgent({ agent, actif, i, pos, m }: { agent: Agent; actif: boolean; i: number; pos: P; m: Mise }) {
  const texte = useFrappe(agent.lignes, actif, 300 + i * 650);
  const lignes = texte.split('\n');
  const enFrappe = actif && texte.length < agent.lignes.join('\n').length;
  return (
    <div
      className={cn(
        'absolute hidden rounded-md border bg-[#05021f]/95 font-mono shadow-[0_10px_30px_rgba(0,0,0,0.35)] md:block',
        agent.etape === 4 ? 'border-[#ff887b]/70' : 'border-white/12',
      )}
      style={{ left: `${((pos[0] - m.x0) / m.w) * 100}%`, top: `${((pos[1] - m.y0) / m.h) * 100}%`, width: `${(m.carteL / m.w) * 100}%`, fontSize: m.police }}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-[0.9em] py-[0.6em]">
        <span className="font-semibold text-white">{agent.nom}</span>
        <span className="text-white/45">{agent.tag}</span>
      </div>
      <div className="min-h-[3.6em] space-y-[0.25em] px-[0.9em] py-[0.6em] leading-snug text-white/80">
        {lignes.map((l, k) => (
          <p key={k}>
            <Ligne texte={l} />
            {enFrappe && k === lignes.length - 1 && <span className="ml-px inline-block h-[1em] w-[0.5em] translate-y-[0.15em] bg-[#ff887b]" />}
          </p>
        ))}
      </div>
    </div>
  );
}

// ─── Scène (maquette + cartes + compteurs) ───
function Scene({ c, mode }: { c: Circuit; mode: 'section' | 'hero' }) {
  const m = MISES[mode];
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [reduit, setReduit] = useState(false);

  useEffect(() => {
    setReduit(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Pause des animations SVG hors écran
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const s = svgRef.current;
    if (!s) return;
    if (visible && !reduit) s.unpauseAnimations?.();
    else s.pauseAnimations?.();
  }, [visible, reduit]);

  const actif = visible && !reduit;

  // Horloge de la scène : rotation en va-et-vient (±14°, 22 s) et avancée des pixels
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!actif) return;
    let id = 0;
    let dernier = 0;
    const depart = performance.now() - t * 1000;
    const boucle = (now: number) => {
      if (now - dernier > 33) {
        dernier = now;
        setT(Math.max(0, (now - depart) / 1000));
      }
      id = requestAnimationFrame(boucle);
    };
    id = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actif]);
  const angle = reduit ? 0 : 0.245 * Math.sin((2 * Math.PI * t) / 22);
  ROT_C = Math.cos(angle);
  ROT_S = Math.sin(angle);
  const pixel = (k: number): P => {
    const p = reduit ? 0.15 + k * 0.22 : (((t / 12 + k * 0.25) % 1) + 1) % 1;
    const seg = Math.max(0, Math.min(4, Math.floor(p * 5)));
    const f = p * 5 - seg;
    const [ax, ay] = centre(seg, EP + 0.05);
    const [bx, by] = centre(seg + 1, EP + 0.05);
    return [ax + (bx - ax) * f, ay + (by - ay) * f];
  };

  // Plaques, triées de l'arrière vers l'avant
  const plaques = GRILLE.map((_, i) => {
    const [x, y] = origine(i);
    return { i, ...pave(x, y, 0, TUILE, TUILE, EP) };
  }).sort((a, b) => a.prof - b.prof);

  const volumes = VOLUMES.flatMap((liste, i) => {
    const [ox, oy] = origine(i);
    return liste.map(([x, y, z, w, d, h], k) => ({ cle: `${i}-${k}`, i, ...pave(ox + x, oy + y, EP + z, w, d, h) }));
  }).sort((a, b) => a.prof - b.prof);

  // Trajet des pixels : centre de chaque plaque, juste au-dessus de la surface
  const trajet = 'M' + GRILLE.map((_, i) => centre(i, EP + 0.05).map((v) => v.toFixed(1)).join(',')).join(' L');

  // Socle sombre sous l'ensemble
  const socle = pave(-0.5, -0.5, -0.45, 2 * PAS + TUILE + 1, PAS + TUILE + 1, 0.45);

  // Trame de points sur chaque plaque
  const points: P[] = [];
  GRILLE.forEach((_, i) => {
    const [x, y] = origine(i);
    for (let a = 0.3; a < TUILE; a += 0.4) for (let b = 0.3; b < TUILE; b += 0.4) points.push(iso(x + a, y + b, EP));
  });

  return (
    <>
    <div ref={ref} className="relative mx-auto w-full [container-type:inline-size]" style={{ aspectRatio: `${m.w} / ${m.h}` }}>
      <svg ref={svgRef} viewBox={`${m.x0} ${m.y0} ${m.w} ${m.h}`} className="absolute inset-0 size-full" role="img" aria-label={`Circuit d’une formalité : ${c.etapes.join(', ')}`}>
        <defs>
          <filter id={`circuit-lueur-${mode}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>

        {/* Socle */}
        <polygon points={socle.gauche} fill="#04011a" />
        <polygon points={socle.droite} fill="#0b0640" />
        <polygon points={socle.dessus} fill="#120b52" />

        {/* Fils agents → étapes (masqués sur mobile, comme les cartes) */}
        <g className="hidden md:inline">
          {m.agents.map((n, k) => {
            const a = c.agents[n];
            const [cx, cy] = m.cartes[k];
            const depart: P = cx < m.x0 + m.w / 2 ? [cx + m.carteL, cy + 18] : [cx, cy + 18];
            const [tx, ty] = centre(a.etape, EP + 1.1);
            return (
              <g key={a.nom}>
                <path d={`M${depart[0]},${depart[1]} L${tx},${ty}`} stroke={a.etape === 4 ? '#ff887b' : 'rgba(255,255,255,0.28)'} strokeWidth="1" fill="none" strokeDasharray={a.etape === 4 ? '0' : '3 4'} />
                <rect x={tx - 3.5} y={ty - 3.5} width="7" height="7" fill="#ff887b">
                  {!reduit && <animate attributeName="opacity" values="1;0.25;1" dur="1.6s" begin={`${k * 0.27}s`} repeatCount="indefinite" />}
                </rect>
              </g>
            );
          })}
        </g>

        {/* Plaques */}
        {plaques.map((p) => (
          <g key={p.i}>
            <polygon points={p.gauche} fill="#c9c3e6" />
            <polygon points={p.droite} fill="#a49bd3" />
            <polygon points={p.dessus} fill={p.i === 4 ? '#ece8fb' : '#f7f6fc'} />
          </g>
        ))}
        {points.map(([x, y], k) => (
          <circle key={k} cx={x} cy={y} r="1.1" fill="#b8b0dc" />
        ))}

        {/* Allées : le chemin du dossier */}
        <path d={trajet} stroke="#ff887b" strokeOpacity="0.7" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 7" fill="none" />

        {/* Volumes */}
        {volumes.map((v) => (
          <g key={v.cle}>
            <polygon points={v.gauche} fill={v.i === 4 ? '#d9d3f2' : '#e6e2f5'} />
            <polygon points={v.droite} fill={v.i === 4 ? '#b5abe2' : '#c7c0e6'} />
            <polygon points={v.dessus} fill="#ffffff" />
          </g>
        ))}

        {/* Pixels corail : les dossiers qui avancent */}
        {[0, 1, 2, 3].map((k) => (
          <g key={k} transform={`translate(${pixel(k).map((v) => v.toFixed(1)).join(',')})`}>
            <rect x="-9" y="-9" width="18" height="18" fill="#ff887b" opacity="0.55" filter={`url(#circuit-lueur-${mode})`} />
            <polygon points={pts([[-7, -3.5], [0, -7], [7, -3.5], [0, 0]])} fill="#ffb3aa" />
            <polygon points={pts([[-7, -3.5], [0, 0], [0, 7], [-7, 3.5]])} fill="#ff887b" />
            <polygon points={pts([[0, 0], [7, -3.5], [7, 3.5], [0, 7]])} fill="#e9665a" />
          </g>
        ))}

        {/* Étiquettes des étapes (remplacées par une liste sur mobile) */}
        <g className="hidden md:inline">
        {c.etapes.map((e, i) => {
          const [x, y] = origine(i);
          const [lx, ly] = iso(x + TUILE - 0.3, y + TUILE - 0.3, EP);
          const l = e.length * 7.9 + 48;
          return (
            <g key={e} transform={`translate(${lx - l / 2},${ly - 13})`}>
              <rect width={l} height="26" rx="13" fill={i === 4 ? '#ff887b' : '#1b1458'} stroke={i === 4 ? 'none' : 'rgba(255,255,255,0.14)'} />
              <text x="14" y="17.5" fontSize="11" fontFamily="Geist Mono, ui-monospace, monospace" fill={i === 4 ? '#080331' : 'rgba(255,255,255,0.55)'}>
                {String(i + 1).padStart(2, '0')}
              </text>
              <text x="34" y="17.5" fontSize="12.5" fontWeight="600" fontFamily="Poppins, ui-sans-serif, sans-serif" fill={i === 4 ? '#080331' : '#ffffff'}>
                {e}
              </text>
            </g>
          );
        })}
        </g>
      </svg>

      {m.agents.map((n, k) => (
        <CarteAgent key={c.agents[n].nom} agent={c.agents[n]} actif={actif} i={k} pos={m.cartes[k]} m={m} />
      ))}

      {/* Compteurs */}
      <div className="absolute inset-x-0 bottom-0 hidden md:flex flex-wrap justify-center gap-2">
        {c.compteurs.map(([n, l], k) => (
          <span key={l} className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-[#05021f]/90 px-3.5 py-1.5 text-[12.5px] text-white/75">
            <span className={cn('size-2 rounded-[2px]', k === c.compteurs.length - 1 ? 'bg-[#ff887b]' : 'bg-white')} />
            <span className="font-semibold text-white">{n}</span> {l}
          </span>
        ))}
      </div>
    </div>
    <ol className="relative mt-4 grid grid-cols-2 gap-2 md:hidden">
      {c.etapes.map((e, i) => (
        <li key={e} className={cn('flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px]', i === 4 ? 'border-transparent bg-[#ff887b] font-semibold text-[#080331]' : 'border-white/12 bg-[#05021f]/80 text-white')}>
          <span className={cn('font-mono text-[11px]', i === 4 ? 'text-[#080331]/70' : 'text-white/50')}>{String(i + 1).padStart(2, '0')}</span>
          {e}
        </li>
      ))}
    </ol>
    </>
  );
}

const FOND_NUIT = (
  <>
    {/* Halo et trame de fond */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          'radial-gradient(ellipse 620px 420px at 85% 0%, rgba(255,136,123,0.16), transparent 62%),' +
          'radial-gradient(ellipse 700px 480px at 10% 100%, rgba(54,31,171,0.45), transparent 65%)',
      }}
    />
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-60"
      style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.09) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
    />
  </>
);

// Section pleine largeur (accueil, Indépendants et TPE)
export function CircuitIso({ variante }: { variante?: string }) {
  const c = (variante && PAR_METIER[variante]) || ACCUEIL;
  return (
    <section className="bg-[#fbfaff] px-3 py-16 sm:px-5 sm:py-20">
      <div className="theme-fixe relative mx-auto max-w-[1240px] overflow-hidden rounded-[28px] bg-[#080331] px-5 pb-6 pt-12 text-white sm:px-10 sm:pt-14">
        {FOND_NUIT}

        <div className="relative max-w-3xl">
          <p className="font-mono !text-[12px] uppercase tracking-[0.18em] !text-white/50">{c.kicker}</p>
          <h2 className="!mt-3 font-[Sora] !text-[clamp(1.75rem,3.6vw,2.75rem)] !font-semibold !leading-[1.1] !tracking-[-0.02em] !text-white">
            {c.titre}{' '}
            <span className="bg-gradient-to-r from-[#ffbe8c] via-[#ff887b] to-[#ea42fd] bg-clip-text text-transparent">{c.titreAccent}</span>
          </h2>
          <p className="!mt-4 max-w-2xl text-[15px] leading-relaxed !text-white/65">{c.sousTitre}</p>
        </div>

        <div className="relative mt-6">
          <Scene c={c} mode="section" />
        </div>
      </div>
    </section>
  );
}

// Panneau d'en-tête des pages métier (à droite du titre, comme light.inc)
export function CircuitHero({ variante }: { variante: string }) {
  const c = PAR_METIER[variante] ?? ACCUEIL;
  return (
    <div className="theme-fixe relative overflow-hidden rounded-[24px] bg-[#080331] p-3 text-white shadow-[0_30px_70px_rgba(8,3,49,0.28)] sm:p-5">
      {FOND_NUIT}
      <div className="relative">
        <Scene c={c} mode="hero" />
      </div>
    </div>
  );
}
