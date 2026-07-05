// Section « Product Suite » à la Brevo : une plateforme, une flotte d'agents IA
// présentée comme des piliers/modules distincts (grille de cartes).

import Link from 'next/link';
import { Arrow } from '@/components/icons';
import { MODULE_LIST } from '@/lib/landing/modules';
import { Container, SectionHead } from './ui';

export function ProductSuite() {
  return (
    <section id="modules" className="border-b border-[var(--ink-100)] bg-[var(--ink-50)] py-20 sm:py-24">
      <Container>
        <SectionHead
          eyebrow="Une plateforme, une flotte d’agents IA"
          title={
            <>
              Tous vos outils de formalités,
              <br />
              propulsés par l’IA.
            </>
          }
          lead="Chaque étape d’une formalité a son agent. Ensemble, ils automatisent le parcours complet — de la lecture des pièces au dépôt officiel."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MODULE_LIST.map((m) => (
            <Link
              key={m.key}
              href={m.href}
              className="group flex flex-col rounded-2xl border border-[var(--ink-150)] bg-white p-7 no-underline transition-all duration-200 hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-[0_16px_40px_rgba(255,136,123,0.18)]"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-ink)]">
                <m.icon className="size-5" />
              </span>
              <h3 className="mt-5 font-[Sora] text-lg font-semibold text-[var(--violet-900)]">
                {m.title}
              </h3>
              <p className="mt-2 flex-1 text-[15px] leading-relaxed text-[var(--ink-600)]">
                {m.desc}
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-ink)] transition-colors group-hover:text-[var(--accent)]">
                En savoir plus
                <Arrow size={15} />
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
