'use client';

// Livre en points (écho au logo Legaly : pan vertical violet, pages rose → pêche)
// qui s'ouvre puis feuillette lentement en 3D — à la manière des sphères de points
// animées. Canvas 2D, projection perspective, aucune dépendance.

import { useEffect, useRef } from 'react';

type RGB = [number, number, number];
const VIOLET_TOP: RGB = [157, 108, 242];
const VIOLET_BOTTOM: RGB = [59, 26, 143];
const PINK: RGB = [255, 95, 158];
const PEACH: RGB = [255, 173, 122];

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

const PAGES = 9; // couverture gauche + feuillets + couverture droite
const COLS = 16; // points dans la largeur d'une page
const ROWS = 20; // points dans la hauteur
const OPEN_MS = 2600;
const FLIP_MS = 2400;
const PAUSE_MS = 900;

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

    // Angle de chaque page autour du dos (axe vertical) : 0 = à droite, π = à gauche.
    function pageAngles(t: number): number[] {
      const open = reduced ? 1 : ease(clamp(t / OPEN_MS));
      const closed = Math.PI * 0.5; // livre fermé, debout
      const left = Math.PI * 0.985;
      const right = Math.PI * 0.015;
      const angles: number[] = [];
      const mid = Math.floor((PAGES - 1) / 2);
      const spread = Math.PI * 0.012;
      for (let i = 0; i < PAGES; i++) {
        // moitié des feuillets empilée à gauche, l'autre à droite
        const fanned = i <= mid ? left - i * spread : right + (PAGES - 1 - i) * spread;
        angles.push(closed + (fanned - closed) * open);
      }
      // Feuilletage : la page du dessus de la pile de droite passe à gauche, en boucle
      if (!reduced && t > OPEN_MS) {
        const cycle = (t - OPEN_MS) % (FLIP_MS + PAUSE_MS);
        const p = ease(clamp(cycle / FLIP_MS));
        const flipper = mid + 1;
        const target = left - (mid + 0.6) * spread;
        angles[flipper] = angles[flipper] + (target - angles[flipper]) * p;
      }
      return angles;
    }

    function draw(now: number) {
      raf = requestAnimationFrame(draw);
      if (!visible) return;
      const t = now - start;
      const { width: w, height: h } = canvas!.getBoundingClientRect();
      ctx!.clearRect(0, 0, w, h);

      const size = Math.min(w * 0.95, h * 1.7);
      const pageW = size * 0.4;
      const pageH = size * 0.5;
      const yaw = reduced ? 0.18 : Math.sin(t / 6000) * 0.28; // rotation lente
      const pitch = 0.95; // vu d'en haut, comme un livre posé sur une table (z+ = vers le haut à l'écran)
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const focal = size * 1.9;
      const angles = pageAngles(t);

      const dots: { x: number; y: number; z: number; c: RGB; r: number }[] = [];
      angles.forEach((a, i) => {
        const cover = i === 0 || i === PAGES - 1;
        const k = i / (PAGES - 1);
        for (let col = 0; col <= COLS; col++) {
          const u = col / COLS; // 0 au dos → 1 au bord
          // Légère courbure des feuillets près du dos
          const bend = cover ? 0 : Math.sin(Math.min(1, u * 1.6) * Math.PI * 0.5) * (1 - u) * 0.22 * pageW;
          for (let row = 0; row <= ROWS; row++) {
            const v = row / ROWS;
            const edge = col === COLS || row === 0 || row === ROWS || col === 0;
            if (!cover && !edge && (col + row) % 2 === 1) continue; // feuillets plus aérés
            const r0 = u * pageW;
            // Page dans le plan (x, z) autour du dos ; le bombé soulève la page près du dos
            let x = Math.cos(a) * r0;
            let z = Math.sin(a) * r0 + bend;
            let y = (v - 0.5) * pageH;
            // Rotation (lacet puis tangage)
            const x1 = x * cy + z * sy;
            const z1 = -x * sy + z * cy;
            const y1 = y * cp - z1 * sp;
            const z2 = y * sp + z1 * cp;
            x = x1; y = y1; z = z2;
            const s = focal / (focal + z + size * 0.6);
            // Couleur : côté gauche violet (comme le pan vertical du logo), droit rose → pêche
            const left = a > Math.PI / 2;
            const c = left ? mix(VIOLET_TOP, VIOLET_BOTTOM, v) : mix(PINK, PEACH, clamp(u * 0.8 + (1 - k) * 0.2));
            dots.push({ x: w * 0.5 + x * s, y: h * 0.56 + y * s, z, c, r: (cover ? 1.55 : edge ? 1.35 : 1.1) * s });
          }
        }
      });

      // Du plus lointain au plus proche
      dots.sort((p, q) => q.z - p.z);
      for (const d of dots) {
        const depth = clamp(0.35 + (size * 0.5 - d.z) / size, 0.18, 1);
        ctx!.fillStyle = `rgba(${d.c[0] | 0},${d.c[1] | 0},${d.c[2] | 0},${depth})`;
        ctx!.beginPath();
        ctx!.arc(d.x, d.y, Math.max(0.6, d.r), 0, Math.PI * 2);
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
