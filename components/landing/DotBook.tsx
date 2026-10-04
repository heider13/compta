'use client';

// Livre en points (écho au logo Legaly : pages de gauche violettes, de droite
// rose → pêche) posé à plat sur une table, vu de face et légèrement du dessus.
// Il s'ouvre (couverture et pages basculent vers la gauche) puis feuillette en
// boucle. Canvas 2D, projection perspective, aucune dépendance.

import { useEffect, useRef } from 'react';

type RGB = [number, number, number];
const VIOLET_LIGHT: RGB = [157, 108, 242];
const VIOLET_DEEP: RGB = [59, 26, 143];
const PINK: RGB = [255, 95, 158];
const PEACH: RGB = [255, 173, 122];

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

const PAGES = 9; // couverture gauche, feuillets, couverture droite (index 0 = couverture qui s'ouvre)
const COLS = 24; // points dans la largeur d'une page (du dos vers le bord)
const ROWS = 32; // points dans la longueur (le long du dos)
const OPEN_DELAY = 400;
const OPEN_MS = 2800;
const FLIP_MS = 2200;
const PAUSE_MS = 1100;
const TILT = 0.92; // inclinaison de la caméra (rad) : vue de face, du dessus

export function DotBook({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let visible = true;
    const start = performance.now();

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

    // Angle de chaque page autour du dos : 0 = à plat à droite, π = à plat à gauche.
    const mid = Math.floor((PAGES - 1) / 2);
    const LEFT = Math.PI - 0.02;
    const RIGHT = 0.02;
    const STEP = 0.012; // écart entre feuillets d'une même pile
    function pageAngles(t: number): number[] {
      const angles: number[] = [];
      for (let i = 0; i < PAGES; i++) {
        const closed = RIGHT + (PAGES - 1 - i) * STEP * 0.6; // livre fermé : tout empilé à droite
        const open = i <= mid ? LEFT - i * STEP : RIGHT + (PAGES - 1 - i) * STEP;
        // ouverture échelonnée : la couverture d'abord, puis les feuillets de gauche
        const local = reduced ? 1 : ease(clamp((t - OPEN_DELAY - i * 120) / OPEN_MS));
        angles.push(i <= mid ? closed + (open - closed) * local : open);
      }
      // Feuilletage : la page du dessus de la pile de droite passe à gauche, en boucle
      const flipStart = OPEN_DELAY + OPEN_MS + mid * 120 + 600;
      if (!reduced && t > flipStart) {
        const cycle = (t - flipStart) % (FLIP_MS + PAUSE_MS);
        const p = ease(clamp(cycle / FLIP_MS));
        const f = mid + 1;
        angles[f] = angles[f] + (LEFT - (mid + 0.5) * STEP - angles[f]) * p;
      }
      return angles;
    }

    function draw(now: number) {
      raf = requestAnimationFrame(draw);
      if (!visible) return;
      const t = now - start;
      const { width: w, height: h } = canvas!.getBoundingClientRect();
      ctx!.clearRect(0, 0, w, h);

      const size = Math.min(w * 0.62, h * 1.25);
      const pageW = size * 0.5; // du dos au bord
      const pageL = size * 0.74; // le long du dos
      const yaw = reduced ? 0.12 : Math.sin(t / 7000) * 0.16; // légère rotation sur la table
      const cyw = Math.cos(yaw), syw = Math.sin(yaw);
      const ct = Math.cos(TILT), st = Math.sin(TILT);
      const focal = size * 2.2;
      const angles = pageAngles(t);

      const dots: { x: number; y: number; d: number; c: RGB; r: number }[] = [];
      angles.forEach((a, i) => {
        const cover = i === 0 || i === PAGES - 1;
        const stackLift = (i <= mid ? i : PAGES - 1 - i) * size * 0.004; // épaisseur des piles
        for (let col = 0; col <= COLS; col++) {
          const u = col / COLS; // 0 au dos → 1 au bord
          // Les feuillets se bombent près du dos, comme un vrai livre ouvert
          const bend = cover ? 0 : Math.sin(Math.min(1, u * 1.8) * Math.PI * 0.5) * (1 - u) * 0.16 * pageW;
          for (let row = 0; row <= ROWS; row++) {
            const v = row / ROWS;
            const edge = col === COLS || row === 0 || row === ROWS;
            if (!cover && !edge && (col + row) % 2 === 1) continue; // feuillets plus aérés
            // Monde : X vers la droite, Y vers le haut (au-dessus de la table), Z le long du dos (vers le fond)
            const r = u * pageW;
            let X = Math.cos(a) * r;
            const Y = Math.sin(a) * r + bend * Math.abs(Math.cos(a)) + stackLift;
            let Z = (v - 0.5) * pageL;
            // Rotation du livre sur la table (autour de Y)
            const X1 = X * cyw + Z * syw;
            Z = -X * syw + Z * cyw;
            X = X1;
            // Caméra de face, inclinée vers le bas
            const yc = Y * ct + Z * st; // vers le haut de l'écran
            const zc = Z * ct - Y * st; // profondeur
            const s = focal / (focal + zc + size * 0.4);
            const left = a > Math.PI / 2;
            const c = left
              ? mix(VIOLET_LIGHT, VIOLET_DEEP, clamp(0.25 + v * 0.75 - u * 0.15))
              : mix(PINK, PEACH, clamp(u * 0.85 + v * 0.15));
            dots.push({ x: w * 0.5 + X * s, y: h * 0.5 - yc * s, d: zc, c, r: (cover ? 1.7 : edge ? 1.5 : 1.25) * s });
          }
        }
      });

      // Du plus lointain au plus proche
      dots.sort((p, q) => q.d - p.d);
      for (const d of dots) {
        const alpha = clamp(0.95 - (d.d / size) * 0.55, 0.25, 1);
        ctx!.fillStyle = `rgba(${d.c[0] | 0},${d.c[1] | 0},${d.c[2] | 0},${alpha})`;
        ctx!.beginPath();
        ctx!.arc(d.x, d.y, Math.max(0.7, d.r), 0, Math.PI * 2);
        ctx!.fill();
      }
      if (reduced) cancelAnimationFrame(raf);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
