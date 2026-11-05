'use client';

// « Toutes vos formalités, au même endroit » — réseau vivant, sur fond clair.
//
// Même mise en scène que wellapp.ai : un graphe qui pousse quand la section
// arrive à l'écran (un foyer, puis les formalités, puis leurs grappes de
// sociétés et de pièces, puis les fils qui relient les grappes), tenu par un
// petit calcul de forces (ressorts + répulsion), puis UNE formalité qui
// s'allume à la fois — elle et ses fils en couleur, le reste en retrait — avec
// sa carte qui la suit.
//
// Canvas 2D, sans dépendance : ~260 nœuds tiennent largement à 60 i/s.

import { useEffect, useRef, useState } from 'react';

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
const CROISSANCE_MS = 6500; // durée de la pousse du réseau
// Couleurs sur fond clair : le repos en ardoise très léger, la formalité allumée
// dans le dégradé Legaly (violet → rose).
const VIOLET = [117, 81, 232] as const;
const ROSE = [234, 66, 253] as const;
const ARDOISE = [38, 34, 58] as const;

type Noeud = {
  x: number; y: number; vx: number; vy: number;
  r: number;
  groupe: number; // -1 : foyer ; sinon indice de la formalité
  hub: boolean;
  parent: number; // indice du nœud d'où il pousse
  ne: number; // instant d'apparition (ms après le début de la pousse)
  lum: number; // 0 : en retrait, 1 : allumé (lissé à chaque image)
};
type Fil = { a: number; b: number; l: number; k: number; croise: boolean };

/** Suite déterministe : le même réseau à chaque visite. */
function semis(graine: number) {
  let etat = graine;
  return () => {
    etat = (etat * 1664525 + 1013904223) % 4294967296;
    return etat / 4294967296;
  };
}

function construire(nbFormalites: number) {
  const s = semis(20261105);
  const noeuds: Noeud[] = [];
  const fils: Fil[] = [];
  const ajouter = (n: Omit<Noeud, 'x' | 'y' | 'vx' | 'vy' | 'lum'>) => {
    noeuds.push({ ...n, x: 0, y: 0, vx: 0, vy: 0, lum: 1 });
    return noeuds.length - 1;
  };
  const foyer = ajouter({ r: 9, groupe: -1, hub: false, parent: -1, ne: 0 });
  const hubs: number[] = [];
  for (let g = 0; g < nbFormalites; g += 1) {
    const h = ajouter({ r: 6.5, groupe: g, hub: true, parent: foyer, ne: 250 + g * 170 });
    hubs.push(h);
    fils.push({ a: foyer, b: h, l: 120 + s() * 40, k: 0.03, croise: false });
  }
  const satellites: number[][] = hubs.map(() => []);
  hubs.forEach((h, g) => {
    const nb = 13 + Math.floor(s() * 9);
    for (let i = 0; i < nb; i += 1) {
      const n = ajouter({ r: 1.6 + s() ** 2 * 3.4, groupe: g, hub: false, parent: h, ne: 1900 + s() * (CROISSANCE_MS - 2600) });
      satellites[g].push(n);
      fils.push({ a: h, b: n, l: 28 + s() * 46, k: 0.05, croise: false });
      // Un satellite sur trois porte ses propres pièces : c'est ce qui donne les grappes
      if (s() < 0.33) {
        const nbE = 1 + Math.floor(s() * 2);
        for (let j = 0; j < nbE; j += 1) {
          const e = ajouter({ r: 1.2 + s() * 1.4, groupe: g, hub: false, parent: n, ne: noeuds[n].ne + 300 + s() * 700 });
          fils.push({ a: n, b: e, l: 16 + s() * 16, k: 0.06, croise: false });
        }
      }
    }
  });
  // Fils entre grappes : le réseau se maille, comme les dossiers d'un même client
  for (let i = 0; i < 46; i += 1) {
    const g1 = Math.floor(s() * nbFormalites);
    const g2 = (g1 + 1 + Math.floor(s() * (nbFormalites - 1))) % nbFormalites;
    const a = satellites[g1][Math.floor(s() * satellites[g1].length)];
    const b = satellites[g2][Math.floor(s() * satellites[g2].length)];
    fils.push({ a, b, l: 150, k: 0.004, croise: true });
  }
  return { noeuds, fils, hubs };
}

const mix = (c1: readonly number[], c2: readonly number[], t: number) => c1.map((v, i) => Math.round(v + (c2[i] - v) * t));
const rgba = (c: readonly number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

export function FormalitesConstellation({
  titre = 'Toutes vos formalités, au même endroit.',
  sousTitre = 'De la création à la radiation : l’agent prépare, vous validez et déposez.',
  formalites = FORMALITES,
}: { titre?: string; sousTitre?: string; formalites?: Formalite[] } = {}) {
  const [actif, setActif] = useState(0);
  const [visible, setVisible] = useState(false); // carte affichée une fois le réseau poussé
  const [fige, setFige] = useState(false);
  const zoneRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const carteRef = useRef<HTMLDivElement>(null);
  const actifRef = useRef(0);
  const figeRef = useRef(false);

  actifRef.current = actif;
  figeRef.current = fige;

  // Rotation des formalités, une fois le réseau poussé
  useEffect(() => {
    if (!visible || fige) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setActif((i) => (i + 1) % formalites.length), CYCLE_MS);
    return () => clearInterval(id);
  }, [visible, fige, formalites.length]);

  useEffect(() => {
    const zone = zoneRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!zone || !canvas || !ctx) return;

    const reduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const { noeuds, fils, hubs } = construire(formalites.length);
    const s = semis(42);
    let largeur = 0;
    let hauteur = 0;
    let dpr = 1;
    let echelle = 1;
    let debut = -1; // début de la pousse (première apparition à l'écran)
    let enVue = false;
    let image = 0;
    let carteX = 0;
    let carteY = 0;
    let pousse = false;

    const dimensionner = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      largeur = zone.clientWidth;
      hauteur = zone.clientHeight;
      canvas.width = Math.round(largeur * dpr);
      canvas.height = Math.round(hauteur * dpr);
    };
    dimensionner();
    const ro = new ResizeObserver(dimensionner);
    ro.observe(zone);

    // Mouvement réduit : le réseau entier, déjà stabilisé
    const ne = (n: Noeud, t: number) => reduit || n.ne <= t;
    const naitre = (n: Noeud) => {
      const p = noeuds[n.parent];
      n.x = (p ? p.x : 0) + (s() - 0.5) * 6;
      n.y = (p ? p.y : 0) + (s() - 0.5) * 6;
    };
    const nes = new Set<number>();

    const pas = (t: number, vie: number) => {
      for (let i = 0; i < noeuds.length; i += 1) {
        if (!nes.has(i) && ne(noeuds[i], t)) {
          naitre(noeuds[i]);
          nes.add(i);
        }
      }
      const liste = [...nes];
      // Répulsion entre tous les nœuds nés (n² reste petit ici)
      for (let i = 0; i < liste.length; i += 1) {
        const a = noeuds[liste[i]];
        for (let j = i + 1; j < liste.length; j += 1) {
          const b = noeuds[liste[j]];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 0.01) { dx = s() - 0.5; dy = s() - 0.5; d2 = 0.5; }
          if (d2 > 90000) continue;
          const f = (a.hub || b.hub ? 340 : 120) / d2;
          const d = Math.sqrt(d2);
          a.vx += (dx / d) * f; a.vy += (dy / d) * f;
          b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
        }
      }
      for (const fl of fils) {
        if (!nes.has(fl.a) || !nes.has(fl.b)) continue;
        const a = noeuds[fl.a];
        const b = noeuds[fl.b];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const f = (d - fl.l) * fl.k;
        a.vx += (dx / d) * f; a.vy += (dy / d) * f;
        b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
      }
      for (const i of liste) {
        const n = noeuds[i];
        // Rappel vers le centre, et une dérive à peine visible : le réseau respire
        // Rappel plus fort à la verticale : le réseau s'étale en largeur, comme la zone
        n.vx += -n.x * 0.0009 + (vie ? (s() - 0.5) * 0.05 : 0);
        n.vy += -n.y * 0.0028 + (vie ? (s() - 0.5) * 0.05 : 0);
        n.vx *= 0.82; n.vy *= 0.82;
        n.x += Math.max(-6, Math.min(6, n.vx));
        n.y += Math.max(-6, Math.min(6, n.vy));
      }
      if (noeuds[0]) { noeuds[0].x *= 0.9; noeuds[0].y *= 0.9; } // le foyer reste au centre
    };

    if (reduit) for (let i = 0; i < 420; i += 1) pas(Infinity, 0);

    const dessiner = (t: number) => {
      const actifG = actifRef.current;
      const allume = reduit || t > CROISSANCE_MS;
      // Cadrage : la caméra recule à mesure que le réseau grandit (comme la référence)
      let minX = -60; let maxX = 60; let minY = -60; let maxY = 60;
      for (const i of nes) {
        const n = noeuds[i];
        minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
        minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y);
      }
      const cible = Math.min(2.4, (largeur * 0.9) / (maxX - minX + 40), (hauteur * 0.9) / (maxY - minY + 40));
      echelle += (cible - echelle) * (reduit ? 1 : 0.04);
      const cx = largeur / 2 - ((minX + maxX) / 2) * echelle;
      const cy = hauteur / 2 - ((minY + maxY) / 2) * echelle;
      const X = (n: Noeud) => cx + n.x * echelle;
      const Y = (n: Noeud) => cy + n.y * echelle;

      // Luminosité lissée : pendant la pousse tout est vif ; ensuite seule la formalité active
      for (const i of nes) {
        const n = noeuds[i];
        const cibleLum = !allume ? 0.55 : n.groupe === actifG ? 1 : n.groupe === -1 ? 0.7 : 0.12;
        n.lum += (cibleLum - n.lum) * (reduit ? 1 : 0.07);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, largeur, hauteur);

      ctx.lineCap = 'round';
      for (const fl of fils) {
        if (!nes.has(fl.a) || !nes.has(fl.b)) continue;
        const a = noeuds[fl.a];
        const b = noeuds[fl.b];
        const lum = fl.croise ? Math.min(a.lum, b.lum) * 0.6 : Math.min(a.lum, b.lum);
        const couleur = lum > 0.5 ? mix(VIOLET, ROSE, a.groupe >= 0 ? (a.groupe % 3) / 3 : 0) : ARDOISE;
        ctx.strokeStyle = rgba(couleur, 0.08 + lum * 0.55);
        ctx.lineWidth = lum > 0.5 ? 1.1 : 0.7;
        ctx.beginPath();
        ctx.moveTo(X(a), Y(a));
        ctx.lineTo(X(b), Y(b));
        ctx.stroke();
      }
      for (const i of nes) {
        const n = noeuds[i];
        const r = n.r * Math.max(0.85, Math.min(1.4, echelle)) * (n.hub && n.groupe === actifG && allume ? 1.35 : 1);
        const vif = n.lum > 0.5;
        ctx.fillStyle = vif
          ? rgba(mix(VIOLET, ROSE, n.hub ? 0.55 : (n.groupe % 3) / 3), 0.35 + n.lum * 0.65)
          : rgba(ARDOISE, 0.14 + n.lum * 0.5);
        ctx.beginPath();
        ctx.arc(X(n), Y(n), r, 0, Math.PI * 2);
        ctx.fill();
        if (n.hub && n.groupe === actifG && allume) {
          ctx.strokeStyle = rgba(ROSE, 0.22);
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(X(n), Y(n), r + 5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      if (noeuds[0]) {
        // Le foyer : Legaly, au centre du réseau
        const f = noeuds[0];
        const g = ctx.createRadialGradient(X(f) - 3, Y(f) - 3, 1, X(f), Y(f), 13);
        g.addColorStop(0, '#b9a3ff');
        g.addColorStop(1, '#7551e8');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(X(f), Y(f), 11, 0, Math.PI * 2);
        ctx.fill();
      }

      // La carte suit (doucement) la formalité allumée, du côté où il y a de la place
      const carte = carteRef.current;
      const h = noeuds[hubs[actifG]];
      if (carte && h && nes.has(hubs[actifG])) {
        const w = carte.offsetWidth;
        const hc = carte.offsetHeight;
        const hx = X(h);
        const hy = Y(h);
        // Vers l'extérieur du réseau : la carte se pose dans le vide, pas sur les grappes
        const fx = X(noeuds[0]);
        const fy = Y(noeuds[0]);
        const tx = hx >= fx ? hx + 30 : hx - w - 30;
        const ty0 = hy < fy ? hy - hc - 18 : hy + 18;
        const ty = Math.max(8, Math.min(hauteur - hc - 8, ty0));
        carteX += (Math.max(8, Math.min(largeur - w - 8, tx)) - carteX) * (carteX === 0 || reduit ? 1 : 0.08);
        carteY += (ty - carteY) * (carteY === 0 || reduit ? 1 : 0.08);
        carte.style.transform = `translate3d(${carteX}px, ${carteY}px, 0)`;
      }
    };

    const boucle = (maintenant: number) => {
      image = requestAnimationFrame(boucle);
      if (!enVue) return;
      if (debut < 0) debut = maintenant;
      const t = maintenant - debut;
      if (!reduit) pas(t, 1);
      dessiner(t);
      if (!pousse && t > CROISSANCE_MS) {
        pousse = true;
        setVisible(true);
      }
    };
    image = requestAnimationFrame(boucle);

    // Hors de l'écran : plus aucun calcul
    const io = new IntersectionObserver(([e]) => { enVue = e.isIntersecting; }, { threshold: 0.15 });
    io.observe(zone);

    // Survol : la formalité la plus proche s'allume et la rotation s'arrête
    const survol = (ev: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = ev.clientX - rect.left;
      const my = ev.clientY - rect.top;
      const cxv = largeur / 2;
      const cyv = hauteur / 2;
      // Positions écran recalculées comme dans dessiner()
      let minX = -60; let maxX = 60; let minY = -60; let maxY = 60;
      for (const i of nes) { const n = noeuds[i]; minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x); minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y); }
      const ox = cxv - ((minX + maxX) / 2) * echelle;
      const oy = cyv - ((minY + maxY) / 2) * echelle;
      let meilleur = -1;
      let dMin = 34 * 34;
      hubs.forEach((hi, g) => {
        const n = noeuds[hi];
        const dx = ox + n.x * echelle - mx;
        const dy = oy + n.y * echelle - my;
        const d = dx * dx + dy * dy;
        if (d < dMin) { dMin = d; meilleur = g; }
      });
      if (meilleur >= 0) {
        canvas.style.cursor = 'pointer';
        if (meilleur !== actifRef.current) setActif(meilleur);
        if (!figeRef.current) setFige(true);
        setVisible(true);
      } else {
        canvas.style.cursor = 'default';
      }
    };
    const quitter = () => setFige(false);
    canvas.addEventListener('mousemove', survol);
    canvas.addEventListener('mouseleave', quitter);

    return () => {
      cancelAnimationFrame(image);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener('mousemove', survol);
      canvas.removeEventListener('mouseleave', quitter);
    };
  }, [formalites.length]);

  const courante = formalites[actif];

  return (
    <section id="fonctionnalites" className="fc-section">
      <Container className="relative">
        <h2 className="fc-titre">{titre}</h2>
        <p className="fc-soustitre">{sousTitre}</p>

        <div ref={zoneRef} className="fc-zone">
          <canvas ref={canvasRef} className="fc-canvas" aria-hidden="true" />
          <div ref={carteRef} className={`fc-carte${visible ? ' fc-carte--visible' : ''}`} aria-live="polite">
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

        {/* La même information en liste : affichée sous 1024 px, lue par les
            lecteurs d'écran au-dessus (le réseau est décoratif). */}
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
