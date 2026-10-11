'use client';

// Signe infini en points (couleurs du logo : violet → magenta → corail → pêche) :
// un ruban en relief autour d'une lemniscate, dont les points circulent en continu
// le long de la boucle, avec une onde lumineuse et une lente rotation 3D.
// Canvas 2D, projection perspective, aucune dépendance.

import { useEffect, useRef } from 'react';

type RGB = [number, number, number];
const STOPS: RGB[] = [
  [117, 81, 232], // violet
  [234, 66, 253], // magenta
  [255, 136, 123], // corail
  [255, 190, 140], // pêche
  [117, 81, 232], // retour au violet (boucle)
];

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
function couleur(u: number): RGB {
  const x = ((u % 1) + 1) % 1 * (STOPS.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

const SEGMENTS = 220; // points le long de la boucle
const ANNEAU = 9; // points autour du ruban
const VITESSE = 0.00018; // circulation (tours par ms ≈ 1 tour / 35 s)

export function DotInfinity({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let visible = true;
    const debut = performance.now();

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(canvas);

    // Lemniscate de Bernoulli, légèrement vrillée en z pour que les deux brins se croisent sans se toucher
    const centre = (t: number, a: number): [number, number, number] => {
      const s = Math.sin(t), c = Math.cos(t), d = 1 + s * s;
      return [(a * c) / d, (a * s * c) / d, a * 0.18 * s];
    };

    function dessiner(now: number) {
      raf = requestAnimationFrame(dessiner);
      if (!visible) return;
      const t0 = reduit ? 0 : now - debut;
      const { width: w, height: h } = canvas!.getBoundingClientRect();
      ctx!.clearRect(0, 0, w, h);

      const taille = Math.min(w * 0.9, h * 2.3);
      const a = taille * 0.5;
      const rayon = taille * 0.045;
      const lacet = reduit ? 0.2 : Math.sin(t0 / 6500) * 0.38;
      const tangage = 0.55 + Math.sin(t0 / 9000) * 0.08;
      const cy = Math.cos(lacet), sy = Math.sin(lacet), cp = Math.cos(tangage), sp = Math.sin(tangage);
      const focale = taille * 2.4;
      const flux = t0 * VITESSE; // décalage de circulation (en tours)
      const tourne = t0 * 0.0006; // rotation du ruban sur lui-même

      const points: { x: number; y: number; z: number; c: RGB; r: number; al: number }[] = [];
      for (let i = 0; i < SEGMENTS; i++) {
        const u = i / SEGMENTS;
        const t = (u + flux) * Math.PI * 2;
        const P = centre(t, a);
        const P2 = centre(t + 0.01, a);
        // Repère local : tangente, normale, binormale
        let Tx = P2[0] - P[0], Ty = P2[1] - P[1], Tz = P2[2] - P[2];
        const Tl = Math.hypot(Tx, Ty, Tz) || 1;
        Tx /= Tl; Ty /= Tl; Tz /= Tl;
        let Nx = -Ty, Ny = Tx, Nz = 0; // perpendiculaire dans le plan
        const Nl = Math.hypot(Nx, Ny) || 1;
        Nx /= Nl; Ny /= Nl;
        const Bx = Ty * Nz - Tz * Ny, By = Tz * Nx - Tx * Nz, Bz = Tx * Ny - Ty * Nx;
        // Onde lumineuse qui fait le tour de la boucle
        const onde = Math.pow(0.5 + 0.5 * Math.cos((u - ((t0 * 0.00012) % 1)) * Math.PI * 2), 6);
        const base = couleur(u + flux);
        for (let k = 0; k < ANNEAU; k++) {
          const phi = (k / ANNEAU) * Math.PI * 2 + tourne + u * 6;
          const cs = Math.cos(phi), sn = Math.sin(phi);
          let X = P[0] + rayon * (cs * Nx + sn * Bx);
          let Y = P[1] + rayon * (cs * Ny + sn * By);
          let Z = P[2] + rayon * (cs * Nz + sn * Bz);
          // Rotation : lacet (autour de Y) puis tangage (autour de X)
          const X1 = X * cy + Z * sy;
          const Z1 = -X * sy + Z * cy;
          const Y1 = Y * cp - Z1 * sp;
          const Z2 = Y * sp + Z1 * cp;
          X = X1; Y = Y1; Z = Z2;
          const s = focale / (focale + Z + taille * 0.5);
          points.push({ x: w / 2 + X * s, y: h * 0.5 + Y * s, z: Z, c: base, r: (1.15 + onde * 0.9) * s, al: 0.35 + onde * 0.65 });
        }
      }

      points.sort((p, q) => q.z - p.z);
      for (const p of points) {
        const prof = clamp(0.95 - (p.z / taille) * 0.9, 0.25, 1);
        ctx!.fillStyle = `rgba(${p.c[0] | 0},${p.c[1] | 0},${p.c[2] | 0},${clamp(p.al * prof, 0.12, 1)})`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, Math.max(0.6, p.r), 0, Math.PI * 2);
        ctx!.fill();
      }
      if (reduit) cancelAnimationFrame(raf);
    }
    raf = requestAnimationFrame(dessiner);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
