'use client';

// « Toutes vos formalités, au même endroit » — le cabinet qui se construit, en quatre temps.
//
// Même mécanique que la section « mémoire » de wellapp.ai, sur fond clair :
// - quatre étapes (Jour 1 → Mois 6) qui avancent seules, une barre de progression
//   sous l'onglet actif, cliquables ;
// - à chaque étape, de nouveaux nœuds APPARAISSENT SUR PLACE (ils grandissent, rien
//   n'explose) : la structure est calculée une fois pour toutes, puis tout respire à
//   peine ;
// - les nouveaux arrivent allumés, puis tout repasse en retrait et UN élément
//   s'allume avec ses liens, sa carte à côté ;
// - la caméra recule à mesure que le réseau grandit : une étoile au Jour 1, des
//   grappes ensuite, le cabinet entier au Mois 6.
//
// Structure : le cabinet au centre ; ses connexions (Guichet unique, RNE, journaux,
// signature) ; ses clients, chacun avec ses dossiers et leurs pièces ; puis les
// groupes de sociétés qui relient plusieurs clients. Canvas 2D, sans dépendance.

import { useEffect, useRef, useState } from 'react';

import { Container } from '../ui';

type Carte = { titre: string; etat: string; texte: string; badges: string[] };
type Etape = { label: string; texte: string; carte: Carte };

const ETAPES: Etape[] = [
  {
    label: 'Jour 1',
    texte: 'Votre Guichet unique, le registre, vos premiers clients.',
    carte: { titre: 'Guichet unique INPI', etat: 'Connecté à votre compte', texte: 'Les formalités préparées par l’agent arrivent en brouillon sur votre compte.', badges: ['Brouillons', 'Suivi des statuts'] },
  },
  {
    label: 'Semaine 1',
    texte: 'Créations, modifications, annonces : les premiers dossiers avancent.',
    carte: { titre: 'Création d’une SAS', etat: 'Dossier en préparation', texte: 'Statuts, déclaration de non-condamnation, pouvoir et annonce légale rédigés.', badges: ['4 actes', '1 annonce'] },
  },
  {
    label: 'Mois 1',
    texte: 'Signatures, paiements, régularisations : chaque dossier suit son parcours.',
    carte: { titre: 'Régularisation du greffe', etat: 'Demande reçue', texte: 'La demande est lue, la réponse et les pièces manquantes sont préparées.', badges: ['Réponse rédigée', 'Pièces listées'] },
  },
  {
    label: 'Mois 6',
    texte: 'Chaque client, chaque société, chaque échéance, reliés.',
    carte: { titre: 'Groupe de sociétés', etat: 'Holding et filiales', texte: 'Une modification lancée sur toutes les filiales, les comptes annuels suivis pour chacune.', badges: ['Filiales reliées', 'Échéances'] },
  },
];

const DUREE_ETAPE = [6200, 6500, 6800, 8200];
const POUSSE_MS = 1500; // nouveaux nœuds allumés, avant que l'élément mis en avant s'allume

const VIOLET = [117, 81, 232] as const;
const ROSE = [234, 66, 253] as const;
const ARDOISE = [38, 34, 58] as const;

type Noeud = { x: number; y: number; r: number; etape: number; parent: number; ordre: number; phase: number };
type Fil = { a: number; b: number; l: number; k: number };

function semis(graine: number) {
  let etat = graine;
  return () => {
    etat = (etat * 1664525 + 1013904223) % 4294967296;
    return etat / 4294967296;
  };
}

/** Le réseau complet (les quatre étapes) et sa disposition finale, calculée une fois. */
function construire() {
  const s = semis(20261105);
  const noeuds: Noeud[] = [];
  const fils: Fil[] = [];
  const ajouter = (etape: number, parent: number, r: number, l: number, k = 0.04) => {
    const p = noeuds[parent];
    const a = s() * Math.PI * 2;
    noeuds.push({ x: p ? p.x + Math.cos(a) * l : 0, y: p ? p.y + Math.sin(a) * l * 0.6 : 0, r, etape, parent, ordre: s(), phase: s() * Math.PI * 2 });
    const i = noeuds.length - 1;
    if (parent >= 0) fils.push({ a: parent, b: i, l, k });
    return i;
  };
  const lier = (a: number, b: number, l: number, k = 0.006) => fils.push({ a, b, l, k });

  const cabinet = ajouter(0, -1, 13, 0);
  // Jour 1 : les connexions du cabinet et ses premiers clients, en étoile
  const guichet = ajouter(0, cabinet, 9, 150);
  const rne = ajouter(0, cabinet, 7.5, 170);
  const journaux = ajouter(0, cabinet, 6.5, 190);
  const signature = ajouter(0, cabinet, 6.5, 175);
  const sources = [guichet, rne, journaux, signature];
  const clients: number[] = [];
  for (let i = 0; i < 8; i += 1) clients.push(ajouter(0, cabinet, 5 + s() * 3.5, 120 + s() * 120));

  // Un client et ses dossiers ; chaque dossier a ses pièces et passe par une connexion
  const dossiers = (client: number, etape: number, nb: number, pieces: [number, number]) => {
    const liste: number[] = [];
    for (let d = 0; d < nb; d += 1) {
      const dos = ajouter(etape, client, 3 + s() * 2, 30 + s() * 22, 0.05);
      liste.push(dos);
      const nbP = pieces[0] + Math.floor(s() * (pieces[1] - pieces[0] + 1));
      for (let p = 0; p < nbP; p += 1) ajouter(etape, dos, 1.8 + s() * 1.6, 13 + s() * 10, 0.06);
      if (s() < 0.55) lier(dos, sources[Math.floor(s() * sources.length)], 260, 0.0015);
    }
    return liste;
  };

  // Semaine 1 : les premiers dossiers des premiers clients — dont la SAS mise en avant
  const sas = dossiers(clients[2], 1, 1, [4, 4])[0];
  for (const c of clients) dossiers(c, 1, 1 + Math.floor(s() * 2), [1, 3]);

  // Mois 1 : nouveaux clients, signatures, régularisations — dont celle mise en avant
  const clientsM1: number[] = [];
  for (let i = 0; i < 9; i += 1) clientsM1.push(ajouter(2, cabinet, 4.5 + s() * 3, 160 + s() * 140));
  const regul = dossiers(clientsM1[4], 2, 1, [5, 5])[0];
  lier(regul, guichet, 230, 0.002);
  for (const c of [...clients, ...clientsM1]) dossiers(c, 2, 1 + Math.floor(s() * 2), [2, 4]);

  // Mois 6 : le cabinet entier, et les groupes de sociétés qui relient les clients
  const clientsM6: number[] = [];
  for (let i = 0; i < 18; i += 1) clientsM6.push(ajouter(3, cabinet, 4 + s() * 3, 220 + s() * 180));
  const tous = [...clients, ...clientsM1, ...clientsM6];
  for (const c of tous) dossiers(c, 3, 1 + Math.floor(s() * 3), [2, 5]);
  const holding = ajouter(3, cabinet, 8, 210);
  const filiales: number[] = [];
  for (let i = 0; i < 6; i += 1) {
    const f = tous[Math.floor(s() * tous.length)];
    if (!filiales.includes(f)) { filiales.push(f); lier(holding, f, 90, 0.01); }
  }
  for (let i = 0; i < 4; i += 1) {
    const h2 = ajouter(3, cabinet, 5.5, 260);
    for (let j = 0; j < 3; j += 1) lier(h2, tous[Math.floor(s() * tous.length)], 100, 0.008);
  }

  // Disposition : ressorts + répulsion, une seule fois au montage. Ensuite rien ne bouge
  // que la respiration : c'est ce qui donne une structure lisible au lieu d'un essaim.
  const n = noeuds.length;
  const vx = new Float32Array(n);
  const vy = new Float32Array(n);
  for (let it = 0; it < 260; it += 1) {
    const chaleur = 1 - it / 260;
    for (let i = 0; i < n; i += 1) {
      const a = noeuds[i];
      for (let j = i + 1; j < n; j += 1) {
        const b = noeuds[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy + 0.01;
        if (d2 > 40000) continue;
        const f = ((a.r + b.r) * 17) / d2;
        vx[i] += dx * f; vy[i] += dy * f;
        vx[j] -= dx * f; vy[j] -= dy * f;
      }
    }
    for (const fl of fils) {
      const a = noeuds[fl.a];
      const b = noeuds[fl.b];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const f = ((d - fl.l) * fl.k) / d;
      vx[fl.a] += dx * f; vy[fl.a] += dy * f;
      vx[fl.b] -= dx * f; vy[fl.b] -= dy * f;
    }
    for (let i = 1; i < n; i += 1) {
      const a = noeuds[i];
      // Rappel plus fort à la verticale : le réseau s'étale en largeur, comme la zone
      vx[i] = (vx[i] - a.x * 0.0012) * 0.6;
      vy[i] = (vy[i] - a.y * 0.0032) * 0.6;
      a.x += Math.max(-8, Math.min(8, vx[i])) * (0.4 + chaleur);
      a.y += Math.max(-8, Math.min(8, vy[i])) * (0.4 + chaleur);
    }
  }
  noeuds[0].x = 0;
  noeuds[0].y = 0;

  return { noeuds, fils, focus: [guichet, sas, regul, holding] };
}

const mix = (c1: readonly number[], c2: readonly number[], t: number) => c1.map((v, i) => Math.round(v + (c2[i] - v) * t));
const rgba = (c: readonly number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const doux = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - (1 - t) ** 3);

export function FormalitesConstellation({
  titre = 'Toutes vos formalités, au même endroit.',
  sousTitre = 'De la création à la radiation : l’agent prépare, vous validez et déposez. Et chaque dossier enrichit le suivant.',
}: { titre?: string; sousTitre?: string } = {}) {
  const [etape, setEtape] = useState(0);
  const [carteVisible, setCarteVisible] = useState(false);
  const [carteEtape, setCarteEtape] = useState(0);
  const zoneRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const carteRef = useRef<HTMLDivElement>(null);
  const barreRef = useRef<(HTMLSpanElement | null)[]>([]);
  const commande = useRef<((i: number) => void) | null>(null);

  useEffect(() => {
    const zone = zoneRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!zone || !canvas || !ctx) return;
    // Sous 1024 px la zone est masquée : rien à calculer
    if (!window.matchMedia('(min-width: 1024px)').matches) return;

    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const { noeuds, fils, focus } = construire();
    const nb = noeuds.length;
    // État animé par nœud : apparition (0 → 1) et éclat (allumé → en retrait)
    const apparition = new Float32Array(nb);
    const eclat = new Float32Array(nb);
    const px = new Float32Array(nb);
    const py = new Float32Array(nb);
    let largeur = 0;
    let hauteur = 0;
    let dpr = 1;
    let echelle = 0;
    let camX = 0;
    let camY = 0;
    let courante = 0;
    let debutEtape = -1;
    let enVue = false;
    let image = 0;
    let carteX = -1;
    let carteY = -1;
    let carteMontree = false;

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

    // Ce qui s'allume avec l'élément mis en avant : lui, ses enfants et leurs pièces, ses liens
    const voisins = focus.map((f) => {
      const set = new Set<number>([f]);
      for (let k = 0; k < 2; k += 1) for (const fl of fils) if (set.has(fl.a) && noeuds[fl.b].parent === fl.a) set.add(fl.b);
      for (const fl of fils) if (fl.a === f || fl.b === f) { set.add(fl.a); set.add(fl.b); }
      return set;
    });

    const aller = (i: number, maintenant = performance.now()) => {
      courante = i;
      debutEtape = maintenant;
      carteMontree = false;
      setCarteVisible(false);
      setEtape(i);
      // Les nouveaux arrivent allumés ; les étapes suivantes s'effacent en douceur
      for (let k = 0; k < nb; k += 1) if (noeuds[k].etape === i) eclat[k] = 1;
    };
    commande.current = (i) => aller(i);

    const dessiner = (maintenant: number) => {
      const t = maintenant - debutEtape;
      const allumage = reduit || t > POUSSE_MS;
      const vis = voisins[courante];

      for (let k = 0; k < nb; k += 1) {
        const n = noeuds[k];
        const present = n.etape <= courante;
        if (reduit) apparition[k] = present ? 1 : 0;
        else if (present && n.etape === courante) apparition[k] = Math.max(apparition[k], doux((t - n.ordre * 900) / 520));
        else apparition[k] += ((present ? 1 : 0) - apparition[k]) * 0.08;
        if (allumage) eclat[k] += ((vis.has(k) ? 1 : 0) - eclat[k]) * (reduit ? 1 : 0.06);
      }

      // Caméra : cadre les nœuds présents (elle recule à mesure que le réseau grandit)
      let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let maxY = -Infinity;
      for (let k = 0; k < nb; k += 1) {
        if (noeuds[k].etape > courante) continue;
        const n = noeuds[k];
        minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x); minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y);
      }
      const cible = Math.min(3, (largeur * 0.8) / (maxX - minX + 60), (hauteur * 0.84) / (maxY - minY + 60));
      const lissage = reduit || echelle === 0 ? 1 : 0.035;
      echelle += (cible - echelle) * lissage;
      camX += ((minX + maxX) / 2 - camX) * lissage;
      camY += ((minY + maxY) / 2 - camY) * lissage;
      const souffle = reduit ? 0 : maintenant * 0.0006;
      for (let k = 0; k < nb; k += 1) {
        const n = noeuds[k];
        px[k] = largeur / 2 + (n.x - camX + Math.sin(souffle + n.phase) * 2.2) * echelle;
        py[k] = hauteur / 2 + (n.y - camY + Math.cos(souffle * 0.8 + n.phase) * 1.8) * echelle;
      }
      const taille = Math.max(0.85, Math.min(2, echelle ** 0.5));
      const f = focus[courante];

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, largeur, hauteur);
      ctx.lineCap = 'round';
      for (const fl of fils) {
        const ap = Math.min(apparition[fl.a], apparition[fl.b]);
        if (ap < 0.02) continue;
        const e = Math.min(eclat[fl.a], eclat[fl.b]);
        const c = mix(ARDOISE, mix(VIOLET, ROSE, 0.35), Math.min(1, e * 1.4));
        ctx.strokeStyle = rgba(c, (0.1 + e * 0.6) * ap);
        ctx.lineWidth = 0.7 + e * 0.8;
        ctx.beginPath();
        ctx.moveTo(px[fl.a], py[fl.a]);
        ctx.lineTo(px[fl.b], py[fl.b]);
        ctx.stroke();
      }
      for (let k = 1; k < nb; k += 1) {
        const ap = apparition[k];
        if (ap < 0.02) continue;
        const n = noeuds[k];
        const e = eclat[k];
        const r = n.r * taille * (0.35 + 0.65 * ap) * (k === f && allumage ? 1.25 : 1);
        const c = mix(ARDOISE, mix(VIOLET, ROSE, (k % 5) / 5), Math.min(1, e * 1.3));
        ctx.fillStyle = rgba(c, (0.16 + e * 0.84) * ap);
        ctx.beginPath();
        ctx.arc(px[k], py[k], r, 0, Math.PI * 2);
        ctx.fill();
      }
      // Le cabinet, au centre : toujours en couleur
      ctx.fillStyle = rgba(VIOLET, apparition[0]);
      ctx.beginPath();
      ctx.arc(px[0], py[0], noeuds[0].r * taille, 0, Math.PI * 2);
      ctx.fill();
      if (allumage) {
        ctx.strokeStyle = rgba(ROSE, 0.2 * eclat[f]);
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(px[f], py[f], noeuds[f].r * taille * 1.25 + 6, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Carte : à côté de l'élément mis en avant, vers l'extérieur du réseau
      const carte = carteRef.current;
      if (carte && allumage) {
        const w = carte.offsetWidth;
        const hc = carte.offsetHeight;
        const tx = px[f] >= px[0] ? px[f] + 26 : px[f] - w - 26;
        const ty = py[f] < py[0] ? py[f] - hc - 14 : py[f] + 14;
        const cx = Math.max(8, Math.min(largeur - w - 8, tx));
        const cy = Math.max(8, Math.min(hauteur - hc - 8, ty));
        const premier = !carteMontree;
        carteX += (cx - carteX) * (premier ? 1 : 0.1);
        carteY += (cy - carteY) * (premier ? 1 : 0.1);
        carte.style.transform = `translate3d(${carteX}px, ${carteY}px, 0)`;
        if (!carteMontree) { carteMontree = true; setCarteEtape(courante); setCarteVisible(true); }
      }
    };

    const boucle = (maintenant: number) => {
      image = requestAnimationFrame(boucle);
      if (!enVue) return;
      if (debutEtape < 0) aller(0, maintenant);
      const t = maintenant - debutEtape;
      if (!reduit && t > DUREE_ETAPE[courante]) aller((courante + 1) % ETAPES.length, maintenant);
      dessiner(maintenant);
      // Barre de progression de l'onglet actif (écrite directement, sans rendu React)
      const p = reduit ? 1 : Math.min(1, (maintenant - debutEtape) / DUREE_ETAPE[courante]);
      barreRef.current.forEach((b, i) => { if (b) b.style.transform = `scaleX(${i === courante ? p : 0})`; });
    };
    image = requestAnimationFrame(boucle);

    // Hors écran : plus aucun calcul ; au retour, l'étape reprend où elle en était
    let pause = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting && enVue) pause = performance.now();
      if (e.isIntersecting && !enVue && pause && debutEtape >= 0) debutEtape += performance.now() - pause;
      enVue = e.isIntersecting;
    }, { threshold: 0.2 });
    io.observe(zone);

    return () => {
      cancelAnimationFrame(image);
      ro.disconnect();
      io.disconnect();
      commande.current = null;
    };
  }, []);

  const carte = ETAPES[carteEtape].carte;

  return (
    <section id="fonctionnalites" className="fc-section">
      <Container className="relative">
        <h2 className="fc-titre">{titre}</h2>
        <p className="fc-soustitre">{sousTitre}</p>

        <div ref={zoneRef} className="fc-zone">
          <canvas ref={canvasRef} className="fc-canvas" aria-hidden="true" />
          <div ref={carteRef} className={`fc-carte${carteVisible ? ' fc-carte--visible' : ''}`} aria-live="polite">
            <div key={carteEtape} className="fc-carte-inner">
              <div className="fc-carte-tete">
                <span className="fc-carte-pastille" aria-hidden="true" />
                <div>
                  <strong>{carte.titre}</strong>
                  <span>{carte.etat}</span>
                </div>
              </div>
              <p>{carte.texte}</p>
              <div className="fc-carte-badges">
                {carte.badges.map((b) => <span key={b} className="fc-carte-badge">{b}</span>)}
              </div>
            </div>
          </div>
        </div>

        <div className="fc-etapes" role="tablist" aria-label="Le cabinet au fil du temps">
          {ETAPES.map((e, i) => (
            <button
              key={e.label}
              type="button"
              role="tab"
              aria-selected={i === etape}
              className={`fc-etape${i === etape ? ' fc-etape--active' : ''}`}
              onClick={() => commande.current?.(i)}
            >
              <span className="fc-etape-piste" aria-hidden="true">
                <span ref={(el) => { barreRef.current[i] = el; }} className="fc-etape-barre" />
              </span>
              <span className="fc-etape-label">{e.label}</span>
              <span className="fc-etape-texte">{e.texte}</span>
            </button>
          ))}
        </div>
      </Container>
    </section>
  );
}
