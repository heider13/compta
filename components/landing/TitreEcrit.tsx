'use client';

// Titre qui s'écrit lettre à lettre quand il arrive à l'écran, la fin en dégradé
// Legaly. Le texte complet est en place dès le départ (lettres pas encore écrites
// transparentes) : aucune ligne ne saute pendant l'écriture.

import { useEffect, useRef, useState } from 'react';

const MS_PAR_LETTRE = 38;

export function TitreEcrit({ debut, fin, className }: { debut: string; fin: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const total = debut.length + 1 + fin.length;
  const [n, setN] = useState(0);
  const [curseur, setCurseur] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(total); setCurseur(false); return; }
    let minuteur: number | undefined;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      minuteur = window.setInterval(() => {
        const k = Math.min(total, Math.floor((performance.now() - t0) / MS_PAR_LETTRE));
        setN(k);
        if (k >= total) {
          window.clearInterval(minuteur);
          minuteur = window.setTimeout(() => setCurseur(false), 1600);
        }
      }, 30);
    }, { threshold: 0.6 });
    io.observe(el);
    return () => { io.disconnect(); window.clearInterval(minuteur); window.clearTimeout(minuteur); };
  }, [total]);

  const nFin = Math.max(0, n - debut.length - 1);
  const caret = curseur && (
    <span aria-hidden="true" className="relative inline-block h-[0.82em] w-[3px] -mr-[3px] translate-y-[0.08em] animate-[titre-caret_1s_steps(1)_infinite] rounded-full bg-[#ea42fd]" />
  );

  return (
    <h2 ref={ref} className={className}>
      <span className="sr-only">{debut} {fin}</span>
      <span aria-hidden="true">
        {debut.slice(0, n)}
        {n <= debut.length && caret}
        <span className="opacity-0">{debut.slice(n)}</span>{' '}
        {/* Seule la partie écrite porte le dégradé (le fond découpé suivrait aussi les lettres masquées) */}
        <span className="bg-gradient-to-r from-[#ff887b] via-[#ea42fd] to-[#7551e8] bg-clip-text text-transparent">{fin.slice(0, nFin)}</span>
        {n > debut.length && caret}
        <span className="opacity-0">{fin.slice(nFin)}</span>
      </span>
      <style>{`@keyframes titre-caret { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`}</style>
    </h2>
  );
}
