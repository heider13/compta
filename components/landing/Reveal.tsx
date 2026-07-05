'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// Reveal au scroll (façon Brevo) : le contenu apparaît en fondu + glissement
// quand il entre dans le viewport. `delay` échelonne les cartes d'une grille.
export function Reveal({
  children,
  className,
  delay = 0,
  as: As = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: React.ElementType;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <As
      ref={ref}
      className={cn('bp-reveal', shown && 'is-in', className)}
      style={{ ['--bp-delay' as string]: `${delay}ms` }}
    >
      {children}
    </As>
  );
}
