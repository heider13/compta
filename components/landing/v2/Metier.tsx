// Sections propres aux pages métier : défis → réponses (cartes colorées) et
// parcours en quatre étapes.

import { ArrowRight } from 'lucide-react';
import type { Defi } from '@/lib/landing/metiers';
import { Container } from '../ui';
import { Degrade, Halos, teinte } from './Couleurs';

export function Defis({ titre, items }: { titre: [string, string]; items: Defi[] }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#fff8f3] via-[#fff3fa] to-[#fff8f3] py-20 sm:py-24">
      <Halos />
      <Container className="relative">
        <h2 className="text-center font-[Sora] !text-[clamp(1.75rem,3.4vw,2.6rem)] !font-semibold !text-[var(--violet-900)]">
          {titre[0]} <Degrade>{titre[1]}</Degrade>
        </h2>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {items.map((d, i) => {
            const t = teinte(i);
            return (
              <article
                key={d.defi}
                className="group relative overflow-hidden rounded-3xl border border-white bg-white p-6 shadow-[0_8px_24px_rgba(54,31,171,0.08)] transition-all duration-200 hover:-translate-y-1 sm:p-7"

              >
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5" style={{ background: t.fort }} />
                <p className="font-mono !text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.texte }}>Avant</p>
                <h3 className="!mt-1 font-[Sora] !text-lg !font-semibold !leading-snug !text-[var(--violet-900)]">{d.defi}</h3>
                <div className="mt-4 flex items-start gap-3 rounded-2xl p-4" style={{ background: t.fond }}>
                  <ArrowRight className="mt-0.5 size-4 shrink-0" style={{ color: t.texte }} />
                  <p className="!text-[14px] !leading-relaxed !text-[var(--ink-700)]">{d.reponse}</p>
                </div>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

export function Parcours({ titre, etapes }: { titre: [string, string]; etapes: string[] }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#fff5fb] to-[#f7f3ff] py-20 sm:py-24">
      <Container className="relative">
        <h2 className="text-center font-[Sora] !text-[clamp(1.75rem,3.4vw,2.6rem)] !font-semibold !text-[var(--violet-900)]">
          {titre[0]} <Degrade>{titre[1]}</Degrade>
        </h2>
        <ol className="relative mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <span aria-hidden="true" className="absolute left-0 right-0 top-7 hidden h-0.5 lg:block" style={{ background: 'linear-gradient(90deg, #ffbe8c, #ff887b, #ea42fd, #7551e8)' }} />
          {etapes.map((e, i) => {
            const t = teinte(i + 3);
            return (
              <li key={e} className="relative rounded-3xl border border-white bg-white p-6 shadow-[0_8px_24px_rgba(54,31,171,0.08)]">
                <span
                  className="grid size-14 place-items-center rounded-2xl border border-[var(--violet-900)]/80 font-[Sora] text-xl font-bold !text-white shadow-[3px_3px_0_rgba(8,3,49,0.85)]"
                  style={{ background: t.fort }}
                >
                  {i + 1}
                </span>
                <p className="!mt-5 text-[15px] font-medium !leading-snug !text-[var(--violet-900)]">{e}</p>
              </li>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}
