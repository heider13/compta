'use client';

// « Toutes vos formalités, au même endroit » — le cabinet qui se construit, en quatre temps.
//
// Même mécanique que la section « mémoire » de wellapp.ai, sur fond clair :
// - quatre étapes (Jour 1 → Mois 6) qui avancent seules, barre de progression sous
//   l'onglet actif, cliquables ;
// - un réseau en 3D, disposé sur une sphère et vu en perspective : il tourne
//   lentement, les points du fond sont plus petits et plus pâles. Au Mois 6, c'est
//   un globe ;
// - à chaque étape, les nouveaux nœuds apparaissent sur place, allumés, puis tout
//   repasse en retrait ; la rotation amène l'élément mis en avant face au visiteur,
//   il s'allume avec ses liens et sa carte apparaît à côté ;
// - la caméra recule à mesure que le réseau grandit.
//
// Structure : le cabinet au centre ; ses connexions (Guichet unique, RNE, journaux,
// signature) ; ses clients répartis sur le globe, chacun avec ses dossiers et leurs
// pièces en grappe à sa surface ; les groupes de sociétés qui relient des clients.
// Canvas 2D, projection faite à la main : aucune dépendance.

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

const DUREE_ETAPE = [6400, 6800, 7200, 9000];
const POUSSE_MS = 1600; // nouveaux nœuds allumés, le temps que la rotation amène l'élément mis en avant
const R = 300; // rayon du globe final (unités du monde)
const VITESSE = 0.000075; // rotation propre, rad/ms (un tour en ~84 s)
const INCLINAISON = 0.32; // le globe est vu légèrement du dessus
const AZIMUT_FOCUS = 0.55; // où la rotation amène l'élément mis en avant (devant, à droite)

const VIOLET = [117, 81, 232] as const;
const ROSE = [234, 66, 253] as const;
const ARDOISE = [38, 34, 58] as const;

type Noeud = { x: number; y: number; z: number; r: number; etape: number; parent: number; ordre: number; phase: number };
type Fil = { a: number; b: number };

function semis(graine: number) {
  let etat = graine;
  return () => {
    etat = (etat * 1664525 + 1013904223) % 4294967296;
    return etat / 4294967296;
  };
}

type V = [number, number, number];
const norme = (v: V): V => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

/** Points répartis régulièrement sur la sphère (spirale de Fibonacci). */
function fibonacci(n: number): V[] {
  const out: V[] = [];
  const or = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i += 1) {
    const y = 1 - ((i + 0.5) / n) * 2;
    const r = Math.sqrt(1 - y * y);
    out.push([Math.cos(or * i) * r, y * 0.92, Math.sin(or * i) * r]);
  }
  return out;
}

function construire() {
  const s = semis(20261105);
  const noeuds: Noeud[] = [];
  const fils: Fil[] = [];
  const ajouter = (etape: number, parent: number, r: number, p: V) => {
    noeuds.push({ x: p[0], y: p[1], z: p[2], r, etape, parent, ordre: s(), phase: s() * Math.PI * 2 });
    const i = noeuds.length - 1;
    if (parent >= 0) fils.push({ a: parent, b: i });
    return i;
  };
  // Un point autour d'une direction : petit écart tangent, à une distance du centre donnée
  const autour = (d: V, ecart: number, rayon: number): V => {
    const v = norme([d[0] + (s() - 0.5) * ecart, d[1] + (s() - 0.5) * ecart, d[2] + (s() - 0.5) * ecart]);
    return [v[0] * rayon, v[1] * rayon, v[2] * rayon];
  };

  const cabinet = ajouter(0, -1, 13, [0, 0, 0]);
  // Les connexions du cabinet, près du centre
  const dirsSources: V[] = [norme([1, 0.15, 0.4]), norme([-0.9, -0.2, 0.5]), norme([0.2, 0.9, -0.4]), norme([-0.1, -0.85, -0.5])];
  const sources = dirsSources.map((d, i) => ajouter(0, cabinet, [10, 8, 7, 7][i], [d[0] * R * 0.42, d[1] * R * 0.42, d[2] * R * 0.42]));
  const guichet = sources[0];

  // Les clients, répartis sur le globe ; ceux du Jour 1 bien espacés (un sur six)
  const nbClients = 54;
  const dirs = fibonacci(nbClients);
  const etapeClient = dirs.map((_, i) => (i % 6 === 0 ? 0 : i % 6 === 3 ? 2 : i % 2 === 0 ? 2 : 3));
  // Garder quelques clients au Semaine 1 : on en promeut deux du Mois 1
  const clients = dirs.map((d, i) => ajouter(etapeClient[i], cabinet, 5 + s() * 3.5, [d[0] * R * (0.66 + s() * 0.12), d[1] * R * (0.66 + s() * 0.12), d[2] * R * (0.66 + s() * 0.12)]));

  const dossier = (client: number, etape: number, nbPieces: number) => {
    const c = noeuds[client];
    const d = norme([c.x, c.y, c.z]);
    const dos = ajouter(etape, client, 3.2 + s() * 2, autour(d, 0.34, R * (0.84 + s() * 0.1)));
    const dd = norme([noeuds[dos].x, noeuds[dos].y, noeuds[dos].z]);
    for (let p = 0; p < nbPieces; p += 1) ajouter(etape, dos, 1.7 + s() * 1.6, autour(dd, 0.16, R * (0.93 + s() * 0.1)));
    // Un dossier sur deux passe par une connexion (dépôt, annonce, signature)
    if (s() < 0.5) fils.push({ a: dos, b: sources[Math.floor(s() * sources.length)] });
    return dos;
  };

  const premiers = clients.filter((_, i) => etapeClient[i] === 0);
  // Semaine 1 : les premiers dossiers des premiers clients, dont la SAS mise en avant
  const sas = dossier(premiers[1], 1, 4);
  for (const c of premiers) { dossier(c, 1, 2 + Math.floor(s() * 2)); if (s() < 0.5) dossier(c, 1, 2); }
  // Mois 1 : les clients arrivés, leurs dossiers ; dont la régularisation mise en avant
  const mois1 = clients.filter((_, i) => etapeClient[i] === 2);
  const regul = dossier(mois1[3], 2, 5);
  fils.push({ a: regul, b: guichet });
  for (const c of [...premiers, ...mois1]) { dossier(c, 2, 2 + Math.floor(s() * 3)); if (s() < 0.4) dossier(c, 2, 3); }
  // Mois 6 : le cabinet entier, et les groupes de sociétés qui relient des clients
  for (const c of clients) { dossier(c, 3, 2 + Math.floor(s() * 4)); if (s() < 0.6) dossier(c, 3, 2 + Math.floor(s() * 3)); }
  const dirH = norme([0.55, 0.25, 0.8]);
  const holding = ajouter(3, cabinet, 8, [dirH[0] * R * 0.55, dirH[1] * R * 0.55, dirH[2] * R * 0.55]);
  // Ses filiales : les clients les plus proches de lui sur le globe
  const proches = clients
    .map((c) => ({ c, d: Math.hypot(noeuds[c].x - noeuds[holding].x, noeuds[c].y - noeuds[holding].y, noeuds[c].z - noeuds[holding].z) }))
    .sort((a, b) => a.d - b.d).slice(0, 6);
  for (const p of proches) fils.push({ a: holding, b: p.c });
  for (let i = 0; i < 5; i += 1) {
    const d = norme([s() - 0.5, s() - 0.5, s() - 0.5]);
    const h = ajouter(3, cabinet, 5.5, [d[0] * R * 0.55, d[1] * R * 0.55, d[2] * R * 0.55]);
    clients.map((c) => ({ c, d: Math.hypot(noeuds[c].x - noeuds[h].x, noeuds[c].y - noeuds[h].y, noeuds[c].z - noeuds[h].z) }))
      .sort((a, b) => a.d - b.d).slice(0, 3).forEach((p) => fils.push({ a: h, b: p.c }));
  }
  return { noeuds, fils, focus: [guichet, sas, regul, holding] };
}

const mix = (c1: readonly number[], c2: readonly number[], t: number) => c1.map((v, i) => Math.round(v + (c2[i] - v) * t));
const rgba = (c: readonly number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const doux = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - (1 - t) ** 3);
const angleProche = (de: number, vers: number) => vers + Math.round((de - vers) / (Math.PI * 2)) * Math.PI * 2;

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
    const apparition = new Float32Array(nb);
    const eclat = new Float32Array(nb);
    const sx = new Float32Array(nb);
    const sy = new Float32Array(nb);
    const sz = new Float32Array(nb); // profondeur : 0 au fond, 1 devant
    const sk = new Float32Array(nb); // facteur de perspective
    const ordre = Array.from({ length: nb }, (_, i) => i);
    let largeur = 0;
    let hauteur = 0;
    let dpr = 1;
    let echelle = 0;
    let courante = 0;
    let debutEtape = -1;
    let enVue = false;
    let image = 0;
    let carteX = 0;
    let carteY = 0;
    let carteMontree = false;
    let rotation = 0.4;
    let rotDepart = 0;
    let rotCible = 0;
    let dernier = -1;

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
    // Rayon du réseau présent à chaque étape : la caméra cadre dessus
    const rayons = ETAPES.map((_, e) => {
      let m = 60;
      for (const n of noeuds) if (n.etape <= e) m = Math.max(m, Math.hypot(n.x, n.y, n.z));
      return m;
    });

    const aller = (i: number, maintenant = performance.now()) => {
      courante = i;
      debutEtape = maintenant;
      carteMontree = false;
      setCarteVisible(false);
      setEtape(i);
      for (let k = 0; k < nb; k += 1) if (noeuds[k].etape === i) eclat[k] = 1;
      // Rotation qui amènera l'élément mis en avant devant, légèrement à droite
      const f = noeuds[focus[i]];
      rotDepart = rotation;
      rotCible = angleProche(rotation, AZIMUT_FOCUS - Math.atan2(f.x, f.z));
    };
    commande.current = (i) => aller(i);

    const dessiner = (maintenant: number, dt: number) => {
      const t = maintenant - debutEtape;
      const allumage = reduit || t > POUSSE_MS;
      const vis = voisins[courante];
      const f = focus[courante];

      // Rotation : glissement amorti vers l'élément mis en avant, puis rotation propre
      if (reduit) rotation = rotCible;
      else if (t < POUSSE_MS * 1.2) rotation = rotDepart + (rotCible - rotDepart) * doux(t / (POUSSE_MS * 1.2));
      else rotation += VITESSE * dt;

      for (let k = 0; k < nb; k += 1) {
        const n = noeuds[k];
        const present = n.etape <= courante;
        if (reduit) apparition[k] = present ? 1 : 0;
        else if (present && n.etape === courante) apparition[k] = Math.max(apparition[k], doux((t - n.ordre * 1000) / 600));
        else apparition[k] += ((present ? 1 : 0) - apparition[k]) * 0.07;
        if (allumage) eclat[k] += ((vis.has(k) ? 1 : 0) - eclat[k]) * (reduit ? 1 : 0.055);
      }

      // Caméra : cadre le réseau présent ; elle recule à chaque étape
      // La perspective grossit l'avant du globe : on garde une marge (÷ 1.18)
      const cible = (Math.min(largeur * 0.9, hauteur) * 0.46) / (rayons[courante] * 1.18);
      echelle += (cible - echelle) * (reduit || echelle === 0 ? 1 : 0.03);

      // Projection en perspective (rotation Y puis inclinaison X)
      const cr = Math.cos(rotation);
      const sr = Math.sin(rotation);
      const ci = Math.cos(INCLINAISON);
      const si = Math.sin(INCLINAISON);
      const D = R * 3.2;
      const souffle = reduit ? 0 : maintenant * 0.0005;
      for (let k = 0; k < nb; k += 1) {
        const n = noeuds[k];
        const ox = n.x + Math.sin(souffle + n.phase) * 2.5;
        const oy = n.y + Math.cos(souffle * 0.8 + n.phase) * 2.5;
        const x1 = ox * cr + n.z * sr;
        const z1 = -ox * sr + n.z * cr;
        const y2 = oy * ci - z1 * si;
        const z2 = oy * si + z1 * ci;
        const p = D / (D - z2);
        sk[k] = p;
        sx[k] = largeur / 2 + x1 * p * echelle;
        sy[k] = hauteur / 2 + y2 * p * echelle;
        sz[k] = Math.max(0, Math.min(1, (z2 / R + 1) / 2));
      }
      ordre.sort((a, b) => sz[a] - sz[b]); // du fond vers l'avant
      const taille = Math.max(0.8, Math.min(1.9, Math.sqrt(echelle * 1.6)));

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, largeur, hauteur);
      ctx.lineCap = 'round';

      // Fils : brouillard de profondeur ; ceux de l'élément allumé en couleur
      for (const fl of fils) {
        const ap = Math.min(apparition[fl.a], apparition[fl.b]);
        if (ap < 0.02) continue;
        const e = Math.min(eclat[fl.a], eclat[fl.b]);
        const prof = 0.25 + 0.75 * ((sz[fl.a] + sz[fl.b]) / 2);
        ctx.strokeStyle = rgba(mix(ARDOISE, mix(VIOLET, ROSE, 0.4), Math.min(1, e * 1.4)), (0.07 * prof + e * 0.6) * ap);
        ctx.lineWidth = 0.6 + e * 0.9;
        ctx.beginPath();
        ctx.moveTo(sx[fl.a], sy[fl.a]);
        ctx.lineTo(sx[fl.b], sy[fl.b]);
        ctx.stroke();
      }

      for (const k of ordre) {
        const ap = apparition[k];
        if (ap < 0.02) continue;
        const n = noeuds[k];
        const e = k === 0 ? 1 : eclat[k];
        const prof = 0.22 + 0.78 * sz[k];
        // En retrait, les points restent fins (la référence est un semis de petits points)
        const r = n.r * taille * sk[k] * (0.3 + 0.7 * ap) * (k === f && allumage ? 1.3 : 1) * (e > 0.35 ? 1 : 0.62 + 0.25 * e);
        const x = sx[k];
        const y = sy[k];
        if (e > 0.35) {
          // Nœud allumé : petite sphère en relief (reflet en haut à gauche)
          const c = k === 0 ? VIOLET : mix(VIOLET, ROSE, (k % 7) / 7);
          const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
          g.addColorStop(0, rgba(mix(c, [255, 255, 255], 0.55), ap));
          g.addColorStop(1, rgba(c, ap * Math.min(1, 0.4 + e)));
          ctx.fillStyle = g;
        } else {
          ctx.fillStyle = rgba(ARDOISE, (0.05 + 0.24 * prof + e * 0.5) * ap);
        }
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.6, r), 0, Math.PI * 2);
        ctx.fill();
      }
      if (allumage) {
        // Halo de l'élément mis en avant
        const r = noeuds[f].r * taille * sk[f] * 1.3;
        const g = ctx.createRadialGradient(sx[f], sy[f], r, sx[f], sy[f], r * 3.2);
        g.addColorStop(0, rgba(ROSE, 0.22 * eclat[f]));
        g.addColorStop(1, rgba(ROSE, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(sx[f], sy[f], r * 3.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Carte : à côté de l'élément mis en avant, du côté libre
      const carte = carteRef.current;
      if (carte && allumage) {
        const w = carte.offsetWidth;
        const hc = carte.offsetHeight;
        const tx = sx[f] >= largeur / 2 ? sx[f] + 30 : sx[f] - w - 30;
        const ty = sy[f] - hc * 0.5;
        const cx = Math.max(8, Math.min(largeur - w - 8, tx));
        const cy = Math.max(8, Math.min(hauteur - hc - 8, ty));
        const premier = !carteMontree;
        carteX += (cx - carteX) * (premier ? 1 : 0.12);
        carteY += (cy - carteY) * (premier ? 1 : 0.12);
        carte.style.transform = `translate3d(${carteX}px, ${carteY}px, 0)`;
        if (premier) { carteMontree = true; setCarteEtape(courante); setCarteVisible(true); }
      }
    };

    const boucle = (maintenant: number) => {
      image = requestAnimationFrame(boucle);
      const dt = dernier < 0 ? 16 : Math.min(50, maintenant - dernier);
      dernier = maintenant;
      if (!enVue) return;
      if (debutEtape < 0) aller(0, maintenant);
      if (!reduit && maintenant - debutEtape > DUREE_ETAPE[courante]) aller((courante + 1) % ETAPES.length, maintenant);
      dessiner(maintenant, dt);
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
