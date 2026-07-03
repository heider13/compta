// Sélecteur de persona sur la home — 3 cartes vers les landing dédiées.

import Link from 'next/link';
import { Arrow } from '@/components/icons';
import { PERSONA_LIST } from '@/lib/landing/personas';
import { Container, SectionHead } from './ui';

export function PersonaSelector() {
  return (
    <section className="border-b border-[var(--ink-100)] py-20 sm:py-24">
      <Container>
        <SectionHead
          eyebrow="Conçu pour votre métier"
          title={
            <>
              Le même moteur.
              <br />
              Adapté à votre pratique.
            </>
          }
        />
        <div className="grid gap-5 md:grid-cols-3">
          {PERSONA_LIST.map((p) => (
            <Link
              key={p.slug}
              href={`/${p.slug}`}
              className="group flex flex-col rounded-2xl border border-[var(--ink-150)] bg-white p-7 no-underline transition-all duration-200 hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-[0_16px_40px_rgba(255,136,123,0.18)]"
            >
              <h3 className="font-[Sora] text-xl font-semibold text-[var(--violet-900)]">
                {p.nom}
              </h3>
              <p className="mt-3 flex-1 text-[15px] leading-relaxed text-[var(--ink-600)]">
                {p.selectorPitch}
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-ink)] transition-colors group-hover:text-[var(--accent)]">
                Découvrir
                <Arrow size={15} />
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
