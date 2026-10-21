'use client';

// Bascule clair / sombre (petit soleil comme light.inc), partagée par la landing
// et l'espace pro. Le choix est gardé dans le navigateur et appliqué avant
// l'affichage par le script du layout racine : attribut data-landing (landing)
// et classe .dark (espace pro, tokens de app/tailwind.css) sur <html>.

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

const EVENEMENT = 'legaly:theme';

export function useThemeSombre() {
  const [sombre, setSombre] = useState(false);
  useEffect(() => {
    const lire = () => setSombre(document.documentElement.dataset.landing === 'dark');
    lire();
    window.addEventListener(EVENEMENT, lire);
    return () => window.removeEventListener(EVENEMENT, lire);
  }, []);
  return sombre;
}

export function ThemeToggle({ className }: { className?: string }) {
  const sombre = useThemeSombre();
  function basculer() {
    const html = document.documentElement;
    const suivant = !sombre;
    html.classList.add('theme-transition');
    if (suivant) html.dataset.landing = 'dark';
    else delete html.dataset.landing;
    html.classList.toggle('dark', suivant);
    try {
      localStorage.setItem('legaly-theme', suivant ? 'dark' : 'light');
    } catch {}
    window.dispatchEvent(new Event(EVENEMENT));
    setTimeout(() => html.classList.remove('theme-transition'), 400);
  }
  return (
    <button
      type="button"
      onClick={basculer}
      aria-label={sombre ? 'Passer en mode clair' : 'Passer en mode sombre'}
      title={sombre ? 'Mode clair' : 'Mode sombre'}
      className={cn('grid size-9 shrink-0 place-items-center rounded-full border transition-colors', className)}
    >
      {sombre ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </button>
  );
}
