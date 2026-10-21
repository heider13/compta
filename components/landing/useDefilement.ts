'use client';

// Défilement continu d'une rangée de cartes (doublées pour boucler sans couture),
// animé par le navigateur (transform, carte graphique) : fluide à toute fréquence
// d'images. Au survol, la vitesse descend en douceur au lieu de s'arrêter net,
// puis remonte quand la souris s'en va. Figé si l'animation est réduite.

import { useEffect, useRef } from 'react';

export function useDefilement<T extends HTMLElement>(dureeSecondes: number, vitesseSurvol = 0.3) {
  const piste = useRef<T>(null);
  const anim = useRef<Animation | null>(null);
  const cible = useRef(1);

  useEffect(() => {
    const el = piste.current;
    if (!el || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const a = el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-50%)' }], {
      duration: dureeSecondes * 1000,
      iterations: Infinity,
      easing: 'linear',
    });
    anim.current = a;

    // Rapproche la vitesse de la cible à chaque image (transition douce)
    // (constante de temps 0,25 s : même douceur quelle que soit la fréquence d'images)
    let id = 0;
    let avant = performance.now();
    const lisser = (now: number) => {
      const dt = Math.min(0.5, (now - avant) / 1000);
      avant = now;
      const v = a.playbackRate;
      const suivant = v + (cible.current - v) * (1 - Math.exp(-dt / 0.25));
      if (Math.abs(suivant - v) > 0.001) a.playbackRate = suivant;
      id = requestAnimationFrame(lisser);
    };
    id = requestAnimationFrame(lisser);

    // Pause hors écran
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? a.play() : a.pause()));
    io.observe(el);
    return () => {
      cancelAnimationFrame(id);
      io.disconnect();
      a.cancel();
    };
  }, [dureeSecondes]);

  const survol = {
    onMouseEnter: () => { cible.current = vitesseSurvol; },
    onMouseLeave: () => { cible.current = 1; },
  };
  return { piste, survol };
}
